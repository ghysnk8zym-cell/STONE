# STONE

Natural-stone demonstration website: Next.js App Router, TypeScript, Russian
(default) and English, Guest/Client/Admin roles. Cloudflare Workers is the test
hosting target; the application also has a portable Node build. Prices are
illustrative. The deliverable is a test version for customer approval, then source
handover for another team's development and server migration. Account/admin writes
are implemented; orders come from synthetic seed. Custom requests include seeded
examples and working private submissions with parameters and a reference photo.
Cart/checkout, real payment, messaging and email delivery are not implemented.
The owner approved the request/photo demo without real online payment. Use only
fictional contacts and non-sensitive images. See `docs/PUBLIC_REQUEST_DEMO.md`.

## Local quickstart (with working authentication)

Prerequisites: **Node 24.x**, **pnpm 12.11.2**, and this source checkout. No database
server, Docker, Neon account or cloud credentials are needed. An initial dependency
installation needs registry access; Next's first compilation downloads the Google
fonts in `src/app/fonts.ts`. Browser-test Chromium is a separate prerequisite.

Verify `node --version` and `pnpm --version`. If Corepack is already installed,
`corepack pnpm` can replace `pnpm` without enabling a global shim; its first use
may download the pinned package manager. Use your approved installation method
if these prerequisites are missing.

From the repository directory:

```sh
pnpm install --frozen-lockfile
```

Create a **new** `.env.local` with the Node command below (works in PowerShell and
POSIX shells). It copies only the committed fake test values and adds a local
database URL. It deliberately fails if the file already exists; preserve your
configuration and inspect it locally instead of overwriting it.

```sh
node -e "const f=require('node:fs'); f.writeFileSync('.env.local',f.readFileSync('.env.test.example','utf8')+'\nAPP_ENV=development\nINDEXING=off\nPLATFORM=node\nDATABASE_URL=pglite://.data/pglite\nBETTER_AUTH_URL=http://localhost:3000\n',{flag:'wx'}); f.mkdirSync('.data',{recursive:true})"
pnpm db:seed
pnpm dev --hostname 127.0.0.1
```

Open **http://localhost:3000/ru** or **http://localhost:3000/en**. Sign in at
`/ru/sign-in` using `SEED_CLIENT_EMAIL`/`SEED_CLIENT_PASSWORD` from the local file;
use `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` for `/ru/admin`. Do not use these fake
accounts on a shared host. The admin interface requires at least 1024 CSS pixels.

The seed applies local migrations and inserts 12 products, two test users, demo
orders/favorites and three custom requests. It can be rerun without replacing
existing business records. Stop the dev server before seeding: one process owns
the PGlite directory at a time. Ctrl+C stops your foreground server. `.data/` and
`.env.local` are ignored by Git; keep them outside handoff/build artifacts.

To browse without auth/database, use a new source copy and run `pnpm dev` without
creating `.env.local`. Sign-in will correctly report that it is unavailable.

If dependencies already exist but the pnpm shim is unavailable, **do not run npm
install** or create another lockfile. Equivalent commands are `npm run db:seed`
and `npm run dev -- --hostname 127.0.0.1`. This fallback only runs installed tools.

Troubleshooting: a missing `next` means dependencies are absent; a font download
failure needs network access; a PGlite lock means another process owns that exact
data directory; a missing database message means the environment was not loaded.
Choose another port only with matching `BETTER_AUTH_URL` (for example 3100) and
restart after environment changes. Never stop an unrelated process to free a port.

## Check and package

```sh
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

For the last command, installed Chromium and free ports 3000/3001/3002 are needed;
stop the quickstart server first. If Chromium is missing, install it explicitly
with `pnpm exec playwright install chromium`. Browser tests use synthetic isolated
PGlite data. They do not validate remote Neon or Cloudflare CPU limits.

`pnpm build` then `pnpm start --hostname 127.0.0.1` serves the ordinary Node build.
For a self-contained artifact, run `pnpm build:node` from a clean source directory
without `.env` files, then `node .next/standalone/server.js`. Set `HOSTNAME`, `PORT`
and runtime variables in that process. The artifact includes public/static assets
and migration SQL. Full Node/Docker instructions and exact verification limits:
[docs/NODE_DEPLOYMENT.md](docs/NODE_DEPLOYMENT.md).

## Project evidence and decisions

- Development/scripts: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Languages/copy: [docs/I18N.md](docs/I18N.md)
- Motion: [docs/ANIMATIONS.md](docs/ANIMATIONS.md)
- Release/environment steps: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- Remaining acceptance: [docs/COMPLETION_CHECKLIST.md](docs/COMPLETION_CHECKLIST.md)
- Decisions: [docs/adr/](docs/adr/); Figma: [docs/FIGMA-INVENTORY.md](docs/FIGMA-INVENTORY.md)
- Contributor rules: [AGENTS.md](AGENTS.md), [CLAUDE.md](CLAUDE.md)
