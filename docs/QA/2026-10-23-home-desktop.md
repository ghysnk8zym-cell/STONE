# Homepage desktop refinement — 2026-10-23

## Scope

Home only, from 1024 CSS pixels: 48px sticky navigation, hero below the header using the existing wide artwork, aligned headline/search with a 16px gap, and three centered panels up to 1600px with at least 40px side margins. Catalog/promo tracks show 3, 4 or 5 whole cards at the existing desktop breakpoints. Works cards remain bounded and centered. Existing non-looping carousel behavior is preserved; arrows are disabled when all cards fit. Desktop favorite hearts reuse the existing authentication and persistence flow.

No layout rules below 1024px, design tokens, dependencies, database schema, routes or deployment configuration were changed. The original user worktree was not edited.

## Local verification

- Production Next build, TypeScript, ESLint, formatting and diff checks passed.
- Vitest: 77 files, 957 tests passed.
- Scoped browser suite: 94 passed, 25 conditional skips, initially 5 failures. All 5 subsequently passed: four 404 checks needed the standard Next listening address (the loopback-only server could not complete its localhost rewrite); the carousel test needed to wait for smooth scrolling before checking the next disabled state. Application navigation/scroll handlers were not changed to accommodate these tests.
- New desktop geometry/control checks passed in RU/EN at 1024, 1280, 1440 and 1920 CSS pixels: header/hero separation, shared panel width/alignment, whole cards, arrows in both directions, no horizontal overflow, visible hearts and keyboard sign-in navigation.
- Six authentication/favorites checks passed against a disposable local PGlite database. RU/EN homepage favorites survived sign-in and reload, and removal survived reload, on desktop and mobile. No shared database records were written.
- Twelve screenshot comparison cases passed against the preceding published version. RU/EN at 320, 390, 768 and 1023px had **zero changed pixels** in full-page comparisons (pixelmatch threshold 0.1). Desktop before/after pairs were captured at 1440x1080 and 1920x1080; mobile/tablet viewports used height 844. Browser zoom 100%, device scale factor 1, reduced motion, fonts and visible images loaded. Screenshots are stored outside Git in the task's `qa` folder.
- The mobile hero still requests exactly one image. The desktop preload retains an upper media bound to avoid a second hero download in phone emulation.

## Publication boundary

The owner authorized publication to the existing `stone-test` URL after checks. Publish only the Linux OpenNext artifact from a fully successful CI run of the exact source commit. Verify public RU/EN desktop and mobile journeys after deployment. Local authenticated tests do not establish authenticated behavior on the remote database; remote verification should remain read-only unless separately authorized.
