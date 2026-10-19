# Phase 5: reproducible local handoff and portability

Approved continuation: finish the existing STONE scope, preserving all previous
milestones. One writer and one read-only independent reviewer. No remote changes,
credentials, installations, paid services, push, merge or deployment in this package.
The requested superpowers tools are unavailable in this session; use a written
plan, focused regressions, independent review and retained execution evidence.

1. Verify the prior source snapshot before editing. Inspect installed Node,
   package manager, Docker/WSL and bundled Next standalone/self-hosting docs.
2. Write a self-contained README local PGlite quickstart. Keep installation
   prerequisites distinct from the timed clean-source smoke test. Never copy
   credentials or local databases into the clean source copy.
3. Document routing/messages/data/formatting in I18N.md and reconcile shipped
   Phase 4 motion and reduced-motion behavior without inventing new motion.
4. Add an opt-in standalone Node build and Docker recipe. Include required
   runtime assets/migrations, keep secrets out of the build context/artifact, and
   preserve the existing Cloudflare path. Verify the actual standalone runtime.
5. Capture current Phase 4a screens, review against existing Figma references
   independently, exercise keyboard/zoom/reduced-motion behavior, and fix verified
   defects with meaningful regressions. Preserve historical QA artifacts.
6. Prepare an exact non-secret migration/runtime plan for project
   delicate-sound-31481072, stone-test (br-wandering-salad-b5wlyfp1). No credential
   retrieval or remote SQL. Document outstanding database/endpoint/rollback facts.
7. Review the final diff and whole-project requirements. Run appropriate checks,
   save an additive source snapshot and evidence report. Explicitly distinguish
   executed checks, environmental blockers and owner/release acceptance.
