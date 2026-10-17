// `pnpm db:seed`: fills the database behind DATABASE_URL with the catalog and demo data.
// Idempotent. Prints counts only: never emails, passwords, URLs or the secret.
// The type-stripping hooks (extensionless imports, server-only) live in ts-hooks.mjs.
import "./ts-hooks.mjs";

function fail(message) {
  console.error(`db:seed: ${message}`);
  process.exit(1);
}

const REQUIRED = [
  "DATABASE_URL",
  "SEED_ADMIN_EMAIL",
  "SEED_ADMIN_PASSWORD",
  "SEED_CLIENT_EMAIL",
  "SEED_CLIENT_PASSWORD",
];

try {
  // Loaded after the hook is registered. Values come from .env.local via `node --env-file`.
  const { getServerEnv } = await import("../src/server/env.ts");
  const env = getServerEnv();
  const missing = REQUIRED.filter((name) => !env[name]);
  if (missing.length > 0) fail(`set ${missing.join(", ")} (see .env.example)`);

  const { seed, formatSeedSummary, seedTargetRefusal } =
    await import("../src/server/db/seed.ts");
  const refusal = seedTargetRefusal(
    env.DATABASE_URL,
    process.env.SEED_ALLOW_REMOTE,
  );
  if (refusal) fail(refusal);

  const { getDb } = await import("../src/server/db/index.ts");
  const db = await getDb();
  if (!db) fail("set DATABASE_URL (see .env.example)");

  // Users get their passwords hashed by Better Auth; the seed makes the admin an admin afterwards.
  const { getAuth, createSeedUser, verifySeedUserPassword } =
    await import("../src/server/auth/auth.ts");
  const auth = await getAuth();
  if (!auth) fail("set DATABASE_URL (see .env.example)");

  const counts = await seed(db, {
    adminEmail: env.SEED_ADMIN_EMAIL,
    adminPassword: env.SEED_ADMIN_PASSWORD,
    clientEmail: env.SEED_CLIENT_EMAIL,
    clientPassword: env.SEED_CLIENT_PASSWORD,
    createUser: (user) => createSeedUser(auth, user),
    // An existing account becomes the admin only if it already holds SEED_ADMIN_PASSWORD.
    verifyPassword: (email, password) =>
      verifySeedUserPassword(auth, email, password),
  });
  console.log(`db:seed done. ${formatSeedSummary(counts)}`);
  // A pooled connection would keep the process alive.
  process.exit(0);
} catch (error) {
  // Query errors can quote parameters (emails): print only the kind and the Postgres code.
  // Refusals name variables only (see SeedRefusalError in src/server/db/seed.ts).
  if (
    error?.name === "SeedRefusalError" ||
    String(error?.message).startsWith("Invalid server environment")
  ) {
    fail(error.message); // names the variables, never their values
  }
  const code = error?.code ?? error?.cause?.code ?? "unknown";
  fail(`failed (${error?.name ?? "Error"}, code ${code})`);
}
