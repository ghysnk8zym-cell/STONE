# STONE — continuation note

**Written:** 2026-10-20 (Europe/Moscow), by Claude, after the cart + test-checkout code milestone and before any deployment.
Read with `docs/STONE_HANDOFF.md` (state at 2026-10-18, still accurate for history), `docs/COMPLETION_CHECKLIST.md` (takeover work of 2026-10-18) and `CLAUDE.md`.

## 1. Where the work is

| Item                                    | Value                                                                                                                                                                 |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Working directory                       | `C:\Users\nartsiss\Documents\Documents STONE\.claude\worktrees\phase-2-design-system` (a git worktree; the folder name is historical)                                 |
| Branch                                  | `feat/phase-4-auth` (PR #5, open; stacked on #4 → #3 → #2 → #1; `main` = initial commit only)                                                                         |
| HEAD (committed)                        | `a94afcf` — everything below is **uncommitted** in the working tree at the time of writing (see §6 for the push proposal)                                             |
| Local backup made before this milestone | `C:\Users\nartsiss\Documents\STONE-backups\2026-10-19-before-shop-work\` (`tree\` copy without node_modules/.next, `tracked-changes.patch`, `status.txt`, `HEAD.txt`) |
| Implementer/review notes (git-ignored)  | `.superpowers/sdd/2026-10-19-test-shop/cart-checkout-report.md`, `.superpowers/sdd/2026-10-17-phase-4a-auth-account-admin/`                                           |

## 2. Completed (uncommitted) work

**Takeover work of 2026-10-18 (another assistant, verified to pass tests here):** Phase 4b admin (Customers with role changes, Promotions, Site content RU/EN, Create Your Stone requests with quotes/status), public Create Your Stone form with a private reference photo stored in Postgres (base64, owner/admin-only access), migrations 0002–0005, Node standalone/Docker packaging recipes and docs (`docs/NODE_DEPLOYMENT.md`, `docs/I18N.md`, `docs/PUBLIC_REQUEST_DEMO.md`, `docs/NEON_STONE_TEST_PLAN.md`, `docs/COMPLETION_CHECKLIST.md`).

**This milestone (2026-10-19/20):** cart and test checkout — spec `docs/superpowers/specs/2026-10-19-test-shop-cart-checkout-design.md`.

- Units: a cart line is an **area in m² (0.01 precision)**, default = calculator order area (surface + 10 %); price = product price per m² in USD cents (placeholder); line total rounded like the calculator. No pieces/whole-m²/new currency.
- Cart in browser `localStorage` (≤ 20 lines, ≤ 10 000 m² per product; over-limit adds are refused with a message); survives refresh and sign-in; cleared after a successful order and on confirmed sign-out.
- `quoteCart` (public, read-only, 1 DB query) prices from published products; the browser total is display only.
- Checkout `/[locale]/checkout` requires sign-in (Guests go to sign-in and back to `/cart`); "Test order — no payment" notice; `placeTestOrder` (requireUser + same-origin + zod) re-quotes, refuses changed prices (`prices_changed`), totals above the integer range (`too_large`), unpublished products, > 50 test orders per user; one atomic SQL statement with an idempotency key (retry → same order; same key + different cart → `conflict`). Order number `T-<sequence>` shown only after the insert.
- Order page `/[locale]/account/orders/[number]` (owner only; others → localised 404); account Orders "View order" is live; admin Orders shows area lines, order kind, status change `in_progress` ↔ `delivered` (unchanged).
- Header/menu/tab-bar Cart live; product "Add to cart" / "Buy now" use the calculator; a test-version banner in the site shell.
- Migration `drizzle/0006_test-checkout.sql` (additive): `order_number_seq` (from 2001), `order.kind` / `idempotency_key` / `submission_digest`, partial unique index (user, key), `order_item.area_hundredths` / `line_total_cents` / `position`, checks. **Not applied to any remote database yet.**
- Test-deployment preparation: `env.test` in `wrangler.jsonc` (Worker `stone-test`, noindex, public origin `https://stone-test.gb8cj746n2.workers.dev`), CI uploads the Linux OpenNext build as artifact `open-next-build`, owner-run provisioning script `scripts/ops/stone-test-provision.mjs`, `docs/DEPLOYMENT.md` §0.

## 3. Tests run (local Windows, 2026-10-20)

- `pnpm lint`, `pnpm format:check`, `pnpm typecheck`: clean.
- `pnpm test`: **944 passed** (76 files).
- `pnpm build`: passes (implementer run after the review fixes).
- E2E: full suite after the first implementation **625 passed, 76 skipped (per-project/viewport skips, unchanged), 0 failed**; after the review fixes the shop/account/admin/product specs **139 passed, 23 skipped, 0 failed**. A full e2e run after the fixes has not been done locally (use CI).
- Independent review of the shop server code: no critical issues; its 3 important + minor findings are fixed (see the report).
- **Not run:** `pnpm cf:build` / Worker size (Linux only → CI), anything against real Neon or Cloudflare.

## 4. Unfinished work and known issues

1. Nothing is committed/pushed; CI has not run on this code.
2. Not deployed. Real Neon (HTTP driver writes, sequences, grants) and real Workers runtime (password hashing CPU on Workers Free, photo processing) are unverified.
3. ±1 race on the 50-order demo cap (documented in `docs/SECURITY.md`); sign-out without JavaScript does not clear the cart.
4. Cart/checkout/order screens and the test banner have no Figma frames — owner visual approval needed. Owner checklists in `docs/QA/*` remain open.
5. Historical flaky admin Orders axe test (root cause unproven).
6. `docs/STONE_HANDOFF.md` describes 2026-10-18 state; keep it unchanged as history.

## 5. Next commands

**Local checks** (repo root): `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` (starts its own servers; kill stray ones on ports 3000–3002 first).

**Heavy checks on Linux:** push the branch with an open PR (CI runs only for PRs and `main`); jobs: quality, build, e2e, cloudflare (`cf:build`, `cf:size` 3 MiB gate, artifact `open-next-build`), node-standalone, docker. Do not install WSL/Docker locally.

**Test database + secrets (owner, once, after approval):** `node scripts/ops/stone-test-provision.mjs` — hidden input of the `neondb_owner` connection string for Neon project `delicate-sound-31481072`, branch `stone-test` (`br-wandering-salad-b5wlyfp1`), database `neondb`; preflight + "yes"; checkpoint (server time + WAL LSN) to `~/Documents/STONE-backups/stone-test-checkpoints.log`; `pnpm db:migrate`; role `stone_app` (data access on `public` only); synthetic seed; Worker secrets via `wrangler secret put --env test`; account list to `~/Documents/STONE-backups/stone-test-accounts.local.txt` (outside git).

**Deploy (only after a fully green CI run of the exact commit):**

```sh
gh run download <run-id> -n open-next-build -D .open-next
pnpm exec wrangler deploy --env test
```

Then verify on `https://stone-test.gb8cj746n2.workers.dev`: RU/EN, mobile/desktop, sign-up/in/out, cart persistence, test checkout, order in account + admin, cross-account 404, admin-only access, custom request + private photo, admin edits persist, error states. Rollback = redeploy the previous green artifact.

## 6. Environment variables (names only) and approvals

- Runtime: `DATABASE_URL` (secret), `BETTER_AUTH_SECRET` (secret), `BETTER_AUTH_URL`, `SITE_URL`, `APP_ENV`, `INDEXING`, `PLATFORM`. Seed only: `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD`, `SEED_ALLOW_REMOTE`. Test-only fake values live in `.env.test.example`; never commit real values.
- Approvals still required from the owner: (a) commit + push the reviewed files to a branch and open a draft PR (triggers CI and possibly a Workers Builds preview of the `stone` Worker); (b) running the provisioning script (creates role `stone_app`, migrates and seeds `stone-test/neondb`, stores two secrets on Worker `stone-test`); (c) deploying the new Worker `stone-test` (Cloudflare account `7c9d39ab94bede596d336ddc609194ba`); (d) any paid plan if Workers Free CPU limits block sign-in — do not weaken password hashing.
- Wrangler on this PC is logged in (OAuth, `workers (write)`); `versions`/`deployments` reads return "No access" because the OAuth token lacks some scopes — not needed for `wrangler deploy`/`secret put`; refresh with `wrangler login` only if a deploy fails with a permission error.
