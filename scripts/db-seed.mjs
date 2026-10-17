// `pnpm db:seed`: fills the database behind DATABASE_URL with the catalog and demo data.
// Idempotent. Prints counts only: never emails, passwords, URLs or the secret.
//
// The app code is TypeScript with extensionless imports and `server-only` markers, which Node
// cannot load as is. The resolve hook below teaches Node's built-in type stripping those two
// things, so the seed runs the same modules as the app without a compile step or a new dependency.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      // Marks a module as server-only for bundlers; there is nothing to enforce in a script.
      return { url: "data:text/javascript,", shortCircuit: true };
    }
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (!specifier.startsWith(".")) throw error;
      for (const candidate of [`${specifier}.ts`, `${specifier}/index.ts`]) {
        try {
          return nextResolve(candidate, context);
        } catch {
          // try the next candidate
        }
      }
      throw error;
    }
  },
});

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

  const { getDb } = await import("../src/server/db/index.ts");
  const { seed, formatSeedSummary } = await import("../src/server/db/seed.ts");
  const db = await getDb();
  if (!db) fail("set DATABASE_URL (see .env.example)");

  const counts = await seed(db, {
    adminEmail: env.SEED_ADMIN_EMAIL,
    adminPassword: env.SEED_ADMIN_PASSWORD,
    clientEmail: env.SEED_CLIENT_EMAIL,
    clientPassword: env.SEED_CLIENT_PASSWORD,
  });
  console.log(`db:seed done. ${formatSeedSummary(counts)}`);
  // A pooled connection would keep the process alive.
  process.exit(0);
} catch (error) {
  // Query errors can quote parameters (emails): print only the kind and the Postgres code.
  if (String(error?.message).startsWith("Invalid server environment")) {
    fail(error.message); // names the variables, never their values
  }
  const code = error?.code ?? error?.cause?.code ?? "unknown";
  fail(`failed (${error?.name ?? "Error"}, code ${code})`);
}
