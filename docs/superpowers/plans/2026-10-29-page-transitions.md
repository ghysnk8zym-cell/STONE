# Implementation plan

1. Verify checkout and remote baseline; isolate source in the authorized workspace.
2. Keep Next routing/metadata untouched; add isolated Web Animations API crossfades and transform/opacity photo FLIP pairs.
3. Add shared motion tokens, mobile and reduced-motion CSS, and safe catalog return state.
4. Validate lint, formatting, types, unit tests, build and browser flows at 1440/390.
5. Push a draft PR, require all CI checks for the exact commit, obtain its Linux OpenNext artifact.
6. Deploy only that tested artifact to stone-test; verify RU/EN live routes and transitions.
