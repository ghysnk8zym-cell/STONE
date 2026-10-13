# ADR-001: Hosting and runtime

**Status:** Accepted (owner approved written ADR 2026-10-13)
**Date:** 2026-10-13
**Deciders:** Project owner (approval), lead engineer (Claude)

## Context

- STONE needs real authentication, server-side role checks and database access, so a pure static export is insufficient.
- The Cloudflare deployment is a **test environment** for building animations and features before handing the repository to other developers. It must be portable: a standard `next build` has to work on Node.js, Vercel or Netlify after only env/config changes.
- Budget: start on free tiers. Owner decision (2026-10-13, option A): stay on Workers Free; if the Worker exceeds the Free size limit, stop and ask before moving to Workers Paid.

Facts checked on 2026-10-13 (sources at the end):

- `@opennextjs/cloudflare` (latest 1.20.11) supports all Next.js 16 minors and the latest 14/15 minors, uses the Next.js Node.js runtime on Workers, supports standard middleware, and does **not** yet support Node middleware.
- OpenNext does not yet recognise the Next.js 16 `proxy.ts` file; `middleware.ts` still works in Next.js 16 (deprecated).
- Worker size limits: 3 MiB compressed (Free) and 10 MiB (Paid).
- OpenNext does not guarantee Windows builds; it recommends WSL, a Linux VM or Linux CI.
- Image optimisation on Cloudflare requires Cloudflare Images.
- Cloudflare's Next.js guide now recommends **vinext** (Vite-based reimplementation of the Next.js API, beta) as the default and keeps OpenNext for apps with compatibility gaps.
- Workers Builds connects a GitHub repository; production-branch pushes create deployments, other branches create Preview builds with Preview URLs that can be posted as PR comments.

## Decision

Run Next.js 16 on **Cloudflare Workers via `@opennextjs/cloudflare` 1.x**, deployed by **Workers Builds** connected to GitHub: `main` → stable test URL; every other branch/PR → Preview URL. Use the Workers Free plan.

All Cloudflare-specific code lives in `wrangler.jsonc`, `open-next.config.ts` and `src/server/platform/`. Application code uses only Next.js APIs and `process.env`.

## Options Considered

### Option A: OpenNext adapter on Workers (chosen)

| Dimension | Assessment |
|---|---|
| Complexity | Medium: adapter config plus Linux-only Cloudflare build |
| Cost | Free plan; Paid ($5/month) only with owner approval if > 3 MiB |
| Scalability | Sufficient for a test environment |
| Team familiarity | High: the app is plain Next.js; adapter is a build step |

**Pros:** builds the real `next build` output, so other hosts run the same code; mature (1.x); per-branch previews; standard middleware supported.
**Cons:** no `proxy.ts` yet; 3 MiB Free limit is tight; Windows builds unsupported; image optimisation needs a workaround.

### Option B: vinext on Workers

| Dimension | Assessment |
|---|---|
| Complexity | Medium |
| Cost | Free plan |
| Scalability | Sufficient |
| Team familiarity | Low: Vite-based reimplementation of Next.js |

**Pros:** Cloudflare's current default; Vite build; Cloudflare bindings.
**Cons:** beta; reimplements the Next.js surface, so the test environment would not run the same runtime as Vercel/Node targets; `next/*` imports "mostly supported", image optimisation partial. Conflicts with the portability goal.

### Option C: `@cloudflare/next-on-pages` (Pages)

**Pros:** simple Pages workflow. **Cons:** Edge runtime only; superseded by OpenNext. Rejected.

### Option D: Static export on Pages

**Pros:** cheapest and simplest. **Cons:** no server-side auth, server actions or role checks. Rejected.

### Option E: Vercel Hobby as the test host

**Pros:** zero-adapter Next.js. **Cons:** owner chose Cloudflare for testing; kept as the first migration target.

## Trade-off Analysis

Portability outweighs following Cloudflare's newest default. OpenNext adapts the genuine Next.js build output, so behaviour verified on the test environment transfers to other hosts. vinext may become preferable once stable, but adopting a beta reimplementation now would make the test environment diverge from the hand-off targets. The 3 MiB limit is the main operational risk; a CI size check makes it visible before deployment.

## Consequences

- Easier: per-PR preview URLs; leaving Cloudflare is a config change.
- Harder: Cloudflare builds only on Linux (Workers Builds and CI); local Windows development uses `next dev` only.
- Must use `middleware.ts`, not `proxy.ts`.
- Images: pre-optimised at build time for Cloudflare (static loader in the platform adapter); standard optimiser elsewhere.
- Every deployment is `noindex` (`X-Robots-Tag` + `robots.txt`) unless `INDEXING=on`.
- Revisit: `proxy.ts` support in OpenNext; vinext stability; Free size limit.

## Migration path

| Target | Steps |
|---|---|
| Vercel / Netlify | Import the repository; set env vars from `.env.example`; build command `pnpm build`. Delete `wrangler.jsonc` and `open-next.config.ts` (optional). Set `PLATFORM=node`. |
| Node.js / Docker | `NEXT_OUTPUT=standalone pnpm build`; run with the provided Dockerfile (`node .next/standalone/server.js`); set env vars; put any Postgres URL in `DATABASE_URL` (the `pg` driver is selected automatically). |

Phase 5 performs and records a dry run of the Node/Docker path.

## Action Items

1. [ ] Phase 1: scaffold with `@opennextjs/cloudflare`, `wrangler.jsonc`, `open-next.config.ts`, `src/server/platform/`.
2. [ ] Phase 1: CI step that builds with OpenNext and fails above 3 MiB compressed.
3. [ ] Phase 1: owner connects Workers Builds (click-by-click steps in `docs/DEPLOYMENT.md`).
4. [ ] Phase 1: verify a PR preview URL in both locales.
5. [ ] Phase 5: non-Cloudflare dry run.

## Sources

- https://opennext.js.org/cloudflare
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/ci-cd/builds/
