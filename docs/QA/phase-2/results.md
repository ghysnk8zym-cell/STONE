Method: styleguide in en (tab bar in ru, the Figma labels are Russian); deviceScaleFactor 1, reduced motion, animations disabled, images loaded before each shot.
Shot: the single child of the [data-qa] stage (not the stage); for header, footer and tab bar the backdrop photo is hidden; the stage border is made transparent so it cannot leak into a margin.
Both images are padded to the larger size and flattened on the same ground colour (first opaque ancestor background); pixelmatch threshold 0.1, anti-aliasing ignored.
Notes: "same PNG as 1440" = viewport-independent component, the 390 row reuses the 1440 reference (count unique comparisons without them).

| id                             | width | mismatch % | impl WxH | figma WxH | notes                                                  |
| ------------------------------ | ----- | ---------- | -------- | --------- | ------------------------------------------------------ |
| button-pill-default            | 1440  | 10.54      | 175x40   | 98x40     |                                                        |
| button-pill-hover              | 1440  | 11.27      | 175x40   | 98x40     |                                                        |
| button-pill-focus              | 1440  | 14.46      | 180x40   | 100x40    |                                                        |
| button-pill-pressed            | 1440  | 11.56      | 175x40   | 98x40     |                                                        |
| button-pill-disabled           | 1440  | 7.23       | 176x40   | 98x40     |                                                        |
| button-primary-default         | 1440  | 23.28      | 225x80   | 169x80    |                                                        |
| button-primary-hover           | 1440  | 23.25      | 226x80   | 169x80    |                                                        |
| button-primary-focus           | 1440  | 28.68      | 199x54   | 147x58    |                                                        |
| button-primary-pressed         | 1440  | 32.14      | 194x48   | 137x48    |                                                        |
| button-primary-disabled        | 1440  | 30.94      | 194x48   | 137x48    |                                                        |
| button-light-default           | 1440  | 47.87      | 235x60   | 440x60    |                                                        |
| button-light-hover             | 1440  | 27.58      | 272x96   | 476x96    |                                                        |
| button-light-focus             | 1440  | 39.88      | 242x66   | 446x66    |                                                        |
| button-light-pressed           | 1440  | 48.02      | 236x60   | 440x60    |                                                        |
| button-outline-default         | 1440  | 9.31       | 177x46   | 128x46    |                                                        |
| button-graphite-default        | 1440  | 6.06       | 243x86   | 160x86    |                                                        |
| button-save-default            | 1440  | 9.23       | 191x44   | 99x44     |                                                        |
| icon-button-glass-menu         | 1440  | 0.00       | 46x46    | 46x46     |                                                        |
| icon-button-glass-close        | 1440  | 0.00       | 46x46    | 46x46     |                                                        |
| icon-button-glass-user-default | 1440  | 0.14       | 46x46    | 46x46     |                                                        |
| icon-button-glass-user-hover   | 1440  | 2.79       | 46x46    | 46x46     |                                                        |
| carousel-arrow-prev-default    | 1440  | 1.24       | 44x44    | 44x44     |                                                        |
| carousel-arrow-next-default    | 1440  | 1.24       | 44x44    | 44x44     |                                                        |
| social-button-tg-default       | 1440  | 1.19       | 44x44    | 44x44     |                                                        |
| social-button-tg-hover         | 1440  | 1.19       | 44x44    | 44x44     |                                                        |
| social-button-tg-focus         | 1440  | 13.49      | 48x44    | 48x44     |                                                        |
| social-button-tg-pressed       | 1440  | 1.24       | 44x44    | 44x44     |                                                        |
| social-button-tg-disabled      | 1440  | 0.52       | 44x44    | 44x44     |                                                        |
| text-field-dark-default        | 1440  | 5.74       | 288x88   | 440x60    |                                                        |
| text-field-dark-focus          | 1440  | 7.67       | 288x88   | 440x60    |                                                        |
| text-field-light-unit          | 1440  | 29.69      | 288x80   | 240x80    |                                                        |
| search-field-light-default     | 1440  | 2.54       | 288x52   | 480x52    |                                                        |
| search-field-graphite-default  | 1440  | 22.02      | 336x88   | 216x88    |                                                        |
| select-closed                  | 1440  | 3.06       | 288x80   | 240x80    |                                                        |
| badge-discount                 | 1440  | 10.22      | 65x28    | 63x28     |                                                        |
| product-card-default           | 1440  | 0.92       | 302x366  | 302x366   |                                                        |
| product-card-discount          | 1440  | 1.44       | 302x366  | 302x366   |                                                        |
| showcase-card-product-desktop  | 1440  | 58.96      | 353x316  | 353x316   |                                                        |
| showcase-card-product-mobile   | 1440  | 50.86      | 148x238  | 148x218   |                                                        |
| showcase-card-promo-desktop    | 1440  | 46.91      | 353x366  | 353x366   |                                                        |
| showcase-card-promo-mobile     | 1440  | 44.92      | 240x298  | 240x298   |                                                        |
| showcase-card-work-desktop     | 1440  | 4.44       | 353x310  | 353x308   |                                                        |
| showcase-card-work-mobile      | 1440  | 9.25       | 280x250  | 280x248   |                                                        |
| site-header-desktop            | 1440  | 9.59       | 1440x72  | 1440x72   |                                                        |
| nav-pill-default               | 1440  | 8.36       | 77x46    | 109x46    |                                                        |
| nav-pill-hover                 | 1440  | 8.86       | 77x46    | 109x46    |                                                        |
| nav-pill-focus                 | 1440  | 11.28      | 81x46    | 111x46    |                                                        |
| nav-pill-pressed               | 1440  | 10.57      | 77x46    | 109x46    |                                                        |
| nav-pill-current               | 1440  | 34.54      | 77x46    | 109x46    |                                                        |
| nav-pill-disabled              | 1440  | 4.99       | 78x46    | 109x46    |                                                        |
| site-footer                    | 1440  | 0.99       | 1440x154 | 1440x154  |                                                        |
| breadcrumb-default             | 1440  | 21.52      | 227x20   | 234x20    |                                                        |
| button-pill-default            | 390   | 12.13      | 175x44   | 98x40     | same PNG as 1440                                       |
| button-pill-hover              | 390   | 13.01      | 175x44   | 98x40     | same PNG as 1440                                       |
| button-pill-focus              | 390   | 13.74      | 179x44   | 100x40    | same PNG as 1440                                       |
| button-pill-pressed            | 390   | 13.56      | 175x44   | 98x40     | same PNG as 1440                                       |
| button-pill-disabled           | 390   | 6.82       | 175x44   | 98x40     | same PNG as 1440                                       |
| button-primary-default         | 390   | 38.83      | 225x80   | 169x80    | same PNG as 1440                                       |
| button-primary-hover           | 390   | 38.74      | 225x80   | 169x80    | same PNG as 1440                                       |
| button-primary-focus           | 390   | 28.27      | 199x54   | 147x58    | same PNG as 1440                                       |
| button-primary-pressed         | 390   | 32.19      | 193x48   | 137x48    | same PNG as 1440                                       |
| button-primary-disabled        | 390   | 30.95      | 193x48   | 137x48    | same PNG as 1440                                       |
| button-light-default           | 390   | 47.87      | 235x60   | 440x60    | same PNG as 1440                                       |
| button-light-hover             | 390   | 27.58      | 271x96   | 476x96    | same PNG as 1440                                       |
| button-light-focus             | 390   | 40.02      | 241x66   | 446x66    | same PNG as 1440                                       |
| button-light-pressed           | 390   | 47.80      | 235x60   | 440x60    | same PNG as 1440                                       |
| button-outline-default         | 390   | 9.31       | 177x46   | 128x46    | same PNG as 1440                                       |
| button-graphite-default        | 390   | 6.06       | 243x86   | 160x86    | same PNG as 1440                                       |
| button-save-default            | 390   | 9.23       | 191x44   | 99x44     | same PNG as 1440                                       |
| icon-button-glass-menu         | 390   | 0.00       | 46x46    | 46x46     | same PNG as 1440                                       |
| icon-button-glass-close        | 390   | 0.00       | 46x46    | 46x46     | same PNG as 1440                                       |
| icon-button-glass-user-default | 390   | 0.14       | 46x46    | 46x46     | same PNG as 1440                                       |
| icon-button-glass-user-hover   | 390   | 2.79       | 46x46    | 46x46     | same PNG as 1440                                       |
| carousel-arrow-prev-default    | 390   | 1.24       | 44x44    | 44x44     | same PNG as 1440                                       |
| carousel-arrow-next-default    | 390   | 1.24       | 44x44    | 44x44     | same PNG as 1440                                       |
| social-button-tg-default       | 390   | 1.19       | 44x44    | 44x44     | same PNG as 1440                                       |
| social-button-tg-hover         | 390   | 1.19       | 44x44    | 44x44     | same PNG as 1440                                       |
| social-button-tg-focus         | 390   | 13.49      | 48x44    | 48x44     | same PNG as 1440                                       |
| social-button-tg-pressed       | 390   | 1.24       | 44x44    | 44x44     | same PNG as 1440                                       |
| social-button-tg-disabled      | 390   | 0.52       | 44x44    | 44x44     | same PNG as 1440                                       |
| text-field-dark-default        | 390   | 5.74       | 288x88   | 440x60    | same PNG as 1440                                       |
| text-field-dark-focus          | 390   | 7.67       | 288x88   | 440x60    | same PNG as 1440                                       |
| text-field-light-unit          | 390   | 29.69      | 288x80   | 240x80    | same PNG as 1440                                       |
| search-field-light-default     | 390   | 2.10       | 288x52   | 358x52    |                                                        |
| search-field-graphite-default  | 390   | 22.02      | 336x88   | 216x88    | same PNG as 1440                                       |
| select-closed                  | 390   | 3.64       | 288x80   | 173x80    |                                                        |
| badge-discount                 | 390   | 10.22      | 65x28    | 63x28     | same PNG as 1440                                       |
| product-card-default           | 390   | 2.31       | 173x318  | 173x318   |                                                        |
| product-card-discount          | 390   | 2.89       | 173x340  | 173x340   |                                                        |
| showcase-card-product-desktop  | 390   | 56.50      | 340x316  | 353x316   | same PNG as 1440                                       |
| showcase-card-product-mobile   | 390   | 50.86      | 148x238  | 148x218   | same PNG as 1440                                       |
| showcase-card-promo-desktop    | 390   | 48.00      | 340x366  | 353x366   | same PNG as 1440                                       |
| showcase-card-promo-mobile     | 390   | 44.92      | 240x298  | 240x298   | same PNG as 1440                                       |
| showcase-card-work-desktop     | 390   | 21.44      | 340x310  | 353x308   | same PNG as 1440                                       |
| showcase-card-work-mobile      | 390   | 9.17       | 280x250  | 280x248   | same PNG as 1440                                       |
| site-header-compact            | 390   | 1.02       | 390x72   | 390x72    |                                                        |
| nav-pill-default               | 390   | 8.28       | 69x46    | 109x46    | same PNG as 1440                                       |
| nav-pill-hover                 | 390   | 9.81       | 70x46    | 109x46    | same PNG as 1440                                       |
| nav-pill-focus                 | 390   | 11.16      | 73x46    | 111x46    | same PNG as 1440                                       |
| nav-pill-pressed               | 390   | 9.55       | 69x46    | 109x46    | same PNG as 1440                                       |
| nav-pill-current               | 390   | 40.39      | 70x46    | 109x46    | same PNG as 1440                                       |
| nav-pill-disabled              | 390   | 4.69       | 70x46    | 109x46    | same PNG as 1440                                       |
| site-footer                    | 390   | 1.02       | 390x370  | 390x370   |                                                        |
| breadcrumb-default             | 390   | 21.52      | 227x20   | 234x20    | same PNG as 1440                                       |
| tab-bar-current-catalog        | 390   | 89.11      | 358x68   | 358x68    | reference unreliable — opaque baked render; see QA doc |

