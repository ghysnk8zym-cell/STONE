import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import {
  isNotFound,
  nextTestIp,
  redirectTarget,
  sessionCookieFrom,
  signIn,
  signUp,
  TEST_BASE_URL,
  TEST_PASSWORD,
  TEST_SECRET,
  thrown,
} from "./auth-helpers";

vi.mock("server-only", () => ({}));
const request = vi.hoisted(() => ({
  headers: new Headers(),
  paths: [] as string[],
}));
vi.mock("next/headers", () => ({
  headers: async () => request.headers,
  cookies: async () => ({ getAll: () => [], set: () => {} }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => request.paths.push(path),
}));
function reset() {
  vi.resetModules();
  const g = globalThis as { __stoneDb?: unknown; __stoneAuth?: unknown };
  delete g.__stoneDb;
  delete g.__stoneAuth;
}
function asBrowser(cookie?: string) {
  request.headers = new Headers({
    origin: TEST_BASE_URL,
    host: new URL(TEST_BASE_URL).host,
    "x-forwarded-for": nextTestIp(),
    "x-stone-path": "/en/admin/site-content",
  });
  if (cookie) request.headers.set("cookie", cookie);
  request.paths = [];
}

describe("home text content (real PGlite and Better Auth)", () => {
  let actions: typeof import("@/server/admin/content-actions");
  let content: typeof import("@/server/content/home");
  let query: typeof import("@/server/admin/content-queries");
  let db: NonNullable<Awaited<ReturnType<typeof import("@/server/db").getDb>>>;
  let schema: typeof import("@/server/db/schema");
  let admin: string;
  let client: string;
  beforeAll(async () => {
    reset();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    vi.stubEnv("BETTER_AUTH_SECRET", TEST_SECRET);
    vi.stubEnv("BETTER_AUTH_URL", TEST_BASE_URL);
    actions = await import("@/server/admin/content-actions");
    content = await import("@/server/content/home");
    query = await import("@/server/admin/content-queries");
    schema = await import("@/server/db/schema");
    db = (await (await import("@/server/db")).getDb())!;
    const auth = (await (await import("@/server/auth/auth")).getAuth())!;
    for (const email of ["admin@example.test", "client@example.test"])
      expect((await signUp(auth, email)).status).toBe(200);
    await db
      .update(schema.user)
      .set({ role: "admin" })
      .where(eq(schema.user.email, "admin@example.test"));
    admin = sessionCookieFrom(
      await signIn(auth, "admin@example.test", TEST_PASSWORD),
    )!;
    client = sessionCookieFrom(
      await signIn(auth, "client@example.test", TEST_PASSWORD),
    )!;
  }, 60000);
  afterAll(() => {
    vi.unstubAllEnvs();
    reset();
  });

  for (const role of ["Guest", "Client"])
    it(`${role} cannot edit or read admin content even with malformed arguments`, async () => {
      asBrowser(role === "Guest" ? undefined : client);
      for (const call of [
        () => actions.saveHomeText(null, null, null, null),
        () => query.getHomeTextEditor("en"),
      ]) {
        const error = await thrown(call);
        if (role === "Guest")
          expect(redirectTarget(error)).toBe(
            "/en/sign-in?next=%2Fen%2Fadmin%2Fsite-content",
          );
        else expect(isNotFound(error)).toBe(true);
      }
      expect(await db.select().from(schema.siteContent)).toEqual([]);
    });
  it("uses each locale's messages when records are absent or no database is configured", async () => {
    expect((await content.getHomeText("en")).values["hero.line1"]).toBe(
      en.pages.home.hero.line1,
    );
    expect((await content.getHomeText("ru")).values["hero.line1"]).toBe(
      ru.pages.home.hero.line1,
    );
    vi.stubEnv("DATABASE_URL", "");
    try {
      expect((await content.getHomeText("en")).values["sections.catalog"]).toBe(
        en.pages.home.sections.catalog,
      );
    } finally {
      vi.stubEnv("DATABASE_URL", "pglite://memory");
    }
  });
  it.each([
    ["xx", "hero.line1", "Hello", null],
    ["en", "__proto__", "Hello", null],
    ["en", "meta.home.title", "Hello", null],
    ["en", "hero.line1", "", null],
    ["en", "hero.line1", "  ", null],
    ["en", "hero.line1", "x".repeat(1000), null],
    ["en", "hero.line1", "bad\u202e", null],
    ["en", "hero.line1", "bad\nline", null],
    ["en", "hero.line1", {}, null],
    ["en", "hero.line1", "Hello", {}],
  ])(
    "rejects invalid or out-of-scope input %j",
    async (locale, key, text, expected) => {
      asBrowser(admin);
      expect(
        await actions.saveHomeText(locale, key, text, expected),
      ).toMatchObject({ ok: false, code: "invalid" });
      expect(await db.select().from(schema.siteContent)).toEqual([]);
      expect(request.paths).toEqual([]);
    },
  );
  it("edits one locale/key, treats markup and ICU syntax as literal text, and resets to fallback", async () => {
    asBrowser(admin);
    const literal = "<b>{name}</b>";
    expect(
      await actions.saveHomeText("en", "hero.line1", literal, null),
    ).toEqual({ ok: true, text: literal });
    expect((await content.getHomeText("en")).values["hero.line1"]).toBe(
      literal,
    );
    expect((await content.getHomeText("ru")).values["hero.line1"]).toBe(
      ru.pages.home.hero.line1,
    );
    expect((await content.getHomeText("en")).values["hero.line2"]).toBe(
      en.pages.home.hero.line2,
    );
    expect(request.paths).toContain("/en");
    expect(
      await actions.saveHomeText("en", "hero.line1", null, literal),
    ).toEqual({ ok: true, text: null });
    expect((await content.getHomeText("en")).values["hero.line1"]).toBe(
      en.pages.home.hero.line1,
    );
    expect(await db.select().from(schema.siteContent)).toEqual([]);
  });
  it("rejects stale inserts, edits and resets; different fields can be edited independently", async () => {
    asBrowser(admin);
    const results = await Promise.all([
      actions.saveHomeText("en", "hero.line1", "First", null),
      actions.saveHomeText("en", "hero.line1", "Second", null),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.code === "conflict")).toHaveLength(
      1,
    );
    const current = (await content.getHomeText("en")).stored["hero.line1"]!;
    expect(
      await actions.saveHomeText("en", "hero.line1", "New", current),
    ).toMatchObject({ ok: true });
    expect(
      await actions.saveHomeText("en", "hero.line1", "Stale", current),
    ).toMatchObject({ ok: false, code: "conflict" });
    expect(
      await actions.saveHomeText("en", "hero.line1", null, current),
    ).toMatchObject({ ok: false, code: "conflict" });
    expect(
      await actions.saveHomeText("en", "sections.catalog", "Materials", null),
    ).toMatchObject({ ok: true });
    expect((await query.getHomeTextEditor("en")).values).toMatchObject({
      "hero.line1": "New",
      "sections.catalog": "Materials",
    });
  });
});
