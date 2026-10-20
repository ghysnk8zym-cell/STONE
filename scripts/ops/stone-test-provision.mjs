// One-time provisioning of the customer-review TEST shop database and Worker secrets.
//
//   node scripts/ops/stone-test-provision.mjs            (run by the OWNER in a local terminal)
//
// What it does, in order, stopping at the first problem:
//   1. asks (hidden input) for the `neondb_owner` connection string of the approved Neon branch
//      `stone-test` / database `neondb` (Neon console -> Connect -> branch stone-test, role
//      neondb_owner, database neondb, connection pooling OFF). The string is never printed,
//      written to disk or passed on a command line; child processes get it in their environment only.
//   2. checks the URL is exactly the approved endpoint/database/role, then a read-only preflight
//      (current database/user, schemas, existing public tables, migration journal) and asks for "yes";
//   3. records a recovery checkpoint (server time + WAL LSN) for Neon point-in-time restore;
//   4. `pnpm db:migrate` (additive repository migrations), then verifies the journal;
//   5. creates or rotates the least-privilege runtime role `stone_app` (data access on `public` only)
//      with a random password that only travels inside this process and into the Worker secret;
//   6. `pnpm db:seed` with synthetic accounts (random passwords, reserved example.com addresses);
//   7. stores DATABASE_URL (stone_app) and a random BETTER_AUTH_SECRET as secrets of the Worker
//      `stone-test` (`wrangler secret put --env test`, value on stdin);
//   8. writes the synthetic account list to a local file OUTSIDE the repository for the owner.
//
// Prints only names, counts and states. Never prints URLs, passwords or secrets.
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const APPROVED_TARGET = Object.freeze({
  host: "ep-delicate-silence-b5doyaix.c-7.us-east-2.aws.neon.tech",
  database: "neondb",
  ownerRole: "neondb_owner",
  runtimeRole: "stone_app",
});

const WORKER_ENV = "test";
const ACCOUNTS_FILE = join(
  homedir(),
  "Documents",
  "STONE-backups",
  "stone-test-accounts.local.txt",
);
const CHECKPOINT_FILE = join(
  homedir(),
  "Documents",
  "STONE-backups",
  "stone-test-checkpoints.log",
);

/** null when the URL is the approved owner connection; otherwise a reason that quotes no value. */
export function checkOwnerUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return "this is not a connection string";
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:")
    return "the connection string must start with postgresql://";
  if (url.hostname !== APPROVED_TARGET.host)
    return "the host is not the approved stone-test endpoint (direct, without -pooler)";
  if (url.pathname !== `/${APPROVED_TARGET.database}`)
    return "the database must be neondb";
  if (decodeURIComponent(url.username) !== APPROVED_TARGET.ownerRole)
    return "the role must be neondb_owner";
  if (url.searchParams.get("sslmode") !== "require")
    return "the connection string must contain sslmode=require";
  return null;
}

/** The runtime connection string for `stone_app` on the same endpoint/database. */
export function runtimeUrl(password) {
  const url = new URL(
    `postgresql://${APPROVED_TARGET.host}/${APPROVED_TARGET.database}`,
  );
  url.username = APPROVED_TARGET.runtimeRole;
  url.password = encodeURIComponent(password);
  url.searchParams.set("sslmode", "require");
  return url.toString();
}

