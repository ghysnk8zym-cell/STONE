import { readFileSync } from "node:fs";
import { join } from "node:path";

/*
 * The fake test values the e2e server is seeded with (.env.test.example, committed on purpose). The
 * server script loads the same file with `node --env-file`, so the tests and the seeded users agree.
 */
function parse(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (match && !line.trimStart().startsWith("#"))
      values[match[1]!] = match[2]!;
  }
  return values;
}

const values = parse(
  readFileSync(join(process.cwd(), ".env.test.example"), "utf8"),
);

function need(name: string): string {
  const value = values[name];
  if (!value) throw new Error(`${name} is missing from .env.test.example`);
  return value;
}

/** The seeded users (both exist with these credentials in the e2e database). */
export const SEEDED = {
  client: {
    email: need("SEED_CLIENT_EMAIL"),
    password: need("SEED_CLIENT_PASSWORD"),
  },
  admin: {
    email: need("SEED_ADMIN_EMAIL"),
    password: need("SEED_ADMIN_PASSWORD"),
  },
} as const;

/** Password for accounts the tests create themselves (fake). */
export const NEW_PASSWORD = "e2e-new-account-password-1";

let counter = 0;
/** An address no other test (or earlier run) used. */
export function uniqueEmail(): string {
  counter += 1;
  return `e2e-${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 7)}@example.test`;
}
