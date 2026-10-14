Method: full-page screenshots of /en<route> in Playwright Chromium, viewport width = Figma frame width and height 900, deviceScaleFactor 1, reduced motion, animations disabled; the page is scrolled once so lazy images load and every image is decoded before the shot.
Reference: Figma get_screenshot of the matching screen (scale 1, original size). Both images are padded to the larger size and flattened on the page background colour; pixelmatch threshold 0.1, anti-aliasing ignored.
Notes: the height delta is implementation height minus Figma height; a non-zero delta shifts everything below it, so a high mismatch is expected and must be read from the triplet ("raw % is not pass/fail").

| id              | route                       | width | mismatch % | impl WxH  | figma WxH | height delta |
| --------------- | --------------------------- | ----- | ---------- | --------- | --------- | ------------ |
| home            | /en                         | 1440  | 1.08       | 1440x2210 | 1440x2208 | +2           |
| home            | /en                         | 1024  | 2.64       | 1024x2050 | 1024x2048 | +2           |
| home            | /en                         | 768   | 10.64      | 768x2220  | 768x2219  | +1           |
| home            | /en                         | 390   | 3.41       | 390x1696  | 390x1702  | -6           |
| catalog         | /en/catalog                 | 1440  | 19.03      | 1440x2074 | 1440x2054 | +20          |
| catalog         | /en/catalog                 | 1024  | 21.39      | 1024x2432 | 1024x2412 | +20          |
| catalog         | /en/catalog                 | 768   | 21.53      | 768x3428  | 768x3408  | +20          |
| catalog         | /en/catalog                 | 390   | 21.82      | 390x3404  | 390x3384  | +20          |
| black-marble    | /en/catalog/black-marble    | 1440  | 0.86       | 1440x1438 | 1440x1438 | 0            |
| black-marble    | /en/catalog/black-marble    | 1024  | 1.26       | 1024x1446 | 1024x1446 | 0            |
| black-marble    | /en/catalog/black-marble    | 768   | 1.39       | 768x2361  | 768x2361  | 0            |
| black-marble    | /en/catalog/black-marble    | 390   | 6.74       | 390x2104  | 390x2105  | -1           |
| charcoal-ledger | /en/catalog/charcoal-ledger | 1440  | 1.09       | 1440x1438 | 1440x1438 | 0            |
| charcoal-ledger | /en/catalog/charcoal-ledger | 1024  | 1.42       | 1024x1498 | 1024x1498 | 0            |
| charcoal-ledger | /en/catalog/charcoal-ledger | 768   | 1.54       | 768x2361  | 768x2361  | 0            |
| charcoal-ledger | /en/catalog/charcoal-ledger | 390   | 6.45       | 390x2104  | 390x2105  | -1           |
| concrete-paver  | /en/catalog/concrete-paver  | 1440  | 0.91       | 1440x1438 | 1440x1438 | 0            |
| concrete-paver  | /en/catalog/concrete-paver  | 1024  | 1.15       | 1024x1446 | 1024x1446 | 0            |
| concrete-paver  | /en/catalog/concrete-paver  | 768   | 1.25       | 768x2361  | 768x2361  | 0            |
| concrete-paver  | /en/catalog/concrete-paver  | 390   | 6.44       | 390x2126  | 390x2127  | -1           |
