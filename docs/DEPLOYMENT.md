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

   Non-production branches (PRs) use Cloudflare **Worker Previews**: Workers Builds runs the same build command and then `wrangler preview`, which reads the `previews` block in `wrangler.jsonc`. No separate preview command is needed; if your dashboard shows a "Preview command" field, leave its default (`npx wrangler preview`).

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

## 3. Environment variables

All variables are listed in `.env.example` and validated by `src/server/env.ts`.

| Variable   | Where                       | Default       | Notes                            |
| ---------- | --------------------------- | ------------- | -------------------------------- |
| `APP_ENV`  | runtime                     | `development` | `preview` on Cloudflare          |
| `INDEXING` | **build** (robots, headers) | `off`         | anything but `on` keeps noindex  |
| `SITE_URL` | runtime                     | unset         | public base URL                  |
| `PLATFORM` | runtime                     | `node`        | `cloudflare` selects the adapter |

## 4. Alternative hosting

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
