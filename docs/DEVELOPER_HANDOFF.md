# Developer handoff — local review candidate, 2026-10-29

## Contract and version

This is source code for a demonstration website, not a production database backup.
Base commit: `bd33f903f9855eaf43621b6de8e3740e775cda62`, plus the uncommitted
changes listed in the delivery manifest. Do not identify this candidate as the
unchanged base commit. No infrastructure or database was changed to prepare it.

The receiving team selects its host. The supported architecture is a Node 24
application with PostgreSQL, plus a replaceable product-image storage adapter.
Cloudflare/OpenNext is optional. PostgreSQL compatibility is an architectural
contract; it is not evidence of a fresh authenticated deployment on your server.

## Deployment matrix

| Target                   | Database path                                      | Media                                    | Verification boundary                                                                                |
| ------------------------ | -------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Node / Docker            | `pg` pool for ordinary PostgreSQL URLs             | Production product-image adapter pending | Previous remote base passed packaging smoke without DB; current candidate full build blocked locally |
| Cloudflare               | Neon HTTP only; other drivers excluded from Worker | Private R2 binding `PRODUCT_IMAGES`      | Historical remote CI, not current candidate acceptance                                               |
| Local development        | PGlite, disposable/local only                      | `.data/product-images`                   | Focused local tests; not a production storage plan                                                   |
| MySQL / SQLite / MongoDB | Unsupported                                        | Independent of database choice           | Requires schema, migration, query, transaction and auth-adapter work                                 |

Do not replace the database URL with an arbitrary database engine. SQL uses
PostgreSQL enums/checks, arrays, JSONB, sequences, `RETURNING`, CTE writes and
conflict clauses. Better Auth uses the Drizzle `pg` adapter. The Node driver is
selected in `src/server/db/client.ts`; migrations in `drizzle/` are PostgreSQL SQL.
TLS, connection limits and proxy trust must match the receiving host; a successful
TCP connection alone does not prove authenticated application compatibility.

## Source layout and dependencies

`src/app`: routes; `src/components`: UI; `src/features`: scenario state/input;
`src/server`: authorization, queries and writes; `src/server/platform`: host/storage
adapters; `messages`: RU/EN; `public`/`assets`: media and manifest; `drizzle`: SQL
migrations; `tests`: unit/browser/visual fixtures; `scripts`: build/QA/operations.

Use Node 24.x, pnpm 12.11.2 and `pnpm install --frozen-lockfile`. Exact dependency
versions and transitive resolutions belong to package.json/pnpm-lock.yaml; do not
create an npm lockfile. Existing packages include Next 16.3.8, React 19.3.0,
Better Auth 1.7.7 and Drizzle ORM 0.45.3. This is not an assertion of current
security-advisory status. Cold installation requires registry access; next/font
requires a build-time font download. Chromium is a separate test prerequisite.

## Runtime configuration

Start with `.env.example`, supply values privately through the host. Runtime:
`APP_ENV=production`, `PLATFORM=node`, exact HTTPS `SITE_URL` and
`BETTER_AUTH_URL`, `DATABASE_URL`, and a unique random `BETTER_AUTH_SECRET`.
Do not copy fake seed credentials into a shared environment. `INDEXING` is a
build-time switch: keep off until launch approval. Examples contain names and
empty values only; no real credentials are part of the delivery.

Build from clean source without local .env files using `pnpm build:node`;
run the resulting standalone package as documented in `NODE_DEPLOYMENT.md`.
Docker is an alternative wrapper around the same Node runtime. Supply runtime
secrets outside images/build args. Use a trusted HTTPS reverse proxy that
normalizes forwarded client IPs. Multiple instances require consistent auth
secrets, a shared DB and shared persistent media, not per-container ephemeral disk.

## Database and migration procedure

1. Select PostgreSQL version/hosting, credentials and least-privilege runtime role.
   Keep preview and production data/secrets separate.
2. Back up the source database and test restoring to an isolated target. Preserve
   schema, data, sequences and migration journal together. Do not copy `.data`
   PGlite files into remote PostgreSQL and call that a migration.
3. Review SQL 0000–0007 and the migration journal against the destination. On an
   empty target apply repository migrations through a separately reviewed operator
   procedure. Never reset a populated target or replay all migrations blindly.
4. Run migration tooling from the source checkout, not an assumed standalone
   runtime that may omit development tools. Server startup does not migrate remote DB.
5. Do not run seed over customer data. The optional seed creates synthetic demo
   records; remote seeding requires an explicit flag and reviewed target.
6. Validate registration/sign-in/out, role changes, password changes, owner-only
   reads, atomic translations, stale edits and checkout idempotency against the
   selected PostgreSQL instance using fictional records. These journeys were not
   executed against a new ordinary PostgreSQL host during this handoff.

Backup/restore ownership, maintenance windows, retention and rollback RPO/RTO are
receiving-team decisions. No real backup/export was made by this task.

## Product-image storage: decision still required

Current production Node returns no product storage adapter. Consequently uploaded
product images cannot be served or created there, although bundled public assets
and request photos stored in PostgreSQL follow separate paths.

