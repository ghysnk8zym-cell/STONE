# Deployment

The current deployment is a **test environment** on Cloudflare Workers (ADR-001). It is always `noindex`. Dashboard labels change over time: where a step says _verify in the current dashboard_, look for the closest equivalent.

The owner confirmed the objective on 2026-10-18: customer approval of a test version,
then source-file handover for another team's development and server migration.
This guide describes possible operator actions, not permission to execute them.
Use the exact target and preflight in [`NEON_STONE_TEST_PLAN.md`](NEON_STONE_TEST_PLAN.md).
Real payments/email and production operations are not required for this demo.

## 0. Test shop (`stone-test`) — the customer-review deployment

The hosted test shop is a **separate Worker, `stone-test`** (`https://stone-test.gb8cj746n2.workers.dev`), defined by `env.test` in `wrangler.jsonc`. It does not use Workers Builds and never touches the Git-connected `stone` Worker of section 1. Data: Neon project `delicate-sound-31481072`, branch `stone-test` (`br-wandering-salad-b5wlyfp1`), database `neondb`, synthetic data only.

1. **Build on Linux (GitHub Actions).** Push the branch; the CI `cloudflare` job runs `pnpm cf:build` + `pnpm cf:size` (3 MiB gate) and uploads the OpenNext output as the artifact `open-next-build`. Nothing is installed locally (no WSL/Docker); Windows cannot run the OpenNext build (symlink EPERM).
2. **Deploy only a green run.** All CI jobs of the exact commit must pass. Then, from the repository root:
   ```sh
   gh run download <run-id> -n open-next-build -D .open-next
   pnpm exec wrangler deploy --env test
   ```
   `wrangler.jsonc`'s build command skips the build because `.open-next/worker.js` exists. Rollback: redeploy the artifact of the previous green run the same way.
