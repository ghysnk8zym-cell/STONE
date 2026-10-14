Method: full-page screenshots of /en<route> in Playwright Chromium, viewport width = Figma frame width and height 900, deviceScaleFactor 1, reduced motion, animations disabled; the page is scrolled once so lazy images load and every image is decoded before the shot.
Reference: Figma get_screenshot of the matching screen (scale 1, original size). Both images are padded to the larger size and flattened on the page background colour; pixelmatch threshold 0.1, anti-aliasing ignored.
Notes: the height delta is implementation height minus Figma height; a non-zero delta shifts everything below it, so a high mismatch is expected and must be read from the triplet ("raw % is not pass/fail").

| id              | route                       | width | mismatch % | impl WxH  | figma WxH | height delta |
| --------------- | --------------------------- | ----- | ---------- | --------- | --------- | ------------ |
| home            | /en                         | 1440  | 12.78      | 1440x2210 | 1440x2208 | +2           |
| home            | /en                         | 1024  | 19.29      | 1024x2050 | 1024x2048 | +2           |
| home            | /en                         | 768   | 25.81      | 768x2220  | 768x2219  | +1           |
| home            | /en                         | 390   | 10.67      | 390x1672  | 390x1702  | -30          |
| catalog         | /en/catalog                 | 1440  | 19.03      | 1440x2074 | 1440x2054 | +20          |
| catalog         | /en/catalog                 | 1024  | 21.39      | 1024x2432 | 1024x2412 | +20          |
| catalog         | /en/catalog                 | 768   | 21.53      | 768x3428  | 768x3408  | +20          |
| catalog         | /en/catalog                 | 390   | 21.38      | 390x3380  | 390x3384  | -4           |
| black-marble    | /en/catalog/black-marble    | 1440  | 0.86       | 1440x1438 | 1440x1438 | 0            |
| black-marble    | /en/catalog/black-marble    | 1024  | 1.26       | 1024x1446 | 1024x1446 | 0            |
| black-marble    | /en/catalog/black-marble    | 768   | 4.24       | 768x2353  | 768x2361  | -8           |
| black-marble    | /en/catalog/black-marble    | 390   | 6.94       | 390x2080  | 390x2105  | -25          |
| charcoal-ledger | /en/catalog/charcoal-ledger | 1440  | 1.09       | 1440x1438 | 1440x1438 | 0            |
| charcoal-ledger | /en/catalog/charcoal-ledger | 1024  | 1.42       | 1024x1498 | 1024x1498 | 0            |
| charcoal-ledger | /en/catalog/charcoal-ledger | 768   | 4.38       | 768x2353  | 768x2361  | -8           |
| charcoal-ledger | /en/catalog/charcoal-ledger | 390   | 6.65       | 390x2080  | 390x2105  | -25          |
| concrete-paver  | /en/catalog/concrete-paver  | 1440  | 0.91       | 1440x1438 | 1440x1438 | 0            |
| concrete-paver  | /en/catalog/concrete-paver  | 1024  | 1.15       | 1024x1446 | 1024x1446 | 0            |
| concrete-paver  | /en/catalog/concrete-paver  | 768   | 4.10       | 768x2353  | 768x2361  | -8           |
| concrete-paver  | /en/catalog/concrete-paver  | 390   | 6.64       | 390x2102  | 390x2127  | -25          |
