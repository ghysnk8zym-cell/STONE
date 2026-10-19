# STONE completion and acceptance checklist

Updated 2026-10-18 during takeover. **The project is not yet accepted or released.**
Passing local tests is evidence for individual code paths, not whole-project completion.
The unchanged `docs/STONE_HANDOFF.md` records the original handoff; this document
tracks subsequent work. Approved scope comes from the architecture and Phase 4
specifications under `docs/superpowers/specs/`, with existing Figma screens governing
visuals. An unchecked item is pending; no owner acceptance is inferred from silence.
The owner clarified on 2026-10-18 that the deliverable is a test version for customer
approval, then source-file handover for another team's development/server migration.
Production commerce operations are not acceptance gates for this demo.

## Implemented locally; release verification remains separate

- [x] Preserve original handoff and `.superpowers` reports, plus additive source
      snapshots for each takeover milestone. Initial audit and later verification
      artifacts are under `C:\Users\nartsiss\Documents\Codex\2026-10-18\task\stone-*`.
- [x] Public Home, Catalog, product details/calculator, filters, navigation and
      favorites exist in RU/EN. Existing supported journeys remain in browser tests.
- [x] Guest/Client/Admin authentication and account routes; protected pages/actions;
      self-demotion rejection; auth error logging and honest sign-out failure handling.
- [x] Phase 4b Customers: bounded search/list, selected profile/orders, guarded role
      changes and existing-session role enforcement.
- [x] Phase 4b Promotions: existing product price/old-price/badge fields, preview and
      catalog integration. Product/Promotions/publish share monotonic revision checks;
      product fields and translations commit atomically.
- [x] Phase 4b Site content: 18 existing Home text keys in RU/EN, guarded value
      comparison, restore defaults, plain React text, request-time Home freshness.
- [x] Phase 4b Create Your Stone: seeded request records, immutable specifications,
      linked existing Client, guarded quote drafts/status tracking, shared revision
      checks, bounded search/list, Customers link and latest-three Overview/count.
- [x] Additive migrations 0002/0003/0004 and idempotent synthetic seed are present;
      PGlite fixtures exercise the history locally. Existing records are not reset.
- [x] Request draft retention was independently reviewed; a filtered-refresh loss
      path was corrected and covered by a browser regression.
- [x] Owner approved public parameters/photo submission without real online payment.
      RU/EN form, owner/admin-only confirmation/photo, existing admin integration,
      additive migration 0005 and bounded database-backed storage are implemented
      locally. See `docs/PUBLIC_REQUEST_DEMO.md`; final verification is tracked in
      `docs/QA/public-request-demo.md`.
- [x] Public photo demo verification: 887 unit/integration and 619 browser passes,
      76 intentional skips, no retries/failures; independent security/design review,
      local workerd decoder and relocated Node lost-response/restart checks passed.

Current milestone reports contain exact final counts, screenshots and any failed
attempts. Tests cover synthetic data and local Node/PGlite. They do not prove real
Neon HTTP or Cloudflare password-hash execution. The original intermittent Orders
axe failure has not had its historical cause established; later green runs do not
retroactively diagnose it.

## Phase 5 local package

- [x] Self-contained README quickstart verified in an independent source copy with
      current uncommitted implementation: fresh local PGlite seed and RU/EN Client/Admin
      login in 22.31 seconds. Existing pinned dependencies and Chromium were reused;
      a cold registry install was not tested. The recipe creates the missing data parent.
- [x] `docs/I18N.md` documents routing, message parity, formatting, product translations
      and Home overrides. Russian editorial acceptance remains an owner item.
- [x] Opt-in standalone Node package, internal dependency-link normalization and safe
      relocation, Docker recipe and secret-excluding build context. Relocated Windows
      runtime, assets, auth and persistence verified. Docker/Linux execution remains open.
- [x] Phase 4 motion inventory reconciled; real normal/reduced-motion pending-state,
      computed-style and keyboard behavior verified in RU/EN without new animation.
- [x] Fresh Phase 4a core matrix (44 RU/EN captures), interaction/reflow states and
      cached Figma comparison sheets prepared for independent review. Historical
      implementer review is not owner acceptance. See docs/QA/phase-5-local.md.
