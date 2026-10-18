Method: full-page screenshots of /en<route> in Playwright Chromium, viewport width = Figma frame width and height 900, deviceScaleFactor 1, reduced motion, animations disabled; the page is scrolled once so lazy images load and every image is decoded before the shot.
Reference: Figma get_screenshot of the matching screen (scale 1, original size). Both images are padded to the larger size and flattened on the page background colour; pixelmatch threshold 0.1, anti-aliasing ignored.
Notes: the height delta is implementation height minus Figma height; a non-zero delta shifts everything below it, so a high mismatch is expected and must be read from the triplet ("raw % is not pass/fail").

| id                | route                          | width | mismatch % | impl WxH  | figma WxH | height delta |
| ----------------- | ------------------------------ | ----- | ---------- | --------- | --------- | ------------ |
| sign-up           | /en/sign-up                    | 1440  | 1.26       | 1440x900  | 1440x900  | 0            |
| sign-up           | /en/sign-up                    | 390   | 5.34       | 390x844   | 390x844   | 0            |
| sign-in           | /en/sign-in                    | 1440  | 1.31       | 1440x900  | 1440x900  | 0            |
| sign-in           | /en/sign-in                    | 390   | 5.29       | 390x844   | 390x844   | 0            |
| sign-out          | /en/sign-out (client)          | 1440  | 15.82      | 1440x1054 | 1440x900  | +154         |
| sign-out          | /en/sign-out (client)          | 390   | 39.81      | 390x1314  | 390x844   | +470         |
| account           | /en/account (client)           | 1440  | 5.21       | 1440x1320 | 1440x1324 | -4           |
| account           | /en/account (client)           | 390   | 24.25      | 390x2103  | 390x1995  | +108         |
| account-orders    | /en/account/orders (client)    | 1440  | 39.93      | 1440x900  | 1440x1244 | -344         |
| account-orders    | /en/account/orders (client)    | 390   | 50.69      | 390x1248  | 390x1652  | -404         |
| account-favorites | /en/account/favorites (client) | 1440  | 37.50      | 1440x900  | 1440x1210 | -310         |
| account-favorites | /en/account/favorites (client) | 390   | 36.16      | 390x1332  | 390x1590  | -258         |
| account-profile   | /en/account/profile (client)   | 1440  | 36.55      | 1440x1144 | 1440x861  | +283         |
| account-profile   | /en/account/profile (client)   | 390   | 36.86      | 390x1462  | 390x1203  | +259         |
| admin-overview    | /en/admin (admin)              | 1440  | 28.86      | 1440x900  | 1440x1189 | -289         |
| admin-overview    | /en/admin (admin)              | 1024  | 34.56      | 1024x1255 | 1024x1756 | -501         |
| admin-products    | /en/admin/products (admin)     | 1440  | 8.04       | 1440x2244 | 1440x2422 | -178         |
| admin-products    | /en/admin/products (admin)     | 1024  | 16.74      | 1024x3158 | 1024x3344 | -186         |
| admin-add-product | /en/admin/products/new (admin) | 1440  | 37.50      | 1440x1687 | 1440x1118 | +569         |
| admin-add-product | /en/admin/products/new (admin) | 1024  | 38.92      | 1024x2802 | 1024x1913 | +889         |
| admin-orders      | /en/admin/orders (admin)       | 1440  | 10.25      | 1440x1003 | 1440x1080 | -77          |
| admin-orders      | /en/admin/orders (admin)       | 1024  | 21.39      | 1024x1418 | 1024x1714 | -296         |
