# STONE — continuation note

**Written:** 2026-10-20 (Europe/Moscow), by Claude, after the cart + test-checkout code milestone and before any deployment.
Read with `docs/STONE_HANDOFF.md` (state at 2026-10-18, still accurate for history), `docs/COMPLETION_CHECKLIST.md` (takeover work of 2026-10-18) and `CLAUDE.md`.

## 1. Where the work is

| Item                                    | Value                                                                                                                                                                                                                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Working directory                       | `C:\Users\nartsiss\Documents\Documents STONE\.claude\worktrees\phase-2-design-system` (a git worktree; the folder name is historical)                                                                                                                                            |
| Branch                                  | `feat/test-shop` — draft PR #6 (base `feat/phase-4-auth` = PR #5; stack #1 → #2 → #3 → #4 → #5 → #6; `main` = initial commit only). Owner approved commit + push on 2026-10-20.                                                                                                  |
| Commits                                 | `188229c` (all milestone work), `e6ba2d0` (CI Docker job fix), plus this note. **CI run 39336297414 on `e6ba2d0`: all six jobs green** (quality, build, e2e, cloudflare, node-standalone, docker); Worker gzip **2631.33 KiB / 3072 KiB**; artifact `open-next-build` (17.4 MB). |
| Local backup made before this milestone | `C:\Users\nartsiss\Documents\STONE-backups\2026-10-19-before-shop-work\` (`tree\` copy without node_modules/.next, `tracked-changes.patch`, `status.txt`, `HEAD.txt`)                                                                                                            |
| Implementer/review notes (git-ignored)  | `.superpowers/sdd/2026-10-19-test-shop/cart-checkout-report.md`, `.superpowers/sdd/2026-10-17-phase-4a-auth-account-admin/`                                                                                                                                                      |

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
- **CI (Linux, run 39336297414, commit `e6ba2d0`):** all six jobs green, incl. the full e2e suite, `cf:build` + 3 MiB gate (2631.33 KiB) and the Docker/standalone smokes.
- **Not run:** anything against real Neon or Cloudflare.

### Update 2026-10-20 — checkout retry fix (after the review of `221a8c2`)

- **Defect (confirmed):** `CheckoutView` created a new idempotency key on every attempt when sessionStorage could not be read or written, so a retry after a lost response could create a duplicate order.
- **Fix:** `src/features/cart/attempt-key.ts` — one key per submission identity (cart content) kept in memory for the page (`useRef` in `CheckoutView`) and mirrored to sessionStorage when it works; rotates after success, `conflict` or a changed cart. Server-side uniqueness, ownership and re-pricing unchanged. Remaining limitation: with storage unavailable, a page reload after a lost response starts a new submission (the saved order, if any, is in the account's Orders).
- **Tests added:** `tests/unit/attempt-key.test.ts` (6) and 3 in `tests/unit/cart-ui.test.tsx` (storage unreadable + unwritable, writes failing, lost response after persistence → retry → exactly one order on a fake per-key server; key rotation after success). Both regression tests failed before the fix (different keys) and pass after. Server-side tests for same-key retry and concurrent identical submissions already existed and pass.
- **50-order cap:** documented as a soft demo limit (not serialised, no fixed overshoot bound) in `docs/SECURITY.md`; not changed in code.
- **Local results:** `pnpm lint`, `format:check`, `typecheck` clean; `pnpm test` **953 passed** (77 files). E2E and the Cloudflare build were not re-run locally (CI after push).
- Disk: C: had 0 MB free at the start of this session; the owner freed space (1.76 GB free before the work).

## 4. Unfinished work and known issues

1. Committed and pushed to `feat/test-shop` (draft PR #6); nothing merged.
2. Not deployed. Real Neon (HTTP driver writes, sequences, grants) and real Workers runtime (password hashing CPU on Workers Free, photo processing) are unverified.
3. The 50-order cap is a soft demo limit (see `docs/SECURITY.md`); sign-out without JavaScript does not clear the cart.
4. **Deployment blocked (2026-10-20):** `wrangler deploy --env test` failed with "No access to the specified resource" on `/workers/scripts/stone-test/deployments`: the OAuth token on this PC has only `user (read)`, `account (read)`, `workers (write)`. Owner step: `pnpm exec wrangler login` (browser consent, same account). Nothing was created on Cloudflare; Worker `stone-test` does not exist yet. The preview `https://feat-test-shop-stone.gb8cj746n2.workers.dev` is the Workers Builds preview of the Git-connected `stone` Worker without database secrets ("sign-in unavailable") — it is not the configured test shop.
5. Cart/checkout/order screens and the test banner have no Figma frames — owner visual approval needed. Owner checklists in `docs/QA/*` remain open.
6. Historical flaky admin Orders axe test (root cause unproven).
7. `docs/STONE_HANDOFF.md` describes 2026-10-18 state; keep it unchanged as history.

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
- Owner approvals given on 2026-10-20: (a) commit/push to `feat/test-shop` + draft PR #6; (b)+(c) the provisioning script and the `stone-test` Worker deployment as described in §5. Still open: (d) paid plan, only if needed.
- Wrangler on this PC is logged in (OAuth) but its token lacks the scopes `wrangler deploy` needs (`versions`/`deployments` endpoints answer "No access"); the owner must run `pnpm exec wrangler login` before the deploy.