Minimum no-provider option: a configured absolute persistent directory outside
`public/` and application releases, preserving the existing UUID object keys and
authorization-serving routes. It needs volume permissions, atomic writes,
backup/restore and shared access for multiple replicas. A local container layer is
not persistent storage. Alternative: an S3-compatible adapter selected by the
receiving team; that needs endpoint/bucket/credentials and an SDK/API decision.
No provider was connected and neither production option is implemented here.

For a move, export/import both the `product_media` registry and corresponding
object bytes using the same object keys. Also transfer product image/gallery
references and request-photo DB data. Verify object counts, sizes and checksums,
publication/admin access and missing-object behavior before switching traffic.
Keep the source objects intact until the new target and rollback are verified.
Do not publish private buckets or expose original database backups in this bundle.

Uploads cancelled before product save can remain orphaned. Retention/GC requires
a grace period and concurrency-safe reference checks. Never delete an object on
Remove/Cancel immediately: another saved product/editor may reference it. This
candidate performs no object cleanup.

## Acceptance, checks and known gaps

Latest focused candidate run: 6 files, 88 tests passed (calculator, cart,
messages, route gate, Reviews), after formatting. Local full unit/type/build and
browser acceptance are not established. Native SWC/cache ownership errors and
native-memory problems affected the sandbox. Historical remote `9780b5d` had
three document-title e2e failures; `bd33f90` addresses motion implementation but
needs exact-candidate browser verification. Do not substitute historical green
results for a new candidate run.

Before release run lint, format:check, typecheck, test, build:node and test:e2e
with isolated fake data. Verify RU/EN at 1440/390, keyboard, reduced motion,
metadata during checkout and back/history, failed saves and restart persistence.
Request-scoped catalog cache needs a render/request regression proving a new
request sees an admin change. Reviews currently has an honest empty state and no
submission/moderation backend; Figma visual matching was not performed.

Real payment, email delivery, account recovery, production MFA/abuse controls,
privacy/retention policy, monitoring/restore drills and final asset/copy acceptance
remain separate work. No production-readiness claim is made.

## Asset and font rights

Figma exports and public images are delivered as project materials, not as a
new license grant. Obtain the owner's written rights/source records before
public release. Fonts are configured through next/font (Inter, Lusitana and PT
Serif); confirm and retain the actual font/distribution license notices in the
final runtime package. Do not assume a screenshot proves image ownership.

## Bundle exclusions

Deliver reviewed source, lockfile, examples, tests, migrations, documentation and
manifest. Exclude real .env/secrets, `.data`, `.git`, node_modules, caches,
test-results, generated builds, credentials, local operation reports and backups.
Build runtime artifacts on the chosen target/CI separately and record their
checksums. The accompanying source ZIP is a candidate for review, not a deployed
site or a customer database transfer.

## Official guidance reconciliation

The following guidance was researched by the parent task and applied to this
handoff. These are platform references, not evidence that this candidate passed
runtime acceptance on a newly provisioned host.

- [Next self-hosting](https://nextjs.org/docs/app/guides/self-hosting) and
  [standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output):
  standalone alone omits `public` and `.next/static`; this repository's build-node
  script copies both. `NEXT_PUBLIC_*` values are embedded during build, not runtime
  secrets. For multiple instances review consistent Server Actions encryption
  keys/build identity, cache coordination and reverse-proxy streaming/buffering.
- [Docker build secrets](https://docs.docker.com/build/building/secrets/): avoid
  secret build ARG/ENV. Use BuildKit secret mounts only if a build genuinely needs
  credentials; runtime credentials still belong to the runtime host mechanism.
- [Drizzle PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql) and
  [migrations](https://orm.drizzle.team/docs/migrations): ordinary TCP PostgreSQL
  and Neon HTTP are separate driver paths; review generated migrations before
  applying them. Do not upgrade dependencies merely to prepare a handoff.
- [pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html) and
  [pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html): choose
  ONE initialisation path. For an empty new deployment use repository migrations;
  for a full existing-database transfer restore its schema/data/journal together
  into a clean compatible target. Do not restore a schema dump over a schema
  already created by all migrations. Roles, ownership, privileges and extensions
  need their own review; pg_dump is not a complete backup strategy. Prove restore
  and subsequent incremental migrations on a disposable database first.
- [Exporting from Neon](https://neon.com/docs/import/migrate-from-neon): use the
  appropriate direct/unpooled endpoint for dump/transfer operations. No real
  connection string or export is included here.
- [R2 S3 API](https://developers.cloudflare.com/r2/api/s3/api/) and
  [SDK example](https://developers.cloudflare.com/r2/examples/aws/aws-sdk-js-v3/):
  R2 supports a subset of S3 APIs. A Worker binding is not automatically a Node
  adapter; choose and test the actual API operations before committing to a move.
- [Better Auth options](https://better-auth.com/docs/reference/options): configure
  the exact public base URL, trusted origins and cookie behavior for the new host;
  validate login/logout/password changes with the actual PostgreSQL path.
- [pnpm install](https://pnpm.io/cli/install): preserve frozen lockfile installs.
  [GitHub licensing](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository):
  the owner determines the license; no MIT or other grant has been assigned here.

Required target acceptance includes login/roles, order insertion/idempotency and
product-photo upload/read after restart, in addition to the no-database Node and
Docker packaging checks that already exist in the repository.