3. **Database and secrets, once, by the owner:** `node scripts/ops/stone-test-provision.mjs` in a local terminal. It asks (hidden input) for the `neondb_owner` connection string of branch `stone-test` (Neon console → Connect → branch `stone-test`, database `neondb`, role `neondb_owner`, pooling off), checks it is exactly that target, shows a read-only preflight and waits for `yes`, records a point-in-time checkpoint in `~/Documents/STONE-backups/stone-test-checkpoints.log`, runs `pnpm db:migrate`, creates the least-privilege runtime role `stone_app` (SELECT/INSERT/UPDATE/DELETE on `public` tables, USAGE/SELECT/UPDATE on `public` sequences; nothing in `neon_auth`), seeds synthetic data and two synthetic accounts (`stone-admin@example.com`, `stone-client@example.com`, random passwords), and stores `DATABASE_URL` (as `stone_app`) and a random `BETTER_AUTH_SECRET` as Worker secrets (`wrangler secret put --env test`, value on stdin). The account list is written to `~/Documents/STONE-backups/stone-test-accounts.local.txt` — outside the repository; never paste it into chat or git. Non-secret settings (`APP_ENV=preview`, `INDEXING=off`, `BETTER_AUTH_URL`, `SITE_URL`) live in `env.test.vars`.
4. **Recovery.** The checkpoint log has the server time and WAL LSN taken before migrating: restore with Neon console → branch `stone-test` → Restore to that time (within the plan's history window). Migrations are additive; nothing drops data.

## 1. Cloudflare Workers Builds (owner, one time)

Prerequisite: a Cloudflare account with a `workers.dev` subdomain (Workers & Pages → overview shows it). No paid plan is needed (Workers Free).

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Import a repository** (_verify in the current dashboard_).
2. **Connect GitHub** → authorise the Cloudflare app for the repository `ghysnk8zym-cell/STONE` only.
3. Configure the project:

   | Field                 | Value                                                                      |
   | --------------------- | -------------------------------------------------------------------------- |
   | Project / Worker name | `stone` (must equal `name` in `wrangler.jsonc`, otherwise the build fails) |
   | Production branch     | `main`                                                                     |
   | Build command         | `pnpm run cf:build` — **required**; if empty, nothing is built             |
   | Deploy command        | `pnpm run cf:deploy` (replace the default `npx wrangler deploy`)           |
   | Root directory        | `/`                                                                        |

   When Preview Builds are enabled, Workers Builds runs the **build command followed
   by the Preview command** on enabled non-production branches. The current default
   is `npx wrangler preview`; inspect the actual Worker configuration before changing
   it. Wrangler's `build.command` (`scripts/ensure-opennext-build.mjs`) builds only
   when `.open-next/worker.js` is missing. A branch push can deploy a preview even
   for a draft PR. An older Worker may use a different preview system; do not switch
   systems or infer isolation from a dashboard label alone.

   Existing project (as of 2026-10): **Workers & Pages → stone → Settings → Builds → Build configuration**: click a field to edit, then save; afterwards **Deployments → Retry build** on the PR branch (_verify in the current dashboard_).

4. **Build variables** (Settings → Build → Variables): `NODE_VERSION` = `24`.
   `INDEXING` is inlined at build time (`next.config.ts` → `env`), so the header and `robots.txt` always agree; leave it **unset** (= noindex). For a real launch: set `INDEXING=on` as a build variable **and** remove the `/*` noindex rule from `public/_headers` (static files bypass Next.js).
5. **Runtime variables**: none needed in Phase 1 (`PLATFORM`, `APP_ENV` defaults live in `wrangler.jsonc` `vars`). Secrets added in later phases go to Settings → **Variables and Secrets** as type _Secret_, never into the repository.
6. Settings → **Domains & Routes**: make sure **Preview URLs** are enabled (_verify in the current dashboard_).
7. Save and deploy. The first build runs on `main` after PR merge; each PR branch gets a Preview URL, also posted as a PR comment by the Cloudflare GitHub app.

### Verifying a preview

- Open `<preview-url>/ru` and `<preview-url>/en`: both must load; response header `x-robots-tag: noindex, nofollow`.
- GitHub → **Actions** → **Preview smoke** → **Run workflow** → paste the preview URL. The Playwright `@smoke` suite runs against it.

`workflow_dispatch` requires the workflow file on the default branch. At the last
read-only inspection, `main` was still the initial commit without workflows; this
manual button is not assumed available. Run only after the reviewed file is
published through the approved PR sequence. A historical CI rerun does not test
uncommitted files. Record source head, base and tested merge SHA for PR checks.

## 2. GitHub branch protection (owner, one time)

1. GitHub → repository → **Settings** → **Rules** → **Rulesets** → **New branch ruleset**.
2. Name `main`, enforcement **Active**, target branch `main` (Include default branch).
3. Enable **Require a pull request before merging** and **Block force pushes**. After
   the reviewed workflow is published and the exact checks have run, configure
   required checks `quality`, `build`, `cloudflare`, `e2e`, `node-standalone`, `docker`.
   This document does not change branch protection or claim these settings exist.
4. Save.

## 3. Database and sign-in: Neon + Cloudflare (owner, one time)

Until you do this the preview still works: the catalog comes from the built-in seed and the sign-in and sign-up pages say "Sign-in is unavailable on this environment". Adding the database turns on sign-in, the account area, favourites and the admin panel.

**Rules for this section.** Connection strings, passwords and the auth secret are secrets. Paste them only into the Cloudflare _Secret_ field, a password manager and your own terminal. **Never** paste them into a chat (including with Claude), an issue, a pull request, a commit or a screenshot. Nobody else (no agent) runs the commands below with real values; if something fails, send the _error text_, not the values.

### 3.1 Confirm the existing isolated Neon target

Use `stone-test/neondb` and the exact project/branch/endpoint IDs in the linked plan,
never the default parent branch. The original ADR selected EU. The owner approved
the existing `aws-us-east-2` region on 2026-10-18 **only for synthetic test data**.
Do not create another account/project, move data or infer permission for credentials,
roles or persistent access from that region approval.

Use an approved direct TLS connection for migrations. Pooling is not established:
metadata reported `pooler_enabled: false` despite a pooled hostname. Verify the
actual supported runtime connection before use; do not change pooling or remove
connection security parameters to suppress an error. Keep credentials in a secure
secret store and check the actual plan limits before any cost decision. Public
database requests can wake an idle endpoint; no uptime polling is required here.

### 3.2 Generate the auth secret locally

`BETTER_AUTH_SECRET` signs and encrypts the session data. It must be random and at least 32 characters. Generate it on your own computer, copy it straight into the password manager, and do not show it to anybody:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

(or `openssl rand -base64 32`). Changing it later signs everybody out.

### 3.3 Scope values to the approved Preview

First identify the exact Worker, individual Preview name/URL, source revision and
database role. Inspect current preview mode and scoping without changing settings.
For the current Worker Previews system, **individual Preview secrets** are distinct
from **Preview Base** secrets (copied to new previews; later base edits do not update
existing ones) and Production secrets. Do not fill both environments or use Preview
Base for a single isolated test. If isolation cannot be established, stop that change.

Only after specific approval, the operator can enter values at the private prompts
for the exact individual Preview (names below are placeholders, not commands run):

**Each `wrangler preview secret put` immediately creates a new deployment for that
Preview.** Treat each invocation as a deployment change with its own result and
rollback version, not merely a saved configuration value. Verify the final Preview
after both approved secrets are set; an intermediate deployment may lack one value.

```sh
pnpm exec wrangler preview secret put DATABASE_URL --name <approved-preview-name>
pnpm exec wrangler preview secret put BETTER_AUTH_SECRET --name <approved-preview-name>
```

- `DATABASE_URL`: the verified `stone-test` runtime connection. Cloudflare requires
  the existing Neon HTTP driver and a `*.neon.tech` host; PGlite is local-only.
- `BETTER_AUTH_SECRET`: a unique secret for this isolated test environment. No
  values go in Wrangler config, build variables, Git, screenshots or command args.
- `BETTER_AUTH_URL` or `SITE_URL`: set the exact approved Preview origin for the
  public request/photo demo. If both exist, the request action uses `BETTER_AUTH_URL`.
  Unset dynamic origins may still support earlier auth behavior, but request submission
  stays unavailable. Verify secure cookies and trusted origins on the selected URL.
  Set `APP_ENV=preview`, `PLATFORM=cloudflare`; build with `INDEXING=off`.
- `SEED_*` and `SEED_ALLOW_REMOTE`: process-only input to the approved seed command,
  never persistent Worker secrets. Use synthetic addresses and unique passwords.

Separate migration DDL credentials from persistent application credentials. The
existing `neondb_owner` role is broad, not a least-privilege runtime role. Review
only the necessary `public` schema usage, table SELECT/INSERT/UPDATE/DELETE and
required sequence permissions. Runtime needs no role administration, DDL or access
to `neon_auth`. The exact role/grants and credential creation remain pending;
none is performed by this guide or the local CI jobs.

Verify the approved Preview/version after the approved secret/deployment change.
Do not use a push or retry on an unspecified branch as a configuration shortcut.

### 3.4 Create the tables and the test users (from your own computer)

Run these in a terminal in the repository folder, with Node 24 and `pnpm install` done (`docs/DEVELOPMENT.md`). The values exist only in this terminal session.

PowerShell:

```powershell
$env:DATABASE_URL = "<the Neon connection string>"
$env:BETTER_AUTH_SECRET = "<the secret from 3.2>"
$env:SEED_ADMIN_EMAIL = "<admin email>"
$env:SEED_ADMIN_PASSWORD = "<admin password, at least 16 characters, strong and unique>"
$env:SEED_CLIENT_EMAIL = "<client email>"
$env:SEED_CLIENT_PASSWORD = "<client password, at least 8 characters, strong and unique>"
$env:SEED_ALLOW_REMOTE = "1"   # the seed refuses a remote database without this
pnpm db:migrate
pnpm db:seed
Remove-Item Env:DATABASE_URL, Env:BETTER_AUTH_SECRET, Env:SEED_ADMIN_EMAIL, Env:SEED_ADMIN_PASSWORD, Env:SEED_CLIENT_EMAIL, Env:SEED_CLIENT_PASSWORD, Env:SEED_ALLOW_REMOTE
```

bash:

```bash
export DATABASE_URL='<the Neon connection string>'
export BETTER_AUTH_SECRET='<the secret from 3.2>'
export SEED_ADMIN_EMAIL='...' SEED_ADMIN_PASSWORD='...' SEED_CLIENT_EMAIL='...' SEED_CLIENT_PASSWORD='...'
export SEED_ALLOW_REMOTE=1
pnpm db:migrate
pnpm db:seed
unset DATABASE_URL BETTER_AUTH_SECRET SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD SEED_CLIENT_EMAIL SEED_CLIENT_PASSWORD SEED_ALLOW_REMOTE
```

- Variables set in the terminal win over `.env.local`, so a local database URL in that file cannot be hit by mistake. Without `SEED_ALLOW_REMOTE=1` the seed stops with a message instead of writing to Neon (a safety net), and on a remote database it also refuses an admin password shorter than **16 characters** (the message names `SEED_ADMIN_PASSWORD`, never the value).
- `pnpm db:migrate` creates the tables; it should end with a "migrations applied" message. `pnpm db:seed` ends with `db:seed done.` and counts such as `products: 12, translations: 24, users: 2, orders: 2 ...`. It prints no emails or passwords.
- On any failure, inspect migration/seed state before retrying. Seed retains existing
  records and refuses to promote an account whose password is not verified. For an
  address collision, select a fresh synthetic address under the approved seed scope;
  do not delete an existing user to make the command pass.
- Clear your terminal history afterwards if it recorded the values (PowerShell: `Clear-History`, and delete `%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt` lines that contain them).

### 3.5 Check the preview

Open the exact approved individual Preview URL and verify its deployed source
revision first. Do not substitute the main/Production Worker address. Replace
`<url>` below.

1. `<url>/api/health/db` shows `{"ok":true}`.
   - `{"ok":false,"reason":"database-not-configured"}` (503): this deployment does not see `DATABASE_URL`. Check the name and that it is a Secret on the right scope (3.3), then redeploy.
   - `{"ok":false,"reason":"database-unavailable"}` (503): the value is wrong, the Neon project is suspended or deleted, or the string was cut when pasted. Retry once (a suspended database wakes up), then re-copy the string. The Worker log line is `[health/db] check failed: <error name> <code>`: Cloudflare → stone → **Observability** → **Logs**.
2. `<url>/ru/catalog` and `<url>/en` still load, and the products are there.
3. **Sign in as the Client**: `<url>/ru/sign-in` with the Client email and password → you land on `/ru/account` (Orders shows two demo orders, Favorites three products). Use **Sign out** in the account sidebar and confirm. Then `<url>/ru/admin` as the Client must show a **404**.
4. **Sign in as the Admin**: `<url>/ru/admin` shows the Overview; Products and Orders open. Then **create and edit a product**: Products → Add product, fill the form (name in both languages, a price, a picture), **Publish product**; open `<url>/en/catalog` and find it; open it in Products, change the price, **Save changes**, and see the new price in the catalog; finally **Unpublish** it (the catalog card disappears). This is the first time the product writes run against real Neon (a product and its two translations are saved in one batch request), so a failure here matters: send the message shown and the Worker log line.
5. **Workers CPU / password hashing check (important).** Signing in and signing up hash the password with scrypt, which may need more than the 10 ms of CPU that Workers Free allows (`docs/SECURITY.md`, "Passwords"). Steps 3 and 4 _are_ this check: if both sign-ins work, it passes. Also look at Cloudflare → stone → **Metrics**: _CPU time_ for the sign-in requests and _Errors_ by status.
6. Optional: GitHub → **Actions** → **Preview smoke** → **Run workflow** → the preview URL.

**If sign-in fails**, retain sanitized logs and measure CPU for the actual request.
A CPU-limit event identifies a resource failure; it does not prove the database or
application code correct. **Do not** weaken hashing, change plans, recreate users or
switch hosts automatically. Compare the observed failure with the reviewed options
in `docs/SECURITY.md` before proposing a concrete correction.

**If sign-in says "invalid email or password"** for a seeded user: the seed ran against a different database than the one the website uses (compare which Neon project/branch each string points to), or the user was not created (re-run 3.4).

### 3.6 Later

- Rotate a secret: change it in Cloudflare and redeploy (`BETTER_AUTH_SECRET` signs everyone out). To change a database password use Neon → **Roles** → reset password, then update `DATABASE_URL`.
- Do not point a short-interval uptime monitor at `/api/health/db`: each hit wakes the free database.

The local Phase 4b follow-up adds migrations 0002 (product revision), 0003 (home
content), 0004 (stone requests) and 0005 (private public-request submissions/photos,
sequence and demo budget). Apply the complete migration history to an
explicitly approved isolated target before running this branch. Do not run these
against a shared or production database without a reviewed backup/rollback plan.
Local PGlite success does not verify Neon HTTP statements, real origin/cookie
behavior, Worker bundle size or password hashing within Worker CPU limits. The
request seed only adds synthetic records to the configured Client; do not seed
real customer data. A real payment provider is not required for the demo. Public
photo submission now uses bounded private PNGs in the existing database; see
`PUBLIC_REQUEST_DEMO.md`. The remote role needs sequence USAGE and budget-table
SELECT/UPDATE, and backups contain private images/contact snapshots.

Current scoping/build guidance was checked 2026-10-18 against
[Cloudflare Preview secrets](https://developers.cloudflare.com/workers/previews/configuration/#secrets),
[Preview build branches](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/),
[GitHub PR workflow events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)
and [manual workflow prerequisites](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow).

## 4. Environment variables

All variables are listed in `.env.example` and validated by `src/server/env.ts`. A wrong value makes the site fail with the _names_ of the offending variables, never the values.

| Variable                                                                               | Where                                 | Default       | Notes                                                                                                                        |
| -------------------------------------------------------------------------------------- | ------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                                                                              | runtime                               | `development` | `preview` on Cloudflare                                                                                                      |
| `INDEXING`                                                                             | **build** (robots, headers)           | `off`         | anything but `on` keeps noindex                                                                                              |
| `SITE_URL`                                                                             | runtime                               | unset         | public base URL; trusted origin; exact Preview URL required for requests if BETTER_AUTH_URL is unset                         |
| `PLATFORM`                                                                             | runtime                               | `node`        | `cloudflare` selects the adapter (client IP from `cf-connecting-ip`)                                                         |
| `DATABASE_URL`                                                                         | runtime, **Secret**                   | unset         | `postgres://` / `postgresql://` (Neon host → the Neon HTTP driver) or `pglite://` (local). Unset = no-database mode          |
| `BETTER_AUTH_SECRET`                                                                   | runtime, **Secret**                   | unset         | at least 32 characters; required when `DATABASE_URL` is set                                                                  |
| `BETTER_AUTH_URL`                                                                      | runtime                               | unset         | public base URL; trusted origin; decides cookie Secure. Set this or SITE_URL to the approved exact request-demo origin (3.3) |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD` | the terminal that runs `pnpm db:seed` | unset         | read only by the seed; the site never reads them                                                                             |
| `SEED_ALLOW_REMOTE`                                                                    | the terminal, for one command         | unset         | `1` lets the seed write to a remote database                                                                                 |

> **Production:** set `APP_ENV=production` on any real production deploy. The `/_styleguide` page returns 404 only when `APP_ENV=production`; if the variable is unset the guard fails open and the styleguide is reachable (it stays `noindex`). On a Node host it also makes session cookies `Secure` (`docs/SECURITY.md`).

## 5. Alternative hosting

> **Auth on Node hosts (docs/SECURITY.md):**
>
> - Run the Node server only behind a reverse proxy that overwrites or appends to `X-Forwarded-For`. Auth rate limiting uses its last hop, and a directly reachable `next start` lets clients choose that value.
> - Set `APP_ENV=production` (or an https `BETTER_AUTH_URL`). Without it, and with no URL configured, session cookies are not `Secure`.
> - Behind Cloudflare: the origin must accept connections only from Cloudflare's IP ranges. With `Cloudflare -> nginx -> Node`, restore the visitor address on nginx (`real_ip` module), or every visitor behind one Cloudflare edge shares a rate-limit bucket. A proxy that sends `ip:port` hops must strip the port. Details and the reasons: `docs/SECURITY.md`, "Rate limiting".
> - Database: any `postgres://` URL works (`pg` driver); a `*.neon.tech` host uses the Neon HTTP driver (on Cloudflare only a Neon URL works, see 3.3). Run `pnpm db:migrate` and `pnpm db:seed` as in section 3.4.
> - **Configure `DATABASE_URL` at run time.** Home now uses `connection()` and reads text overrides and catalog per request on Node as well as Cloudflare. A build without a database no longer freezes the seed content into Home. This removes the prior five-minute ISR policy and increases rendering/database work per visit; validate latency and capacity for the chosen production host. Admin actions retain path invalidation for client navigation.

The application code does not depend on Cloudflare. Cloudflare-only files: `wrangler.jsonc`, `open-next.config.ts`, `scripts/*worker-size*`, `public/_headers`, and the `cf:*` scripts.

### Vercel

1. vercel.com → **Add New** → **Project** → import the GitHub repository.
2. Framework preset **Next.js**; install `pnpm install`; build `pnpm build`.
3. Environment variables from `.env.example` (`PLATFORM=node`).
4. Optional clean-up: delete the Cloudflare-only files listed above and the `@opennextjs/cloudflare` and `wrangler` dev dependencies.

### Netlify

1. app.netlify.com → **Add new site** → **Import an existing project** → GitHub.
2. Build command `pnpm build`; Netlify detects Next.js and applies its Next.js runtime automatically.
3. Environment variables from `.env.example` (`PLATFORM=node`). `public/_headers` is also understood by Netlify.

### Node.js / Docker

- Node: `pnpm build && pnpm start` behind any reverse proxy; set variables from `.env.example`.
- Portable artifact: `pnpm build:node` opts into Next.js `output: "standalone"`.
  `Dockerfile` and `.dockerignore` package the same artifact. Build/run instructions,
  runtime requirements and the distinction between Node and Docker verification are
  in [NODE_DEPLOYMENT.md](NODE_DEPLOYMENT.md). Do not infer a Docker dry run from a
  passing Node build; consult the Phase 5 evidence.