- [x] Consolidated Phase 4b guarded-write/security evidence and the Phase 5 full local suite:
      842 unit tests; 611 browser passes, 76 project/viewport skips, zero retries/failures.
      The original historical Orders axe flake still has no proven root cause.
- [x] Reviewed dependency/lockfile and migration invariants, retained additive source
      snapshots and a concrete review/commit sequence in the Phase 5 milestone report.
- [x] Added isolated Linux CI definitions for relocated standalone Node and non-root
      Docker packaging, preserving existing checks. These new jobs are not yet run.
- [ ] Owner acceptance, native browser zoom/screen-reader evaluation, Linux Docker and
      real Neon/Worker release validation are separate pending items below.

## Neon, Worker and release gates

- [x] Read-only metadata resolves `stone-test` / `br-wandering-salad-b5wlyfp1`,
      project `delicate-sound-31481072`, database `neondb`, exact endpoint and existing
      `neon_auth` inventory. See `docs/NEON_STONE_TEST_PLAN.md`; no credentials fetched.
- [x] Owner approved the existing `aws-us-east-2` target for synthetic test data only.
      Real customer data and a production residency decision are outside this approval.
- [ ] Resolve recovery point and secure action-time credential entry. No STONE
      migration, seed or authenticated remote runtime has been executed; region
      approval does not authorize new credentials, roles or persistent access.
- [ ] Before remote migration/seed: name project/branch/database and environment,
      list migrations through 0005, existing data impact, backup/rollback and synthetic
      seed scope; obtain the applicable target-specific approval. Do not use production
      credentials for previews or create substitute providers.
- [ ] On the approved preview: verify health, Client/Admin login and guards, both
      locales, signup/signout/password change, all Phase 4b saves, product/translation
      atomicity, stale-write behavior and Home freshness against real Neon HTTP.
- [ ] Run the final OpenNext build, compressed Worker size gate (3 MiB) and bundled
      auth deduplication in supported Linux/CI. Windows previously failed the symlink
      build; local `next build` is not equivalent. No new WSL installation is implied.
- [ ] Measure real Cloudflare auth/image CPU and error behavior. Any plan cost or hash
      algorithm/credential migration requires a concrete reviewed choice; do not weaken
      hashing to obtain a passing preview.
- [ ] Refresh PR #1–#5 state, dependencies and CI for the exact proposed commit.
      The known stack is #1 architecture → #2 scaffold → #3 design system → #4 pages →
      #5 auth. Main was still the initial commit at takeover; all takeover edits remain
      local until explicitly published. A push triggers preview builds.
- [ ] Prepare the release target before requesting release: exact branch/commit,
      Cloudflare Worker/environment, preview URL, database target, migration status,
      secrets names (never values), smoke tests and rollback version. Historical public
      probes found the main address `stone.gb8cj746n2.workers.dev` serving Hello world;
      preview `ffc29513-stone.gb8cj746n2.workers.dev` served the old STONE build without
      DB. These are historical findings, not a current deployment selection.
- [ ] Obtain applicable approval for push/PR publication, ordered merges, deployment,
      persistent security settings and launch switches. No such action has occurred in
      these local milestones. Branch protection and broader production security items
      remain tracked in `docs/SECURITY.md`.

## Owner acceptance and scope boundary

- [ ] Review the existing Phase 2/3/4a QA checklists and new Phase 4b screenshots:
      RU wording, states absent from Figma, below-1024 admin notice and intentional
      differences required by the approved data model.
- [ ] Confirm image/font asset rights and any replacement high-resolution sources;
      approve actual product prices before removing illustrative/demo labels.
- [x] Owner confirmed a demonstration for customer approval and source handover.
      Real payment/email integrations and production operations are not demo blockers.
- [ ] Customer/owner acceptance of the working public request/photo demonstration.

The older Phase 4 exclusion of public Create Your Stone was superseded by the
owner's explicit parameters/photo demo approval. Cart/checkout, real payment,
email delivery, notifications and support remain unimplemented. Disabled controls
disclose these limits; the request form does not send messages or take payments.
Credentials, paid plans, irreversible deletion and unsafe release
are not authorized by a broad advance-permission message.

Next executable sequence: review the public request/photo evidence and owner checklist;
resolve the exact Neon recovery/credential and supported Linux execution
gates; then perform the approved remote validation sequence. Prepare the exact
release artifact and rollback before requesting publication or deployment.
