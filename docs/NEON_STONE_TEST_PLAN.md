# stone-test migration and runtime validation plan

Prepared 2026-10-18. **Plan only: no credentials fetched, migration, seed, deployment,
branch creation/reset, authentication-provider change or persistent setting change.**
Read-only connector calls verified the branch, database, endpoint metadata and
table names. This does not establish login, schema correctness or application
runtime compatibility.

## Exact allowed target

| Field                        | Verified value                                                               |
| ---------------------------- | ---------------------------------------------------------------------------- |
| Project                      | `delicate-sound-31481072`                                                    |
| Branch                       | `stone-test`, `br-wandering-salad-b5wlyfp1`; ready, non-default, non-primary |
| Database                     | `neondb`; existing owner `neondb_owner`                                      |
| Read/write endpoint          | `ep-delicate-silence-b5doyaix`                                               |
| Direct host                  | `ep-delicate-silence-b5doyaix.c-7.us-east-2.aws.neon.tech`                   |
| Reported pooled host         | `ep-delicate-silence-b5doyaix-pooler.c-7.us-east-2.aws.neon.tech`            |
| Region                       | `aws-us-east-2`                                                              |
| Endpoint state at inspection | idle, enabled; metadata reports `pooler_enabled: false`                      |

Do not substitute the default/parent branch `br-still-dust-b5hzn5ux` or its endpoint.
The supplied branch was created from parent data; it is not assumed empty or safe
to reset. **Region differs from the original EU requirement.** On 2026-10-18 the
owner approved this existing US region for synthetic test data only, for customer
approval and subsequent source handover. This is not approval for real customer
data, new credentials, roles, persistent access or migration execution. Do not
create another project or move data automatically. Do not infer pooling readiness
from the presence of a pooled hostname or change pooler/security settings silently.

## Existing schema and proposed impact

`get_database_tables` for this exact branch/database returned nine tables, all in
`neon_auth`: account, invitation, jwks, member, organization, project_config,
session, user and verification. No public STONE tables or Drizzle journal were
listed. No row contents, passwords, tokens or personal data were read.

STONE uses its existing self-managed Better Auth configuration and Drizzle tables
in `public`; it does not use this managed Neon Auth schema. Leave `neon_auth` intact.
Do not import its users, switch providers, disable it, or add Neon Functions/Storage.

Apply the complete repository migration history, including the public request demo:

| Migration                           | Intended effect                                                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `0000_init.sql`                     | Create public Better Auth, catalog/translations, orders/items and favorites tables, constraints and indexes.                           |
| `0001_order-item-product-index.sql` | Add the order-item product foreign-key lookup index.                                                                                   |
| `0002_product-revision.sql`         | Add product revision default 0 and nonnegative constraint for atomic stale-write protection.                                           |
| `0003_site-content.sql`             | Create bounded RU/EN Home text override table.                                                                                         |
| `0004_stone-requests.sql`           | Create seeded custom-request table with customer FK/restrict, immutable specifications, quote/status/revision constraints and indexes. |
| `0005_public-stone-requests.sql`    | Add private photo/contact snapshots, owner-scoped submission keys, request-number sequence and atomic demo quota budget.               |

Exact local SQL fingerprints (SHA-256); compare again at action time:

| File                                | SHA-256                                                            |
| ----------------------------------- | ------------------------------------------------------------------ |
| `0000_init.sql`                     | `b3b73fa50b640a18d9c4182eddc44018ea139c33efcc27ebf5f1d5ef940a22cf` |
| `0001_order-item-product-index.sql` | `515dcacfcbba920baf9caa3cab71d2cb592cc5642acae34aed4bab8f5d704fa6` |
| `0002_product-revision.sql`         | `5ce4fc09da6d61eb74de42d741d322b955c2b223614d6034ce6fb52f7428a4a7` |
| `0003_site-content.sql`             | `5ccfdfefc6d2271816ba6764be7814ca88541257efc0f992792f55b358cc8236` |
| `0004_stone-requests.sql`           | `f0bc699233b364ddf01541efb882bd162263eb7b4193d3833f4cab77072573a4` |
| `0005_public-stone-requests.sql`    | `695251f18d809807227038cf45258c168bca6af1821ac75a695b00a0fb5d32e4` |

Migrations contain no table drops or record resets. That does not replace backup,
target checks or inspection for a partly migrated schema. Never edit an already
applied SQL file or fake its journal entry to force a migration to pass.

## Preflight and action-time approval

1. Identify the exact reviewed source revision/snapshot, migration SHA-256 values,
   intended Worker preview environment and current rollback artifact. Local HEAD
   `a94afcf` alone does not include the uncommitted takeover implementation.
2. Recheck target IDs/host/database and the synthetic-data-only restriction immediately before the run.
   Inventory schemas/tables and `to_regclass('drizzle.__drizzle_migrations')`.
   If present, inspect journal timestamps/hashes against `drizzle/meta/_journal.json`.
   Confirm `current_database()`, `current_user`, `current_schema()` and `SHOW search_path`.
   Public migrations must resolve to `public`, never `neon_auth`. Stop on any drift,
   partial migration, unexpected schema ownership or target ambiguity.
3. Confirm a recoverable pre-change backup/snapshot and its exact timestamp/ID,
   retention, restore method and any cost. Snapshot creation and restore are separate
   remote changes; none is authorized/executed by this document. A full-schema
   `pg_dump`/restore alternative needs installed tooling, secure storage and a tested
   restore plan. Do not assume a history window or free snapshot capability.
