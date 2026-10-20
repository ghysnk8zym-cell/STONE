# Portable Node and Docker package

This packages the demo for customer approval and source handover to another team.
It does not provision the receiving team's host or perform a hosting migration.
Cloudflare/OpenNext remains the test target. The normal `pnpm build` is unchanged;
only `pnpm build:node` selects Next's `output: "standalone"`.

## Build and run

Use Node 24 and the pinned pnpm with the frozen lockfile. Build from a clean source
copy containing the intended commit **and any approved uncommitted changes**.
Do not copy `.env*` (except examples), `.data`, `.git`, caches or agent reports.
Prefer a fresh checkout, or place a source export outside any ancestor repository's
ignored directory. Tailwind source scanning can inherit parent ignore rules; the
Phase 5 export test required its own disposable Git boundary for this reason.
`build:node` refuses local environment files because Next can copy them into the
standalone artifact. It also clears known inherited database/auth/seed values for
the build child. Secrets belong in the runtime process, never build args.

```sh
pnpm install --frozen-lockfile
pnpm build:node
```

`scripts/build-node.mjs` builds Next and copies `public`, `.next/static` and
`drizzle` into `.next/standalone`. The generated `server.js` and traced dependencies
are the runtime. Generated dependency links are verified to target traced packages
inside the artifact. Windows junctions use absolute paths, so use the supplied
copier to rebase them when moving to a new runtime directory:

```sh
node scripts/copy-node-runtime.mjs .next/standalone ../stone-runtime
```

The copier refuses an existing destination or an external dependency link. It is
also included as `copy-node-runtime.mjs` in the artifact for later relocation.
Do not drag-copy a Windows junction tree and assume it is independent. Build and
run on compatible OS/architecture; Windows artifacts
are not Linux container artifacts. No full repository, pnpm, migration CLI, seed
script or dev server is required to serve the package.

Start from the runtime directory with `node server.js`, injecting these variables:

| Variable                              | Use                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `HOSTNAME=127.0.0.1`, `PORT=3100`     | Local smoke binding; use `0.0.0.0` only inside an isolated container/private host as appropriate. |
| `PLATFORM=node`, `APP_ENV=production` | Real Node deployment; production hides styleguide and enforces secure cookies.                    |
| `DATABASE_URL`, `BETTER_AUTH_SECRET`  | Runtime database and a unique secret; absent database gives the public no-auth mode.              |
| `SITE_URL`, `BETTER_AUTH_URL`         | Exact HTTPS deployment origin; configure the trusted proxy as described below.                    |

For local HTTP authentication smoke only, use `APP_ENV=preview` and
`BETTER_AUTH_URL=http://localhost:3100`. Use a disposable PGlite copy populated by
the source checkout's seed, **after the seed process stops**. An absolute
`pglite://` directory avoids changing databases when the runtime working directory
changes. PGlite is single-process/local/test only; it is not the production storage
plan. Remote PostgreSQL migrations are a separate reviewed operator step using the
source checkout; server startup never migrates a remote database.

`INDEXING` is a build-time value (default off). Changing it requires rebuilding;
changing runtime database/auth configuration requires restarting the server.
Keep a previous immutable application artifact for rollback. Database rollback is
separate and must not be inferred from restoring an older server.

## Docker recipe

`Dockerfile` uses the official `node:24-bookworm-slim` image for both stages, frozen
pnpm dependencies, a separate runtime stage and the non-root `node` user. The
`.dockerignore` allowlist sends only build inputs; environment files, databases,
Git and agent reports are excluded. The image runs the standalone server and does
not seed, deploy, fetch credentials or migrate remote PostgreSQL on startup.
Local PGlite intentionally applies its migrations on first database initialization.

On an approved machine with a running Docker daemon:

```sh
docker build --progress=plain --build-arg INDEXING=off -t stone:local .
docker run --name stone-local --publish 127.0.0.1:3100:3000 stone:local
```

The default is public/no-database mode. Supply runtime env through the host's secret
mechanism for authenticated testing; never put values in this document, image or
build args. Stop only the named container you created. Pin the reviewed base-image
digest and record the built image ID before a real release; this recipe does not
claim a reproducible immutable base from its floating version tag.

## Verification and operating limits

Smoke both locales, `/api/health/db`, a CSS/font/image asset, auth
Client/Admin journeys, protected routes, and saved-data persistence. Move the
artifact outside the source tree to prove it does not resolve omitted source
files or the original node_modules. A successful Node build is not proof of a
Docker build or Cloudflare Worker execution. See the Phase 5 QA report for exact
commands, results, prerequisites and unexecuted checks.

The local CI definition adds two isolated Ubuntu jobs alongside the existing
quality, Next build, Cloudflare and browser jobs:

- `node-standalone`: frozen install, `pnpm build:node`, relocation outside the
  checkout, and a loopback HTTP smoke against the relocated `server.js`.
- `docker`: build the actual Dockerfile, run its non-root image with no source
  mount or credentials, verify internal dependency links and run the same smoke.

`node scripts/smoke-packaged-app.mjs http://127.0.0.1:3100` checks RU/EN HTML,
noindex/nofollow, CSS/fonts/public image bytes and types, guest admin redirects and
the expected unconfigured database response. It rejects remote targets and does
not follow redirects. This no-database packaging smoke does not test authenticated
sessions, Neon persistence or Worker CPU. Those require the separate synthetic
runtime journeys. The jobs have no upload/deploy steps or secret references.
Their Linux/Docker commands remain unexecuted until an approved CI run; local
Windows verification and workflow parsing do not establish a Linux CI pass.

Production Node must sit behind a trusted reverse proxy that normalizes forwarded
IP headers; otherwise rate-limit keys are spoofable. Configure TLS, persistent
Postgres, origin restrictions, logging and rollback under `SECURITY.md`. Multi-node
cache coordination and commercial launch requirements are not implemented by this
single-container recipe. No external host was provisioned by adding these files.

Sources: bundled Next docs `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/output.md`
and `01-app/02-guides/self-hosting.md`; [official Node image documentation](https://github.com/nodejs/docker-node/blob/main/README.md).
