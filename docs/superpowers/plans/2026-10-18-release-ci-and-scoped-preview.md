# Linux packaging CI and scoped preview documentation

Goal: prepare a local, reviewable demo/handover package. No remote workflow run,
push, deployment, migration, account, role, credential or installation is included.
The owner approved the existing US Neon region for synthetic test data only;
public request submission/photo scope is awaiting clarification. Real payment and
email integrations are not part of this task.

1. Preserve the Phase 5 snapshot and current CI workflow before editing.
2. Add separate Linux standalone and Docker jobs, retaining all existing jobs,
   triggers and read-only permissions. Build without credentials; relocate Node
   output, run Docker as non-root, smoke only loopback and clean up owned resources.
3. Exercise the HTTP smoke verifier with negative regression cases and the existing
   independently relocated Windows artifact. Validate YAML and workflow invariants
   using installed tools; do not claim Linux or Docker execution on this machine.
4. Correct Preview secret scoping and migration/runtime privilege guidance. Describe
   implemented versus simulated functions and the demo/source-handover objective.
5. Obtain independent read-only review, resolve findings, retain an additive source
   snapshot and report exact checks plus unexecuted Linux/remote validation.

Superpowers is unavailable in this session. Use the written plan, focused tests,
independent reviewer and retained evidence without installing additional tools.