4. Obtain approval naming **stone-test/neondb**, all pending SQL files, synthetic seed
   scope, existing-schema preservation and rollback choice. Readiness of a branch or
   broad advance permission is not confirmation of those concrete release details.
5. Only after that, have the approved operator securely inject the exact branch's
   direct, TLS-enabled connection as process `DATABASE_URL` for migration. Do not print
   it, write it in Git, pass it as a command-line argument or reuse production secrets.
   Validate only parsed hostname/database locally; no credential values in logs.

## Planned execution after preflight

Run from the reviewed source checkout with its pinned installed dependencies:

```sh
pnpm db:migrate
```

This uses drizzle-kit and the direct Postgres connection, records applied migrations
and skips recorded entries. It is not `drizzle-kit push`, application startup or an
ad-hoc SQL paste. Capture exit code and redacted diagnostics. Stop on failure;
inspect actual state before any retry. Rerun the migration command only after the
state is known, then verify all six journal entries and public constraints/indexes.
Verify the `neon_auth` table inventory remains unchanged.

For synthetic seed, inject `BETTER_AUTH_SECRET` and all four `SEED_*` values only in
the seed process. Use distinct non-real addresses and unique strong credentials;
the remote admin minimum enforced by code is 16 characters. Do **not** use the
committed `.env.test.example` credentials on this internet-reachable preview.
Enable `SEED_ALLOW_REMOTE=1` for that one approved process only and run:

```sh
pnpm db:seed
```

Expected new-target counts: 12 products, 24 translations, two configured users,
two demo orders/items, three favorites and three custom requests. Existing records
are retained; counts need interpretation if the database is no longer fresh. The
seed hashes passwords through Better Auth and refuses promoting an existing account
unless its password is verified. It does not seed Home overrides. No real customer
orders/data, bulk user migration or managed-Neon-Auth users are part of this action.

## Runtime validation on the approved preview

Configure the exact Worker preview with `APP_ENV=preview`, `PLATFORM=cloudflare`,
`INDEXING=off` at build time, and runtime secret names `DATABASE_URL` and
`BETTER_AUTH_SECRET`. Set the exact approved `BETTER_AUTH_URL` or `SITE_URL` for
public request submission. Final preview URL, secret entry, origin configuration and
deployment revision must be recorded before requesting release approval. The
existing app selects Neon HTTP for the verified `*.neon.tech` host. Keep its driver
and Better Auth; no migration to managed Neon Auth or Hyperdrive is proposed.

Scope secrets to the **individual approved Preview**, never both Production and
Preview by default. Preview Base secrets apply to future previews and are broader
than this isolated test target. Inspect the actual Worker preview mode first;
changing preview systems or persistent settings is a separate decision. Follow
[`DEPLOYMENT.md`](DEPLOYMENT.md#33-scope-values-to-the-approved-preview).

Keep migration DDL credentials separate from persistent runtime credentials.
The existing `neondb_owner` is a broad owner role, not evidence of least privilege.
An application role should have only required `public` schema usage, table DML
and any required sequence access, with no DDL, role administration or `neon_auth`
access. The exact role/grants and credential entry remain pending approval; this
plan creates none. `SEED_*` and `SEED_ALLOW_REMOTE` belong only to the approved seed
process, never the Worker or its build environment.

Migration 0005 adds a sequence requiring runtime USAGE, and a demo budget table
requiring SELECT/UPDATE. Keep DDL permission out of the runtime role. Backups now
contain private contact snapshots and images; they must not enter source archives.

Run and record, in RU and EN:

- Health, database health and actual public assets/catalog/Home with runtime data.
- Guest redirects; Client account access and admin denial; Admin pages and direct
  action guards. Signup creates Client only; new sessions see authorized role changes.
- Correct/wrong-password login, signout with server session revocation, password
  change and previous-password rejection. Capture sanitized server errors, CPU usage
  and latency including a cold endpoint. Never weaken password hashing to pass.
- Products/translations atomic update, publish/unpublish and stale editor refusal
  across Products/Promotions; Customers role changes/self-demotion rejection; Home
  override/save/restore visible on the next request; custom quote/status constraints,
  stale versions and retained drafts. Read back after reload to confirm persistence.
- Orders fulfillment update and Client visibility, keyboard focus/feedback, expected
  unavailable controls, narrow admin notice, reduced-motion and noindex behavior.
- Public parameters/photo submission, owner/Admin image access, cross-user/Guest
  refusal, retry/recovery without duplication, concurrent quota boundaries, and
  persistence after runtime restart. Use synthetic contacts and images only.

Local PGlite is not Neon HTTP. Linux OpenNext/Worker smoke, compressed size <=3 MiB,
auth deduplication and the above authenticated Worker CPU measurements remain
required. A running Node server cannot substitute for them.

## Failure and rollback

Before any write, record the old app artifact and protected database recovery point.
Stop on a migration/seed error; preserve redacted evidence and determine whether any
step committed. Do not rerun destructive steps, reset the branch, drop new tables,
delete users or restore parent data automatically. Prefer a reviewed forward fix
when safe; restoring a snapshot/backup requires an explicit target/data-loss decision.
Do not assume an older app is compatible with a partly changed database. Existing
Neon Auth data must remain recoverable. The default/production branch is never the
fallback test destination.

Sources: current repository schema, migrations, seed and auth implementation;
[Neon connection pooling](https://neon.com/docs/connect/connection-pooling) and
[Neon instant restore](https://neon.com/docs/postgres/backup-restore/branch-restore),
checked 2026-10-18. Live plan/retention/pooler facts still require target-specific checks.
