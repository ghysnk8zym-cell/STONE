# Deployment

The current deployment is a **test environment** on Cloudflare Workers (ADR-001). It is always `noindex`. Dashboard labels change over time: where a step says _verify in the current dashboard_, look for the closest equivalent.

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

   Non-production branches (PRs) use Cloudflare **Worker Previews**: Workers Builds runs only `npx wrangler preview` (the dashboard build command is skipped for previews). Wrangler then runs `build.command` from `wrangler.jsonc` (`scripts/ensure-opennext-build.mjs`), which builds the OpenNext worker if `.open-next/worker.js` is missing, and reads the `previews` block for vars. No separate preview command is needed; if your dashboard shows a "Preview command" field, leave its default.

   Existing project (as of 2026-10): **Workers & Pages → stone → Settings → Builds → Build configuration**: click a field to edit, then save; afterwards **Deployments → Retry build** on the PR branch (_verify in the current dashboard_).

4. **Build variables** (Settings → Build → Variables): `NODE_VERSION` = `24`.
   `INDEXING` is inlined at build time (`next.config.ts` → `env`), so the header and `robots.txt` always agree; leave it **unset** (= noindex). For a real launch: set `INDEXING=on` as a build variable **and** remove the `/*` noindex rule from `public/_headers` (static files bypass Next.js).
5. **Runtime variables**: none needed in Phase 1 (`PLATFORM`, `APP_ENV` defaults live in `wrangler.jsonc` `vars`). Secrets added in later phases go to Settings → **Variables and Secrets** as type _Secret_, never into the repository.
6. Settings → **Domains & Routes**: make sure **Preview URLs** are enabled (_verify in the current dashboard_).
7. Save and deploy. The first build runs on `main` after PR merge; each PR branch gets a Preview URL, also posted as a PR comment by the Cloudflare GitHub app.

### Verifying a preview

- Open `<preview-url>/ru` and `<preview-url>/en`: both must load; response header `x-robots-tag: noindex, nofollow`.
- GitHub → **Actions** → **Preview smoke** → **Run workflow** → paste the preview URL. The Playwright `@smoke` suite runs against it.

## 2. GitHub branch protection (owner, one time)

1. GitHub → repository → **Settings** → **Rules** → **Rulesets** → **New branch ruleset**.
2. Name `main`, enforcement **Active**, target branch `main` (Include default branch).
3. Enable **Require a pull request before merging**, **Require status checks to pass** with checks `quality`, `build`, `cloudflare`, `e2e`, and **Block force pushes**.
4. Save.

## 3. Database and sign-in: Neon + Cloudflare (owner, one time)

Until you do this the preview still works: the catalog comes from the built-in seed and the sign-in and sign-up pages say "Sign-in is unavailable on this environment". Adding the database turns on sign-in, the account area, favourites and the admin panel.

**Rules for this section.** Connection strings, passwords and the auth secret are secrets. Paste them only into the Cloudflare _Secret_ field, a password manager and your own terminal. **Never** paste them into a chat (including with Claude), an issue, a pull request, a commit or a screenshot. Nobody else (no agent) runs the commands below with real values; if something fails, send the _error text_, not the values.

### 3.1 Create the Neon project (EU)

1. Open <https://neon.com> → **Sign up** (or **Log in**). The Free plan needs no card. _Verify in the current dashboard_: labels change.
2. **Create project**. Name: `stone`. Postgres version: the default. **Region: an EU region** (for example _AWS Europe (Frankfurt)_). The Free plan is single-region; choose one near your visitors.
3. Optional but recommended: keep one project and one branch (`main`) for now. If you later want the preview to use different data from production, create a second Neon _branch_ (**Branches → Create branch**, name `preview`) and use that branch's connection string for the preview.
4. On the project dashboard click **Connect**. You see a connection string that looks like `postgresql://<user>:<password>@<host>/<database>?sslmode=require`.
   - The **Connection pooling** switch gives a host containing `-pooler`. Use the **pooled** string for the website (`DATABASE_URL` secret in 3.3).
   - For the migration in 3.4 the **direct** string (switch off) is the safer choice; the pooled one normally works too.
   - If a tool complains about `channel_binding=require`, delete that part of the string.
5. Keep the strings in your password manager. Free plan limits to know: the database suspends after a few minutes without queries and the next request is slower while it wakes up; there are 100 compute hours and 0.5 GB per project. **Compute hours are the limit to watch:** the database sleeps only when nobody queries it for a few minutes. A public page view costs 2 to 6 queries (home 4, catalog 6, product 2, plus 2 or 3 for a signed-in visitor), so steady traffic keeps it awake around the clock: 0.25 compute units for 730 hours is about 182 compute hours a month, above the free 100. With real traffic expect to hit the cap (then the database stops answering until the month ends or you upgrade). A test environment with a few visitors a day stays under it.

### 3.2 Generate the auth secret locally