Not compared:

| id                                  | width | reason                                                                                                                                                         |
| ----------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| tokens-colors                       | 1440  | no Figma reference (styleguide documentation block, not a Figma component)                                                                                     |
| tokens-colors                       | 390   | no Figma reference (styleguide documentation block, not a Figma component)                                                                                     |
| tokens-type                         | 1440  | no Figma reference (styleguide documentation block, not a Figma component)                                                                                     |
| tokens-type                         | 390   | no Figma reference (styleguide documentation block, not a Figma component)                                                                                     |
| tokens-effects                      | 1440  | no Figma reference (styleguide documentation block, not a Figma component)                                                                                     |
| tokens-effects                      | 390   | no Figma reference (styleguide documentation block, not a Figma component)                                                                                     |
| button-light-disabled               | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-light-disabled               | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-outline-hover                | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-outline-hover                | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-outline-focus                | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-outline-focus                | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-outline-pressed              | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-outline-pressed              | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-outline-disabled             | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-outline-disabled             | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-graphite-hover               | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-graphite-hover               | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-graphite-focus               | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-graphite-focus               | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-graphite-pressed             | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-graphite-pressed             | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-graphite-disabled            | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-graphite-disabled            | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-save-hover                   | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-save-hover                   | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-save-focus                   | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-save-focus                   | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-save-pressed                 | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-save-pressed                 | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-save-disabled                | 1440  | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-save-disabled                | 390   | no Figma reference (Figma draws this button variant without that state)                                                                                        |
| button-primary-loading              | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| button-primary-loading              | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| button-primary-link                 | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| button-primary-link                 | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| button-long-label                   | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| button-long-label                   | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-glass-search            | 1440  | no Figma reference (Figma's Icon button draws Menu, Close, Back and User only)                                                                                 |
| icon-button-glass-search            | 390   | no Figma reference (Figma's Icon button draws Menu, Close, Back and User only)                                                                                 |
| icon-button-glass-bag               | 1440  | no Figma reference (Figma's Icon button draws Menu, Close, Back and User only)                                                                                 |
| icon-button-glass-bag               | 390   | no Figma reference (Figma's Icon button draws Menu, Close, Back and User only)                                                                                 |
| icon-button-glass-heart             | 1440  | no Figma reference (Figma's Icon button draws Menu, Close, Back and User only)                                                                                 |
| icon-button-glass-heart             | 390   | no Figma reference (Figma's Icon button draws Menu, Close, Back and User only)                                                                                 |
| icon-button-glass-user-focus        | 1440  | no Figma reference (Figma draws Focus, Pressed and Disabled for Menu, Close and Back, not for User)                                                            |
| icon-button-glass-user-focus        | 390   | no Figma reference (Figma draws Focus, Pressed and Disabled for Menu, Close and Back, not for User)                                                            |
| icon-button-glass-user-pressed      | 1440  | no Figma reference (Figma draws Focus, Pressed and Disabled for Menu, Close and Back, not for User)                                                            |
| icon-button-glass-user-pressed      | 390   | no Figma reference (Figma draws Focus, Pressed and Disabled for Menu, Close and Back, not for User)                                                            |
| icon-button-glass-user-disabled     | 1440  | no Figma reference (Figma draws Focus, Pressed and Disabled for Menu, Close and Back, not for User)                                                            |
| icon-button-glass-user-disabled     | 390   | no Figma reference (Figma draws Focus, Pressed and Disabled for Menu, Close and Back, not for User)                                                            |
| icon-button-light-heart-default     | 1440  | no usable Figma reference (the Heart node 713:520 renders as an empty 1x1 image through get_screenshot)                                                        |
| icon-button-light-heart-default     | 390   | no usable Figma reference (the Heart node 713:520 renders as an empty 1x1 image through get_screenshot)                                                        |
| icon-button-light-heart-hover       | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-light-heart-hover       | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-light-heart-focus       | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-light-heart-focus       | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-light-heart-pressed     | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-light-heart-pressed     | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-light-heart-disabled    | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-light-heart-disabled    | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-light-heart-favorite    | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| icon-button-light-heart-favorite    | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| carousel-arrow-prev-hover           | 1440  | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-prev-hover           | 390   | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-prev-focus           | 1440  | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-prev-focus           | 390   | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-prev-pressed         | 1440  | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-prev-pressed         | 390   | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-prev-disabled        | 1440  | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-prev-disabled        | 390   | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-next-hover           | 1440  | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-next-hover           | 390   | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-next-focus           | 1440  | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-next-focus           | 390   | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-next-pressed         | 1440  | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-next-pressed         | 390   | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-next-disabled        | 1440  | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| carousel-arrow-next-disabled        | 390   | no Figma reference (Figma draws only the resting Prev and Next arrows)                                                                                         |
| social-button-vk-default            | 1440  | no standalone Figma node (drawn only as nested instances inside the footer, which get_screenshot cannot address; covered by site-footer)                       |
| social-button-vk-default            | 390   | no standalone Figma node (drawn only as nested instances inside the footer, which get_screenshot cannot address; covered by site-footer)                       |
| social-button-ig-default            | 1440  | no standalone Figma node (drawn only as nested instances inside the footer, which get_screenshot cannot address; covered by site-footer)                       |
| social-button-ig-default            | 390   | no standalone Figma node (drawn only as nested instances inside the footer, which get_screenshot cannot address; covered by site-footer)                       |
| social-button-wa-default            | 1440  | no standalone Figma node (drawn only as nested instances inside the footer, which get_screenshot cannot address; covered by site-footer)                       |
| social-button-wa-default            | 390   | no standalone Figma node (drawn only as nested instances inside the footer, which get_screenshot cannot address; covered by site-footer)                       |
| text-field-dark-error               | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| text-field-dark-error               | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| text-field-dark-disabled            | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| text-field-dark-disabled            | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| text-field-light-default            | 1440  | no Figma reference (Product/Field is drawn once, with the unit cell: compared as text-field-light-unit)                                                        |
| text-field-light-default            | 390   | no Figma reference (Product/Field is drawn once, with the unit cell: compared as text-field-light-unit)                                                        |
| text-field-light-focus              | 1440  | no Figma reference (Product/Field is drawn once, with the unit cell: compared as text-field-light-unit)                                                        |
| text-field-light-focus              | 390   | no Figma reference (Product/Field is drawn once, with the unit cell: compared as text-field-light-unit)                                                        |
| text-field-light-error              | 1440  | no Figma reference (Product/Field is drawn once, with the unit cell: compared as text-field-light-unit)                                                        |
| text-field-light-error              | 390   | no Figma reference (Product/Field is drawn once, with the unit cell: compared as text-field-light-unit)                                                        |
| text-field-light-disabled           | 1440  | no Figma reference (Product/Field is drawn once, with the unit cell: compared as text-field-light-unit)                                                        |
| text-field-light-disabled           | 390   | no Figma reference (Product/Field is drawn once, with the unit cell: compared as text-field-light-unit)                                                        |
| search-field-light-hover            | 1440  | no Figma reference (the Catalog Search field is drawn in one state)                                                                                            |
| search-field-light-hover            | 390   | no Figma reference (the Catalog Search field is drawn in one state)                                                                                            |
| search-field-light-focus            | 1440  | no Figma reference (the Catalog Search field is drawn in one state)                                                                                            |
| search-field-light-focus            | 390   | no Figma reference (the Catalog Search field is drawn in one state)                                                                                            |
| search-field-light-disabled         | 1440  | no Figma reference (the Catalog Search field is drawn in one state)                                                                                            |
| search-field-light-disabled         | 390   | no Figma reference (the Catalog Search field is drawn in one state)                                                                                            |
| select-hover                        | 1440  | no Figma reference for the implemented look (drawn only on the stale master Field/Select 338:507, a white glass pill that Task 6 deliberately does not follow) |
| select-hover                        | 390   | no Figma reference for the implemented look (drawn only on the stale master Field/Select 338:507, a white glass pill that Task 6 deliberately does not follow) |
| select-focus                        | 1440  | no Figma reference for the implemented look (drawn only on the stale master Field/Select 338:507, a white glass pill that Task 6 deliberately does not follow) |
| select-focus                        | 390   | no Figma reference for the implemented look (drawn only on the stale master Field/Select 338:507, a white glass pill that Task 6 deliberately does not follow) |
| select-open                         | 1440  | no Figma reference for the implemented look (drawn only on the stale master Field/Select 338:507, a white glass pill that Task 6 deliberately does not follow) |
| select-open                         | 390   | no Figma reference for the implemented look (drawn only on the stale master Field/Select 338:507, a white glass pill that Task 6 deliberately does not follow) |
| select-disabled                     | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| select-disabled                     | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| product-card-hover                  | 1440  | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| product-card-hover                  | 390   | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| product-card-focus                  | 1440  | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| product-card-focus                  | 390   | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| product-card-pressed                | 1440  | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| product-card-pressed                | 390   | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| product-card-favorite               | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| product-card-favorite               | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| product-card-no-image               | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| product-card-no-image               | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| product-card-long-name              | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| product-card-long-name              | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| showcase-card-promo-desktop-hover   | 1440  | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-promo-desktop-hover   | 390   | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-promo-desktop-focus   | 1440  | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-promo-desktop-focus   | 390   | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-promo-desktop-pressed | 1440  | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-promo-desktop-pressed | 390   | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-work-desktop-hover    | 1440  | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-work-desktop-hover    | 390   | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-work-desktop-focus    | 1440  | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-work-desktop-focus    | 390   | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-work-desktop-pressed  | 1440  | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| showcase-card-work-desktop-pressed  | 390   | no Figma reference (the live cards draw no hover, focus or pressed state)                                                                                      |
| site-header-desktop                 | 390   | hidden at this width (visible from 1280 px)                                                                                                                    |
| site-header-compact                 | 1440  | hidden at this width (visible below 1280 px)                                                                                                                   |
| mobile-menu-trigger                 | 1440  | not a component frame: a button wrapper (its visual is icon-button-glass-menu, compared separately)                                                            |
| mobile-menu-trigger                 | 390   | not a component frame: a button wrapper (its visual is icon-button-glass-menu, compared separately)                                                            |
| nav-pill-long-label                 | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| nav-pill-long-label                 | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| language-switch                     | 1440  | no Figma reference (Figma draws no language switch)                                                                                                            |
| language-switch                     | 390   | no Figma reference (Figma draws no language switch)                                                                                                            |
| tab-bar-current-catalog             | 1440  | hidden at this width (the tab bar is visible below 768 px)                                                                                                     |
| tab-bar-none                        | 1440  | hidden at this width (the tab bar is visible below 768 px)                                                                                                     |
| tab-bar-none                        | 390   | no Figma reference captured for a tab bar without a current tab (inert visual copy)                                                                            |
| breadcrumb-long                     | 1440  | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| breadcrumb-long                     | 390   | no Figma reference (implementer-chosen state or variant: Figma does not draw it)                                                                               |
| approval-fonts                      | 1440  | no Figma reference (owner approval block, not a component)                                                                                                     |
| approval-fonts                      | 390   | no Figma reference (owner approval block, not a component)                                                                                                     |
| approval-language-switch            | 1440  | no Figma reference (owner approval block, not a component)                                                                                                     |
| approval-language-switch            | 390   | no Figma reference (owner approval block, not a component)                                                                                                     |
| approval-loading-button             | 1440  | no Figma reference (owner approval block, not a component)                                                                                                     |
| approval-loading-button             | 390   | no Figma reference (owner approval block, not a component)                                                                                                     |
| approval-glass                      | 1440  | no Figma reference (owner approval block, not a component)                                                                                                     |
| approval-glass                      | 390   | no Figma reference (owner approval block, not a component)                                                                                                     |
| approval-checklist                  | 1440  | no Figma reference (owner approval block, not a component)                                                                                                     |
| approval-checklist                  | 390   | no Figma reference (owner approval block, not a component)                                                                                                     |
