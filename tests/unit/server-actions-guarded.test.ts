import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import {
  scanRouteHandlerSource,
  scanServerActionSource,
  type Finding,
} from "./guard-scan";

/*
 * Phase 4a Task 6, Review Focus 2: a Client (or a Guest) calling a server action or a route handler
 * directly, bypassing the UI, must be turned away. A server action is a public POST endpoint whatever the
 * page shows, so every exported action calls `requireUser` / `requireRole` (or a helper that does) as its
 * FIRST statement, before it reads or validates anything. The scan below reads the source (TypeScript AST),
 * so a new action that forgets the guard fails CI. The mutation check is in the Task 6 report.
 *
 * Allow-lists: an entry needs a reason and must still match something (a stale entry fails), so the list
 * cannot silently grow or rot.
 */

const root = process.cwd();
const SRC = join(root, "src");

/** Server action exports that are public by design: how a Guest becomes a user. */
const PUBLIC_ACTIONS: Record<string, string> = {
  "src/app/[locale]/(auth)/actions.ts#signUpAction":
    "Sign-up is how a Guest becomes a user; Better Auth applies the rate limit and the origin check, the role is always client.",
  "src/app/[locale]/(auth)/actions.ts#signInAction":
    "Sign-in is how a Guest becomes a user; Better Auth applies the rate limit and the origin check, errors are uniform.",
  "src/app/[locale]/(auth)/actions.ts#signOutAction":
    "Ends only the caller's own session (a Guest has none); it takes no id and touches no other user's data.",
};

/** Route handlers that are public by design (a guard would defeat their purpose). */
const PUBLIC_ROUTE_HANDLERS: Record<string, string> = {
  "src/app/api/me/route.ts#GET":
    "How a Guest finds out they are one: reads only the caller's own session, returns no id or email and only the caller's own favourites.",
  "src/app/api/health/db/route.ts#GET":
    "Deployment check that must work before anyone signs in; answers ok / not ok only, reveals nothing else.",
  "src/app/api/auth/[...all]/route.ts#GET":
    "The Better Auth endpoint itself (sign-in, sign-up, get-session ...): it authenticates, so it cannot require a session; rate limit and origin check apply.",
  "src/app/api/auth/[...all]/route.ts#POST":
    "The Better Auth endpoint itself (sign-in, sign-up, sign-out ...): it authenticates, so it cannot require a session; rate limit and origin check apply.",
};

function walk(dir: string, match: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path, match);
    return match(path) ? [path] : [];
  });
}

const posix = (file: string) => relative(root, file).split(sep).join("/");

function describeFindings(findings: Finding[]): string[] {
  return findings.map((f) => `${f.id}: ${f.problem}`);
}