`BETTER_AUTH_SECRET` signs and encrypts the session data. It must be random and at least 32 characters. Generate it on your own computer, copy it straight into the password manager, and do not show it to anybody:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

(or `openssl rand -base64 32`). Changing it later signs everybody out.

### 3.3 Add the values in Cloudflare

1. Cloudflare dashboard → **Workers & Pages** → **stone** → **Settings** → **Variables and Secrets** → **Add** (_verify in the current dashboard_).
2. Add each of these. Choose type **Secret** unless the table says otherwise, paste the value, **Save**/**Deploy**:

   | Name                                                                                   | Value                                        | Type   |
   | -------------------------------------------------------------------------------------- | -------------------------------------------- | ------ |
   | `DATABASE_URL`                                                                         | the Neon connection string from 3.1 (pooled) | Secret |
   | `BETTER_AUTH_SECRET`                                                                   | the secret from 3.2                          | Secret |
   | `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD` | the test users you want (see below)          | Secret |
   - **`DATABASE_URL` must be a Neon URL on Cloudflare** (host `*.neon.tech`): the Worker build contains only the Neon HTTP driver. Any other host (or `pglite://`) fails at the first database call with the message "DATABASE_URL must be a Neon URL ... when PLATFORM=cloudflare" in the Worker log (the URL is never printed), and the catalog pages answer 500 until it is fixed.
   - **`BETTER_AUTH_URL`: leave it unset on previews.** Every pull-request branch has its own address, and a fixed value would make the sign-in origin check refuse all the others. Unset, the address is taken from the request (always https except on `localhost`), and `APP_ENV=preview` (set by `wrangler.jsonc`) already makes the session cookies `Secure`. On production it is **optional**: set it to the exact production address (`https://stone.<your-subdomain>.workers.dev`, no trailing slash, no path) or leave it unset; if the dashboard shows one list of variables for production and previews, leave it unset.
   - **Preview vs production for the secrets.** If the dashboard separates _Production_ and _Preview_ values, fill `DATABASE_URL` and `BETTER_AUTH_SECRET` in both; if you see one list, one entry serves both. Afterwards confirm with 3.5 on a preview address.
   - **`SEED_*`**: only the command in 3.4 reads them; the running site never does. Putting them in Cloudflare is optional (it keeps the values in one place). Choose **strong, unique passwords**: the preview is reachable by anyone with the address, and the Admin account can edit the catalog. Use real-looking emails you control or `@example.test` addresses; do not reuse a password from anywhere.

3. Redeploy so the new values are picked up: **Deployments → Retry build** on the branch (or push any commit).

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
- Both commands are safe to repeat: the seed only adds what is missing and never overwrites what an admin edited. If it stops with a message that an account with `SEED_ADMIN_EMAIL` already exists and its password is not `SEED_ADMIN_PASSWORD`, someone registered that address first (or it was seeded with another password): pick another `SEED_ADMIN_EMAIL` (or delete that user in the Neon SQL editor) and run it again.
- Clear your terminal history afterwards if it recorded the values (PowerShell: `Clear-History`, and delete `%APPDATA%\Microsoft\Windows\PowerShell\PSReadLine\ConsoleHost_history.txt` lines that contain them).

### 3.5 Check the preview

Open the preview address (the Cloudflare pull-request comment, or `stone.<subdomain>.workers.dev` for `main`). Replace `<url>` below.

1. `<url>/api/health/db` shows `{"ok":true}`.
   - `{"ok":false,"reason":"database-not-configured"}` (503): this deployment does not see `DATABASE_URL`. Check the name and that it is a Secret on the right scope (3.3), then redeploy.
   - `{"ok":false,"reason":"database-unavailable"}` (503): the value is wrong, the Neon project is suspended or deleted, or the string was cut when pasted. Retry once (a suspended database wakes up), then re-copy the string. The Worker log line is `[health/db] check failed: <error name> <code>`: Cloudflare → stone → **Observability** → **Logs**.
2. `<url>/ru/catalog` and `<url>/en` still load, and the products are there.
3. **Sign in as the Client**: `<url>/ru/sign-in` with the Client email and password → you land on `/ru/account` (Orders shows two demo orders, Favorites three products). Use **Sign out** in the account sidebar and confirm. Then `<url>/ru/admin` as the Client must show a **404**.
4. **Sign in as the Admin**: `<url>/ru/admin` shows the Overview; Products and Orders open. Then **create and edit a product**: Products → Add product, fill the form (name in both languages, a price, a picture), **Publish product**; open `<url>/en/catalog` and find it; open it in Products, change the price, **Save changes**, and see the new price in the catalog; finally **Unpublish** it (the catalog card disappears). This is the first time the product writes run against real Neon (a product and its two translations are saved in one batch request), so a failure here matters: send the message shown and the Worker log line.
5. **Workers CPU / password hashing check (important).** Signing in and signing up hash the password with scrypt, which may need more than the 10 ms of CPU that Workers Free allows (`docs/SECURITY.md`, "Passwords"). Steps 3 and 4 _are_ this check: if both sign-ins work, it passes. Also look at Cloudflare → stone → **Metrics**: _CPU time_ for the sign-in requests and _Errors_ by status.
6. Optional: GitHub → **Actions** → **Preview smoke** → **Run workflow** → the preview URL.

**If sign-in fails with a server error or a CPU-limit message** (the form shows its generic error; the Worker log or Metrics shows _Worker exceeded CPU time limit_ / error 1102 on `POST /ru/sign-in`, the sign-in server action): the database is fine and the code is correct, the limit is the cause. **Do not** raise anything or switch plans on your own, and do not weaken passwords. Tell the lead: the choice is between replacing the hash with PBKDF2 (a code change; the seed users are recreated afterwards), a paid Workers plan, or hosting the test environment on Node. Decision record: `docs/SECURITY.md`.

**If sign-in says "invalid email or password"** for a seeded user: the seed ran against a different database than the one the website uses (compare which Neon project/branch each string points to), or the user was not created (re-run 3.4).

### 3.6 Later

- Rotate a secret: change it in Cloudflare and redeploy (`BETTER_AUTH_SECRET` signs everyone out). To change a database password use Neon → **Roles** → reset password, then update `DATABASE_URL`.
- Do not point a short-interval uptime monitor at `/api/health/db`: each hit wakes the free database.

## 4. Environment variables

All variables are listed in `.env.example` and validated by `src/server/env.ts`. A wrong value makes the site fail with the _names_ of the offending variables, never the values.

| Variable                                                                               | Where                                 | Default       | Notes                                                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- |
| `APP_ENV`                                                                              | runtime                               | `development` | `preview` on Cloudflare                                                                                             |
| `INDEXING`                                                                             | **build** (robots, headers)           | `off`         | anything but `on` keeps noindex                                                                                     |
| `SITE_URL`                                                                             | runtime                               | unset         | public base URL; also a trusted origin for sign-in                                                                  |
| `PLATFORM`                                                                             | runtime                               | `node`        | `cloudflare` selects the adapter (client IP from `cf-connecting-ip`)                                                |
| `DATABASE_URL`                                                                         | runtime, **Secret**                   | unset         | `postgres://` / `postgresql://` (Neon host → the Neon HTTP driver) or `pglite://` (local). Unset = no-database mode |
| `BETTER_AUTH_SECRET`                                                                   | runtime, **Secret**                   | unset         | at least 32 characters; required when `DATABASE_URL` is set                                                         |
| `BETTER_AUTH_URL`                                                                      | runtime                               | unset         | public base URL; trusted origin; decides the cookie `Secure` flag. Unset on previews, optional on production (3.3)  |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD` | the terminal that runs `pnpm db:seed` | unset         | read only by the seed; the site never reads them                                                                    |
| `SEED_ALLOW_REMOTE`                                                                    | the terminal, for one command         | unset         | `1` lets the seed write to a remote database                                                                        |

> **Production:** set `APP_ENV=production` on any real production deploy. The `/_styleguide` page returns 404 only when `APP_ENV=production`; if the variable is unset the guard fails open and the styleguide is reachable (it stays `noindex`). On a Node host it also makes session cookies `Secure` (`docs/SECURITY.md`).

## 5. Alternative hosting

> **Auth on Node hosts (docs/SECURITY.md):**
>
> - Run the Node server only behind a reverse proxy that overwrites or appends to `X-Forwarded-For`. Auth rate limiting uses its last hop, and a directly reachable `next start` lets clients choose that value.
> - Set `APP_ENV=production` (or an https `BETTER_AUTH_URL`). Without it, and with no URL configured, session cookies are not `Secure`.
> - Behind Cloudflare: the origin must accept connections only from Cloudflare's IP ranges. With `Cloudflare -> nginx -> Node`, restore the visitor address on nginx (`real_ip` module), or every visitor behind one Cloudflare edge shares a rate-limit bucket. A proxy that sends `ip:port` hops must strip the port. Details and the reasons: `docs/SECURITY.md`, "Rate limiting".
> - Database: any `postgres://` URL works (`pg` driver); a `*.neon.tech` host uses the Neon HTTP driver (on Cloudflare only a Neon URL works, see 3.3). Run `pnpm db:migrate` and `pnpm db:seed` as in section 3.4.
> - **Set `DATABASE_URL` at build time too** (`pnpm build`), not only at run time. The home page is prerendered during the build from the catalog the build could see; built without a database it contains the static seed. The home page re-renders at most every five minutes (`revalidate = 300`) and after every admin product change, so a missing build-time URL is corrected within minutes, but the first requests after a deploy can show the seed products. Cloudflare renders per request and is not affected.

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
- Docker: a `Dockerfile` using Next.js `output: "standalone"` is added and dry-run tested in Phase 5.