/** Data access on `public` only: no DDL, no role management, nothing in neon_auth. */
export function grantStatements() {
  const role = APPROVED_TARGET.runtimeRole;
  const owner = APPROVED_TARGET.ownerRole;
  return [
    `GRANT CONNECT ON DATABASE ${APPROVED_TARGET.database} TO ${role}`,
    `GRANT USAGE ON SCHEMA public TO ${role}`,
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${role}`,
    `GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${role}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${owner} IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${role}`,
    `ALTER DEFAULT PRIVILEGES FOR ROLE ${owner} IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${role}`,
  ];
}

function secret(bytes) {
  return randomBytes(bytes).toString("base64url");
}

export function syntheticAccounts() {
  return {
    admin: { email: "stone-admin@example.com", password: secret(24) },
    client: { email: "stone-client@example.com", password: secret(24) },
  };
}

/* ------------------------------------------------------------------ */

function say(message) {
  console.log(`[stone-test] ${message}`);
}

function stop(message) {
  console.error(`[stone-test] STOPPED: ${message}`);
  process.exit(1);
}

/** Reads a line without echoing it (the terminal shows nothing while typing or pasting). */
function askHidden(question) {
  return new Promise((resolve) => {
    const { stdin, stdout } = process;
    stdout.write(question);
    let value = "";
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    const onData = (chunk) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off("data", onData);
          stdout.write("\n");
          resolve(value.trim());
          return;
        }
        if (char === "\u0003") stop("cancelled");
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.on("data", onData);
  });
}

function askVisible(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", (chunk) => {
      process.stdin.pause();
      resolve(String(chunk).trim());
    });
  });
}

function runChild(label, command, args, env, input) {
  say(`${label} ...`);
  const result = spawnSync(command, args, {
    env: { ...process.env, ...env },
    input,
    stdio: input === undefined ? "inherit" : ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  if (result.status !== 0) stop(`${label} failed (exit ${result.status})`);
  say(`${label}: done`);
}

async function main() {
  const { default: pg } = await import("pg");
  say(
    "Target: Neon project delicate-sound-31481072, branch stone-test, database neondb.",
  );
  say(
    "Paste the neondb_owner connection string (input is hidden), then press Enter.",
  );
  const ownerUrl = await askHidden("> ");
  const reason = checkOwnerUrl(ownerUrl);
  if (reason) stop(reason);

  const client = new pg.Client({ connectionString: ownerUrl });
  try {
    await client.connect();
  } catch (error) {
    stop(`cannot connect (${error.code ?? error.name})`);
  }

  const one = async (text) => (await client.query(text)).rows;
  const [who] = await one(
    "select current_database() as db, current_user as role, current_schema() as schema",
  );
  if (
    who.db !== APPROVED_TARGET.database ||
    who.role !== APPROVED_TARGET.ownerRole
  )
    stop("connected to an unexpected database or role");
  const schemas = (
    await one(
      "select schema_name from information_schema.schemata where schema_name not like 'pg_%' and schema_name <> 'information_schema' order by 1",
    )
  ).map((r) => r.schema_name);
  const publicTables = (
    await one(
      "select table_name from information_schema.tables where table_schema = 'public' order by 1",
    )
  ).map((r) => r.table_name);
  const [journal] = await one(
    "select to_regclass('drizzle.__drizzle_migrations') is not null as present",
  );
  const applied = journal.present
    ? Number(
        (
          await one(
            "select count(*)::int as n from drizzle.__drizzle_migrations",
          )
        )[0].n,
      )
    : 0;
  const [neonAuth] = await one(
    "select count(*)::int as n from information_schema.tables where table_schema = 'neon_auth'",
  );
  say(`Preflight: database=${who.db}, role=${who.role}, schema=${who.schema}`);
  say(`Schemas: ${schemas.join(", ") || "(none)"}`);
  say(
    `Public tables: ${publicTables.length} ${publicTables.length ? `(${publicTables.join(", ")})` : ""}`,
  );
  say(
    `Applied migrations: ${applied}; neon_auth tables (left untouched): ${neonAuth.n}`,
  );

  const answer = await askVisible(
    'Type "yes" to record a checkpoint, migrate, create the stone_app role, seed synthetic data and set the Worker secrets: ',
  );
  if (answer !== "yes") stop("not confirmed; nothing was changed");

  const [checkpoint] = await one(
    "select now() as at, pg_current_wal_lsn()::text as lsn",
  );
  mkdirSync(dirname(CHECKPOINT_FILE), { recursive: true });
  writeFileSync(
    CHECKPOINT_FILE,
    `${new Date().toISOString()} stone-test/neondb before provisioning: server time ${new Date(checkpoint.at).toISOString()}, WAL LSN ${checkpoint.lsn}, public tables ${publicTables.length}, applied migrations ${applied}\n`,
    { flag: "a" },
  );
  say(
    `Checkpoint recorded (server time ${new Date(checkpoint.at).toISOString()}, LSN ${checkpoint.lsn}).`,
  );
  say(
    "Restore if needed: Neon console -> branch stone-test -> Restore -> to this timestamp.",
  );

  runChild("Migrations (pnpm db:migrate)", "pnpm", ["db:migrate"], {
    DATABASE_URL: ownerUrl,
  });
  const [after] = await one(
    "select count(*)::int as n from drizzle.__drizzle_migrations",
  );
  say(`Applied migrations now: ${after.n}`);

  const runtimePassword = secret(32);
  const [exists] = await one(
    `select count(*)::int as n from pg_roles where rolname = '${APPROVED_TARGET.runtimeRole}'`,
  );
  const escaped = runtimePassword.replace(/'/g, "''");
  if (exists.n === 0) {
    await client.query(
      `CREATE ROLE ${APPROVED_TARGET.runtimeRole} LOGIN PASSWORD '${escaped}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
    );
    say("Runtime role stone_app created.");
  } else {
    await client.query(
      `ALTER ROLE ${APPROVED_TARGET.runtimeRole} LOGIN PASSWORD '${escaped}'`,
    );
    say("Runtime role stone_app existed: password rotated.");
  }
  for (const statement of grantStatements()) await client.query(statement);
  say("Grants applied (data access on public only).");
  await client.end();

  const accounts = syntheticAccounts();
  const authSecret = secret(48);
  runChild("Synthetic seed (pnpm db:seed)", "pnpm", ["db:seed"], {
    DATABASE_URL: ownerUrl,
    BETTER_AUTH_SECRET: secret(48),
    SEED_ALLOW_REMOTE: "1",
    SEED_ADMIN_EMAIL: accounts.admin.email,
    SEED_ADMIN_PASSWORD: accounts.admin.password,
    SEED_CLIENT_EMAIL: accounts.client.email,
    SEED_CLIENT_PASSWORD: accounts.client.password,
  });

  runChild(
    "Worker secret DATABASE_URL (stone-test)",
    "pnpm",
    ["exec", "wrangler", "secret", "put", "DATABASE_URL", "--env", WORKER_ENV],
    {},
    runtimeUrl(runtimePassword),
  );
  runChild(
    "Worker secret BETTER_AUTH_SECRET (stone-test)",
    "pnpm",
    [
      "exec",
      "wrangler",
      "secret",
      "put",
      "BETTER_AUTH_SECRET",
      "--env",
      WORKER_ENV,
    ],
    {},
    authSecret,
  );

  writeFileSync(
    ACCOUNTS_FILE,
    [
      "STONE test shop — synthetic accounts (TEST ONLY; do not reuse these passwords anywhere).",
      `Written ${new Date().toISOString()}. Site: https://stone-test.gb8cj746n2.workers.dev/ru`,
      "",
      `Admin:  ${accounts.admin.email}  /  ${accounts.admin.password}`,
      `Client: ${accounts.client.email}  /  ${accounts.client.password}`,
      "",
      "Running this script again rotates the database role password; existing accounts keep their passwords.",
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  say(
    `Synthetic account list written to ${ACCOUNTS_FILE} (outside the repository).`,
  );
  say("Done.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => stop(`unexpected ${error.code ?? error.name}`));
}