describe("every exported server action is guarded", () => {
  const sources = walk(SRC, (file) => /\.(ts|tsx)$/.test(file)).map((file) => ({
    file: posix(file),
    text: readFileSync(file, "utf8"),
  }));
  const actionModules = sources.filter(({ text }) =>
    /^\s*(["'])use server\1;?/.test(text),
  );

  it("finds the server action modules", () => {
    expect(actionModules.map((m) => m.file).sort()).toEqual([
      "src/app/[locale]/(auth)/actions.ts",
      "src/server/account/actions.ts",
      "src/server/admin/actions.ts",
    ]);
  });

  it("has no inline `use server` function that the scan could not see", () => {
    const inline = sources
      .filter((m) => !actionModules.includes(m))
      .filter(({ text }) => /["']use server["']/.test(text))
      .map((m) => m.file);
    expect(inline).toEqual([]);
  });

  it("each exported action calls a guard first, or is allow-listed with a reason", () => {
    const findings: Finding[] = [];
    const seen = new Set<string>();
    for (const { file, text } of actionModules) {
      const result = scanServerActionSource(file, text);
      for (const name of result.exports) seen.add(`${file}#${name}`);
      findings.push(
        ...result.findings.filter((f) => !(f.id in PUBLIC_ACTIONS)),
      );
    }
    expect(describeFindings(findings)).toEqual([]);

    // Every allow-list entry is real, justified and still unguarded (a guarded one needs no entry).
    for (const [id, reason] of Object.entries(PUBLIC_ACTIONS)) {
      expect(reason.length, `${id} needs a reason`).toBeGreaterThan(20);
      expect(seen.has(id), `${id} is allow-listed but not exported`).toBe(true);
    }
  });

  it("allow-listed actions never call a guard-less helper that takes a user id", () => {
    // A public action must not take anything that names a user: only form data / state.
    const text = readFileSync(
      join(SRC, "app", "[locale]", "(auth)", "actions.ts"),
      "utf8",
    );
    expect(text).not.toMatch(/userId|user\.id/);
  });
});

describe("every route handler is guarded or public by design", () => {
  const routes = walk(SRC, (file) => /[\\/]route\.ts$/.test(file));

  it("finds the route handlers", () => {
    expect(routes.map(posix).sort()).toEqual([
      "src/app/api/auth/[...all]/route.ts",
      "src/app/api/health/db/route.ts",
      "src/app/api/me/route.ts",
    ]);
  });

  it("each exported handler calls a guard first, or is allow-listed with a reason", () => {
    const findings: Finding[] = [];
    const seen = new Set<string>();
    for (const file of routes) {
      const result = scanRouteHandlerSource(
        posix(file),
        readFileSync(file, "utf8"),
      );
      for (const name of result.exports) seen.add(`${posix(file)}#${name}`);
      findings.push(
        ...result.findings.filter((f) => !(f.id in PUBLIC_ROUTE_HANDLERS)),
      );
    }
    expect(describeFindings(findings)).toEqual([]);

    for (const [id, reason] of Object.entries(PUBLIC_ROUTE_HANDLERS)) {
      expect(reason.length, `${id} needs a reason`).toBeGreaterThan(20);
      expect(seen.has(id), `${id} is allow-listed but not exported`).toBe(true);
    }
  });
});

describe("the scan itself", () => {
  const guarded = `"use server";
import { requireRole } from "@/server/auth/guards";
export async function save(input: unknown) {
  await requireRole("admin", await requestLocale());
  return input;
}`;

  const ids = (findings: Finding[]) => findings.map((f) => f.id);

  it("accepts a guard as the first statement", () => {
    expect(scanServerActionSource("a.ts", guarded).findings).toEqual([]);
  });

  it("accepts `const user = await requireUser(...)` and a helper that calls the guard", () => {
    const source = `"use server";
async function currentUser() { return requireUser(await requestLocale()); }
export async function a() { const user = await currentUser(); return user; }
export async function b() { await currentUser(); }
export async function c() { const user = await requireUser("ru"); return user; }`;
    expect(scanServerActionSource("a.ts", source).findings).toEqual([]);
  });

  it("fails when the guard is removed", () => {
    const source = guarded.replace(/\s*await requireRole[^\n]*\n/, "\n");
    expect(ids(scanServerActionSource("a.ts", source).findings)).toEqual([
      "a.ts#save",
    ]);
  });

  it("fails when other work comes before the guard", () => {
    const source = `"use server";
export async function save(input: unknown) {
  const parsed = schema.safeParse(input);
  await requireUser("ru");
  return parsed;
}`;
    expect(ids(scanServerActionSource("a.ts", source).findings)).toEqual([
      "a.ts#save",
    ]);
  });

  it("fails when the guard is conditional or not awaited", () => {
    const conditional = `"use server";
export async function a(x: boolean) { if (x) { await requireUser("ru"); } }`;
    const notAwaited = `"use server";
export async function b() { requireUser("ru"); }`;
    expect(ids(scanServerActionSource("a.ts", conditional).findings)).toEqual([
      "a.ts#a",
    ]);
    expect(ids(scanServerActionSource("a.ts", notAwaited).findings)).toEqual([
      "a.ts#b",
    ]);
  });

  it("fails for a helper that does not call a guard", () => {
    const source = `"use server";
async function currentUser() { return { id: "x" }; }
export async function a() { await currentUser(); }`;
    expect(ids(scanServerActionSource("a.ts", source).findings)).toEqual([
      "a.ts#a",
    ]);
  });

  it("fails for exports it cannot verify (arrow functions are checked, re-exports and values are not)", () => {
    const arrow = `"use server";
export const ok = async () => { await requireUser("ru"); };
export const bad = async () => { return 1; };`;
    expect(ids(scanServerActionSource("a.ts", arrow).findings)).toEqual([
      "a.ts#bad",
    ]);
    const reexport = `"use server";
export { other } from "./other";`;
    expect(ids(scanServerActionSource("a.ts", reexport).findings)).toEqual([
      "a.ts#other",
    ]);
    const value = `"use server";
export const LIMIT = 5;`;
    expect(ids(scanServerActionSource("a.ts", value).findings)).toEqual([
      "a.ts#LIMIT",
    ]);
  });

  it("checks named and default exports of a route handler", () => {
    const route = `export async function GET() { return Response.json({}); }
export async function POST() { await requireUser("ru"); return Response.json({}); }
export const PUT = handler;`;
    expect(ids(scanRouteHandlerSource("r.ts", route).findings)).toEqual([
      "r.ts#GET",
      "r.ts#PUT",
    ]);
  });

  it("ignores exports that are not HTTP methods in a route file", () => {
    const route = `export const dynamic = "force-dynamic";
export async function GET() { await requireUser("ru"); }`;
    expect(scanRouteHandlerSource("r.ts", route).findings).toEqual([]);
  });
});
