# Implementation plan

1. Verify preserved 115-file baseline; inspect actual public/admin Figma and installed
   tools. Obtain bounded security preflight. Superpowers is unavailable; no install.
2. Add additive schema/migration and a small Postgres-backed private photo adapter.
   Introduce strict input/image validation, guarded action, retry and atomic quotas.
3. Implement Figma public RU/EN form using existing components, private confirmation,
   authenticated photo route and current admin photo/contact display. Enable the
   existing Create Your Stone navigation and preserve unrelated disabled controls.
4. Verify focused unit/integration cases, then build and browser submission/admin/
   reload/restart flows using synthetic local PGlite and synthetic images. Inspect
   responsive screenshots and accessibility. Independent security/design/code review.
5. Run required full checks, update current handover/acceptance documentation while
   preserving original STONE_HANDOFF.md, and add a new immutable evidence snapshot.

Completed locally: steps 1-5. Final checks: 887 unit/integration passes, 619 browser
passes, 76 intentional skips, zero retries/failures; lint, TypeScript, Next and
standalone builds pass. Local workerd and relocated Node upload/recovery/restart
checks pass. Independent review fixes are recorded in `docs/QA/public-request-demo.md`.
Remote validation and customer acceptance remain separate gates, not completed steps.
