# Original product photo preparation — 2026-10-25

## Scope

Local implementation only. Accept JPEG/JFIF, PNG, WebP, AVIF, BMP and HEIC/HEIF
originals up to 30 MiB / 60,000,000 pixels. Detect the format from bytes, prepare
files sequentially in disposable browser workers and normalize to PNG at up to
1600 px / 2 MiB. Smaller inputs are not enlarged. Preserve orientation, aspect
ratio and transparency. Load the pinned HEIC decoder only when native decoding
cannot handle a HEIC/HEIF file. Existing eight-photo ordering, main image,
storage, permissions, publication rules and responsive styles remain in place.

## Confirmed correction

A real HEIC converted successfully but the upload endpoint rejected its valid
PNG: OffscreenCanvas produced 391 chunks with 4 KiB IDAT payloads, exceeding the
old 64-chunk cap. Product uploads now allow 1024 chunks under the independent
2 MiB body, 1600 px side and 16 MiB inflation bounds. Private request photos keep
the 64-chunk default. A regression test verifies both behaviors and pixel data.

## Verification

- Production Next.js/Turbopack build and TypeScript: passed. Local dependency
  links were isolated and flattened; the original worktree was not changed.
- ESLint: passed, excluding the pre-existing untracked generated
  `.open-next.backup-before-run-40094940752/` directory. That directory is retained.
- Prettier: passed for `src`, `messages`, `docs`, `tests` and `package.json`.
  `git diff --check`: passed.
- Unit suite: 986 of 987 passed in the final full run. One existing auth rate-limit
  assertion returned 401 instead of 429 during concurrent workload; the focused
  retry passed. No auth implementation was changed. An earlier restricted-process
  SWC cache access failure was resolved by running the affected checks with access
  to the existing native cache; no package reinstall was needed.
- Six product-photo browser scenarios passed: RU/EN persistence, main image,
  reorder/removal, publication access, keyboard gallery use, mobile gallery,
  invalid files, unavailable storage, empty gallery, file/count/pixel limits and
  recovery. The two new native-format scenarios additionally verify EXIF
  orientation 6 by output pixels, transparency, BMP, a JPEG over the former 5 MiB
  limit with empty MIME, and no HEIC decoder download for ordinary native formats.
- The below-1024 px admin guard and axe accessibility check on the new-product
  form also passed. Together with the real-file scenario below, nine distinct
  browser scenarios were exercised successfully.
- A separate real-file browser scenario passed through the local upload endpoint,
  save, reload and RU/EN editor. Stored PNG results:

| Input                                | Stored dimensions | Stored bytes |
| ------------------------------------ | ----------------- | ------------ |
| libheif HEIC example                 | 1024 × 683        | 1,457,411    |
| AVIF sample                          | 1204 × 800        | 1,470,387    |
| JPEG with EXIF orientation 6         | 1024 × 683        | 1,508,106    |
| Transparent PNG with empty MIME      | 48 × 24           | 83           |
| Synthetic 8064 × 6048 PNG (48.77 MP) | 1600 × 1200       | 10,047       |

Fixtures and browser logs/screenshots are in the workspace's `qa/` directory,
outside the source checkout. Fixture source URLs are recorded in
`qa/photo-inputs/sources.json`; downloaded photos are not added to Git.

## Limits of this verification

Browser checks used desktop Chromium at 1440 × 900 and an emulated 390 × 844
mobile gallery. Physical phones and Safari were not exercised. A fresh
Cloudflare/workerd release build and deployed-site checks remain for the
separately approved publication stage. This change made no cloud database,
bucket, credential or deployed Worker changes; no commit or push was made.
