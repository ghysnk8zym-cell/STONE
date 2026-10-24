# Product photos — local verification, 2026-10-24

Approved scope: local multi-photo product editor and gallery, prepared private R2
adapter. No cloud resources, remote migrations, commits/pushes or deployments were
performed for this task. The pre-existing `.open-next.backup-before-run-40094940752/`
directory was preserved.

## Result

- Product editor: JPEG/PNG/WebP, multiple selection, up to eight photos, 5 MiB
  original limit, preview, main photo, order, removal and existing asset selection.
- Product metadata/gallery saved atomically with RU/EN copy and the existing
  revision conflict check. Invalid uploads/saves keep the editor's fields.
- Published cards use the main image; real photos are selectable in the product
  gallery. Existing single-asset products retain full/detail behavior.
- Public reads require a published reference; draft/staged/removed images require
  an admin. Upload requires admin + same-origin and a bounded, validated body.
- Local PGlite/file persistence is real; Cloudflare R2 binding remains unconfigured.

## Observed checks

| Check                                                                 | Actual result                                    |
| --------------------------------------------------------------------- | ------------------------------------------------ |
| `pnpm typecheck` / final `tsc --noEmit`                               | Passed                                           |
| ESLint on every changed/new source and test file                      | Passed                                           |
| `git diff --check`                                                    | Passed                                           |
| Full Vitest suite, `--maxWorkers=2`                                   | **978 passed, 0 failed**                         |
| New browser scenarios, `product photos`                               | **4 passed**                                     |
| Existing admin narrow-screen boundary + axe new/edit forms            | **3 passed**                                     |
| Next production build via existing local QA build helper              | Passed, including TypeScript and page generation |
| Restart of the dedicated QA server with the same local database/files | HTTP 200; saved photo SHA-256 unchanged          |

Browser scenarios ran on the actual built local app at `http://localhost:3105`
using isolated, fictional accounts/data. Both RU and EN journeys covered two-file
PNG/WebP upload, main photo, draft save, reopen/reload, publish, public display,
keyboard thumbnail activation, reorder, removal and public access revocation.
JPEG normalization, over-5-MiB rejection, eight-photo limit, corrupt input,
unavailable storage and empty-gallery validation were exercised separately.

Desktop viewport: 1440 × 900. Public galleries also checked at 390 × 844 in RU/EN,
including thumbnail clicks and absence of horizontal page overflow. Existing admin
behavior was checked below 1024 and at 1024 px. This is representative coverage,
not a claim of exhaustive device or pixel-identical mobile verification.

Screenshots were inspected visually: the admin photo controls fit the existing
right column; uploaded images preserve aspect ratio; mobile thumbnails are usable.
The PNG fixture is a synthetic screenshot of an existing product card, deliberately
used as upload data, not new catalog content for the public deployment.

Local evidence (outside Git):

- `../qa/product-media-unit-results.json`
- `../qa/product-photo-restart.json`
- `../qa/product-photos-{ru,en}-admin.png`
- `../qa/product-photos-{ru,en}-desktop.png`
- `../qa/product-photos-{ru,en}-mobile.png`

## Environment failures and recovery

- Sandboxed SWC initially rejected the installed native cache's owner. The checks
  passed using the existing installed runtime outside the sandbox; no package was
  installed or updated.
- Ordinary `pnpm build` rejected the dependency junction outside the checkout's
  filesystem root. The existing `../qa-build-desktop.cjs` helper temporarily sets
  the common Turbopack root and restores the original `next.config.ts` afterward.
  The resulting production build passed; no permanent build workaround was added.
- Unbounded Vitest concurrency exhausted memory. The complete suite subsequently
  passed with two workers.
- The first browser pass found incorrect RU test selectors and an ambiguous alert
  locator; these were corrected. Corrupt-image feedback was also made specific.
  The final browser pass used the rebuilt application and passed.
- An automatic approval review rejected stopping an unidentified port listener.
  Read-only process/parent inspection established ownership; only the verified QA
  process was restarted after checking its exact command and parent again.

## Remaining boundaries

Real R2, hosted Worker PNG CPU/memory/size, remote database permissions/migration
and published-site journeys have **not** been tested. Files detached from galleries
and abandoned uploads are retained privately; orphan collection is documented and
must be agreed before expanding storage usage. See `docs/PRODUCT_PHOTOS.md` for
the storage contract and later connection steps.

The local preview remains running at port 3105 with its own PGlite database under
`.data/product-photos-qa` and files under `.data/product-images`. Local sign-in uses
only the fictional accounts in `.env.test.example`.
