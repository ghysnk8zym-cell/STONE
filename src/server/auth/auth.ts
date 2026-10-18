import "server-only";

import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
// The minimal build leaves out the bundled Kysely adapter: we always pass the Drizzle adapter,
// and the Worker must stay under 3 MiB (ADR-001).
import { betterAuth } from "better-auth/minimal";
import { nextCookies } from "better-auth/next-js";

import { getDb, type Db } from "../db";
import { account, rateLimit, session, user, verification } from "../db/schema";
import type { SeedUser } from "../db/seed";
import { getServerEnv, type ServerEnv } from "../env";
import { AUTH_COOKIE_PREFIX, CLIENT_IP_HEADER } from "./constants";
import { userFieldsProblem } from "./user-input";

/*
 * Better Auth (ADR-002): email + password, database sessions, database rate limiting.
 * Authorization is ours: `user.role` is checked by src/server/auth/guards.ts on every protected
 * page, action and route. Sign-up can never set the role; an Admin exists only through the seed.
 */

export type AuthConfig = {
  secret: string;
  /** Public base URL; undefined lets Better Auth derive it from each request. */
  baseURL: string | undefined;
  trustedOrigins: string[];
  /** `Secure` cookies (and the `__Secure-` prefix). Off only for plain-http localhost. */
  secureCookies: boolean;
  /** Headers that carry the client IP on this host (rate-limit key), see src/server/platform. */
  ipAddressHeaders: readonly string[];
};

/**
 * Requests per IP and path per window (seconds). Counted on every attempt, stored in the
 * `rate_limit` table so the limit holds across Worker isolates and Node processes.
 */
export const RATE_LIMIT_RULES = {
  default: { window: 60, max: 100 },
  signIn: { window: 60, max: 10 },
  signUp: { window: 60, max: 5 },
  changePassword: { window: 60, max: 5 },
} as const;

const SEVEN_DAYS = 60 * 60 * 24 * 7;
const ONE_DAY = 60 * 60 * 24;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

function isPlainHttpLocalhost(url: string): boolean {
  const { protocol, hostname } = new URL(url);
  return protocol === "http:" && LOCAL_HOSTS.has(hostname);
}

export function authConfigFromEnv(
  env: ServerEnv,
  ipAddressHeaders: readonly string[],
): AuthConfig {
  if (!env.BETTER_AUTH_SECRET) {
    // Names only, never values.
    throw new Error("BETTER_AUTH_SECRET is required when DATABASE_URL is set");
  }
  const urls = [env.BETTER_AUTH_URL, env.SITE_URL].filter(
    (url): url is string => !!url,
  );
  const baseURL = urls[0];
  return {
    secret: env.BETTER_AUTH_SECRET,
    baseURL,
    trustedOrigins: [...new Set(urls.map((url) => new URL(url).origin))],
    secureCookies: baseURL
      ? !isPlainHttpLocalhost(baseURL)
      : env.APP_ENV !== "development",
    ipAddressHeaders,
  };
}

export function createAuth(db: Db, config: AuthConfig) {
  return betterAuth({
    appName: "STONE",
    secret: config.secret,
    baseURL: config.baseURL,
    basePath: "/api/auth",
    trustedOrigins: config.trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user, session, account, verification, rateLimit },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
      autoSignIn: true,
      // No email service on the test environment (docs/SECURITY.md).
      requireEmailVerification: false,
    },
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: false,
          defaultValue: "client",
          // Never accepted from sign-up or update-user input.
          input: false,
        },
      },
    },
    hooks: {
      // Plain-text names, no image, whoever calls (see user-input.ts).
      before: createAuthMiddleware(async (ctx) => {
        const problem = userFieldsProblem(ctx.path, ctx.body);
        if (problem) {
          throw new APIError("BAD_REQUEST", {
            message: problem,
            code: "INVALID_USER_FIELD",
          });
        }
      }),
    },
    session: {
      expiresIn: SEVEN_DAYS,
      updateAge: ONE_DAY,
      // Off: every session read goes to the database, so a revoked session or a changed role
      // applies on the next request. Authorization never trusts a cached cookie.
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      ...RATE_LIMIT_RULES.default,
      customRules: {
        "/sign-in/email": RATE_LIMIT_RULES.signIn,
        "/sign-up/email": RATE_LIMIT_RULES.signUp,
        "/change-password": RATE_LIMIT_RULES.changePassword,
      },
    },
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      useSecureCookies: config.secureCookies,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: "lax",
        secure: config.secureCookies,
      },
      // Explicit: Better Auth turns the origin check off under NODE_ENV=test otherwise, and the
      // tests must exercise the production behaviour.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      ipAddress: { ipAddressHeaders: [...config.ipAddressHeaders] },
    },
    // Lower levels log emails (e.g. a duplicate sign-up); errors only.
    logger: { level: "error" },
    telemetry: { enabled: false },
    // Must stay last: forwards Set-Cookie from auth.api calls in server actions to Next.
    plugins: [nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** True when this deployment has a database, so sign-in can work. */
export function authAvailable(): boolean {
  return !!getServerEnv().DATABASE_URL;
}

// One instance per process (and per dev-server reload), like the database itself.
const globalForAuth = globalThis as typeof globalThis & {
  __stoneAuth?: { db: Db; auth: Auth };
};

/** The Better Auth instance for this process, or null in no-database mode. */
export async function getAuth(): Promise<Auth | null> {
  const db = await getDb();
  if (!db) return null;
  const cached = globalForAuth.__stoneAuth;
  if (cached?.db === db) return cached.auth;
  const auth = createAuth(
    db,
    // callAuthEndpoint sets this header from the platform's client-IP rule.
    authConfigFromEnv(getServerEnv(), [CLIENT_IP_HEADER]),
  );
  globalForAuth.__stoneAuth = { db, auth };
  return auth;
}

/**
 * The seed's `createUser` hook: a user with a credential account whose password is hashed by
 * Better Auth, without opening a session. The role is not set here; the seed sets it afterwards.
 */
export async function createSeedUser(auth: Auth, seedUser: SeedUser) {
  const ctx = await auth.$context;
  const email = seedUser.email.toLowerCase();
  // The seed calls this only for a missing email. If the account appeared in the meantime (someone
  // signed up), stop: the seed must never promote an account it did not create.
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    const error = new Error(
      "a seed user was created by someone else during the seed; run the seed again",
    );
    error.name = "SeedRefusalError";
    throw error;
  }
  const hash = await ctx.password.hash(seedUser.password);
  const created = await ctx.internalAdapter.createUser(
    {
      email,
      name: seedUser.name,
      emailVerified: false,
    },
    { method: "seed" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: hash,
  });
}

/**
 * The seed's `verifyPassword` hook: whether the credential account of `email` holds `password`,
 * checked with Better Auth's own password verify. False when there is no credential account.
 */
export async function verifySeedUserPassword(
  auth: Auth,
  email: string,
  password: string,
): Promise<boolean> {
  const ctx = await auth.$context;
  const found = await ctx.internalAdapter.findUserByEmail(email.toLowerCase(), {
    includeAccounts: true,
  });
  const hash = found?.accounts.find(
    (a) => a.providerId === "credential" && a.accountId === found.user.id,
  )?.password;
  if (!hash) return false;
  return ctx.password.verify({ hash, password });
}
