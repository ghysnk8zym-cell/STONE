# Public stone request/photo: local verification

2026-10-18 follow-up to the owner's approved parameters/photo demonstration, with
no real payment or message delivery. This supersedes the old public-form exclusion;
it does not change the original `docs/STONE_HANDOFF.md` or establish customer acceptance.

## Source and artifacts

Worktree: `C:\Users\nartsiss\Documents\Documents STONE\.claude\worktrees\phase-2-design-system`.
Branch remains `feat/phase-4-auth`, HEAD `a94afcfd581e5ef4066cef0ae6831918f1ccddd4`.
The implementation is uncommitted; that HEAD alone does not contain this work.
Evidence is under `C:\Users\nartsiss\Documents\Codex\2026-10-18\task\stone-public-requests`.
`verification-summary.json` records the final source/evidence hashes and counts;
`source-snapshot` contains the cumulative changed source, excluding databases and secrets.

Relevant implementation: public `create-your-stone/page.tsx`, `RequestForm.tsx`,
`features/stone-requests/`, `server/stone-requests/`, private photo route, existing
admin request queries/editor, schema and additive migration `0005_public-stone-requests.sql`.
The already installed `pngjs@7.0.0` moved from development to runtime dependencies;
no package version or resolved dependency graph changed and nothing was installed.

## Behavior verified

- Public RU/EN page and sign-in return path; signed-in Client/Admin submission only.
  Material, plain color/texture, bounded integer dimensions/quantity, contact snapshot
  and one optimized reference are stored atomically in the existing database.
- Select/replace/remove photo, validation focus, unsupported SVG error, pending lock,
  success only after saving, confirmation reload, and display in the current admin UI.
- Guest and different-Client denial for both confirmation and image. Admin and owner
  can read; list DTOs omit image bytes. Private response is no-store/nosniff with CSP
  and same-origin resource policy. No public image optimizer/cache is used.
- Guard-before-input, missing/forged Origin, expired session, server-derived owner/
  status/number, exact replay and mismatched replay. Attempt limits precede decoding.
- Real local PGlite verifies atomic quota accounting, insertion rollback, different
  concurrent submissions at both limits, and identical concurrent retries consuming
  the last per-owner/global slot. Both identical retries return the same saved ID.
- PNG signature, byte/dimension/depth/interlace/chunk/CRC boundaries, metadata/animation
  rejection and decode/reencode. CRC-valid compressed inputs expanding to 2,000,000
  and 4 MiB are rejected. The 2 MiB cap bounds inflated output, not total process memory.

The adapter deliberately retains at most 50 public images, ten requests per owner,
512 KiB/512 px per canonical PNG. Seed records do not use this quota. Browser input
accepts JPEG/PNG/WebP up to 5 MiB, with bounded decoded dimensions and downscaling;
the original file is not retained. No real customer data was used.

## Check results

Final source: lint and TypeScript pass; 887/887 unit/integration tests across 72
files pass; 619 browser tests pass, 76 intentional skips, zero failures/flaky tests
or retries. Normal Next build and the final standalone build pass. Prettier is
checked after documentation reconciliation. Exact commands, exit codes, durations
and reports are in `checks-final.json`, `unit-results-final.json`, `e2e-final.json`
and the build/format logs.

The full browser run uses retries=0 and isolated synthetic databases. The 76 existing
project/viewport skips are intentional; no new skip or disabled accessibility rule
was added. Four public flows cover EN/RU at 1440 and 390 px. Desktop flows also capture
320/768/1024 px under reduced motion, assert no horizontal overflow, keyboard contact
order, validation focus, busy controls, axe, image permissions and admin persistence.
Admin remains desktop-only below 1024 px, with its existing honest notice.

`restart-results.json` and `standalone-validation/restart-results.json` record actual
server termination/restart on the same isolated database. A proxy first lets a
submission commit and aborts the response; reloading recovers the same ID through
the owner-scoped UUID in sessionStorage. Photo SHA-256 before/after restart matches,
and Admin reads the saved contacts/image. No contact fields or image enter browser storage.

The final opt-in standalone build succeeded without .env credential files. Its
runtime was copied to a new directory; 55 internal dependency links were checked.
`runtime-smoke.json` verifies RU/EN, 15 packaged assets, noindex and guest admin
redirects without a database. The independent relocated runtime then passed the
authenticated upload/recovery/restart journey. Only owned local helper servers
were stopped; unrelated processes were not touched.

`worker-probe-results.json` records installed local workerd: valid 2 px, 512 px and
high-detail 288 px PNGs return 200; SVG and CRC-valid 4 MiB expansion return 422.
This isolates the real photo decoder and does not build/deploy the complete Worker.
It establishes local compatibility, not deployed CPU budgets or remote persistence.

## Review and corrected failures

One independent read-only reviewer inspected guards, quota/replay/recovery, decoder,
error retention and final screenshots. Public Figma `849:23559/24247` and admin
`1077:52818` guided the implementation. Cached Figma pixels and final browser captures
are retained; synthetic gray samples are intentionally not copied product imagery.
No remaining P1/P2 finding was reported. Owner visual/editorial acceptance is pending.

The review found missing units on confirmation; localized mm/pieces were added and
browser-checked. A top-of-page axe check found the active header pill at 3.23:1 with
22 px normal white text, below 4.5:1. Only its fill now uses the darker shared default
token; current border, geometry and aria-current remain. The final focused EN/RU
check passes axe, and the reviewer inspected the fixed desktop form, RU confirmation
and RU320 layout. This is a documented accessibility deviation from the Figma Current fill.

Failed attempts are retained. The first browser run exposed an older test assumption
that seeded Q-1047 must remain in Overview's latest three after new submissions.
The test now follows View all requests, searches its own record and still checks
persisted status, stale edits and customer navigation. A subsequent intermediate
run loaded an obsolete table locator; the final full-list locator uses list items.
Other harness corrections gave admin contexts an explicit desktop viewport and
captured axe node details. No product test was disabled to make the suite pass.

The decoder initially used PNG.sync.read, whose private Node internals fail on
workerd. Public zlib preflight plus streaming PNG decode fixed that incompatibility.
An exact scanline-sized workerd cap rejected a valid high-detail PNG; a fixed bounded
2 MiB cap plus exact-length validation accepts it and rejects the over-limit payload.
The original historical Orders accessibility flake remains undiagnosed; these new
findings do not establish its cause.

## Remaining gates

No push, merge, deployment, remote migration/seed, credential/role/storage change,
account creation or production data access occurred. The approved existing US Neon
target is for synthetic data only. Before remote use: confirm recovery and securely
scoped credentials/role, apply reviewed migrations through 0005, set the exact origin,
and verify Neon HTTP concurrency, permissions and persistence. Runtime sequence
USAGE and budget SELECT/UPDATE are now required; backups contain private images.

Linux Docker/OpenNext execution, compressed Worker size, auth deduplication and real
Worker auth/image CPU remain unverified. Installed local Windows tools do not replace
those checks. Asset rights, customer acceptance, native screen-reader and browser-zoom
evaluation remain separate. See `PUBLIC_REQUEST_DEMO.md`, `COMPLETION_CHECKLIST.md`,
`NEON_STONE_TEST_PLAN.md` and `DEPLOYMENT.md` for the next concrete steps.
