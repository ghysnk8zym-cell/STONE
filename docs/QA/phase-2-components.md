# Phase 2 design system: Figma visual comparison notes

Branch `feat/phase-2-design-system`. Source of truth: Figma `1vEGuD9cYYFNynyByUGHwF` (read only).
Raw output of the run: [`phase-2/results.md`](phase-2/results.md). Only a curated set of triplets is committed (see "Evidence").

## Method

- `pnpm qa:visual` (`scripts/visual-compare.mjs`) screenshots each `[data-qa=<id>]` block of `/<locale>/_styleguide`
  with Playwright Chromium at viewport 1440 and 390 (deviceScaleFactor 1, reduced motion, animations off, images loaded).
- Reference images are Figma `get_screenshot` exports in `tests/visual/figma/` (map: `references.json`, 59 PNG files).
- Implementation and reference are padded to the larger size, flattened on the same ground colour, and compared
  with pixelmatch (threshold 0.1, anti-aliasing ignored). Output per id and width: `-impl`, `-figma`, `-diff` PNGs.
- A raw mismatch percentage is NOT a pass/fail number. Figma frames often carry other label text, a wider container,
  or a different photo than the styleguide example. Every row above 5 % was looked at (impl | figma | diff side by
  side) and classified. Fill colours were additionally sampled from both images: pill 44,46,49 vs 45,47,49;
  current 86,87,89 vs 86,87,90; light 242,243,245 both; primary, outline, graphite and save equal within one level.

## Coverage

- 105 comparison rows: 52 at 1440 and 53 at 390.
- 59 unique comparisons (59 reference PNGs): the 52 at 1440 plus 7 at 390 that have their own reference
  (`search-field-light-default`, `select-closed`, `product-card-default`, `product-card-discount`,
  `site-header-compact`, `site-footer`, `tab-bar-current-catalog`).
- 46 further 390 rows reuse the 1440 reference ("same PNG as 1440"): the component is viewport independent, only the
  implementation capture is repeated. The earlier ledger wording "52 unique plus 53 repeats" was wrong; the counts above are
  taken from `results.md`.
- 157 id/width pairs are not compared, each with a reason in `results.md`: no Figma reference for the state (Figma
  draws only some states), implementer-chosen states (loading, error, favourite, long labels), hidden at that
  width, documentation or approval blocks.
- `select-hover`, `select-focus`, `select-open` are drawn in Figma only on the outdated master `Field/Select` (338:507,
  a white glass pill that Task 6 deliberately does not follow), so they have no valid reference.
- The light heart icon button (Figma node 713:520) is unusable: `get_screenshot` returns an empty 1x1 image.

## Results

Status "Accepted" means the difference is explained by the class shown and no component defect was found.

| Component (data-qa)            | 1440 % | 390 % | Classification                                                                              | Status                         |
| ------------------------------ | ------ | ----- | ------------------------------------------------------------------------------------------- | ------------------------------ |
| button-pill-default            | 10.54  | 12.13 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-pill-hover              | 11.27  | 13.01 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-pill-focus              | 14.46  | 13.74 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-pill-pressed            | 11.56  | 13.56 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-pill-disabled           | 7.23   | 6.82  | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-primary-default         | 23.28  | 38.83 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-primary-hover           | 23.25  | 38.74 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-primary-focus           | 28.68  | 28.27 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-primary-pressed         | 32.14  | 32.19 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-primary-disabled        | 30.94  | 30.95 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-light-default           | 47.87  | 47.87 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-light-hover             | 27.58  | 27.58 | real defect D1 + copy / reference frame (Figma label and container width differ)            | Defect (D1)                    |
| button-light-focus             | 39.88  | 40.02 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-light-pressed           | 48.02  | 47.80 | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-outline-default         | 9.31   | 9.31  | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-graphite-default        | 6.06   | 6.06  | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| button-save-default            | 9.23   | 9.23  | copy / reference frame (Figma label and container width differ); fills match within 1 level | Accepted                       |
| icon-button-glass-menu         | 0.00   | 0.00  | font rendering only                                                                         | Accepted                       |
| icon-button-glass-close        | 0.00   | 0.00  | font rendering only                                                                         | Accepted                       |
| icon-button-glass-user-default | 0.14   | 0.14  | font rendering only                                                                         | Accepted                       |
| icon-button-glass-user-hover   | 2.79   | 2.79  | glass approximation                                                                         | Accepted                       |
| carousel-arrow-prev-default    | 1.24   | 1.24  | font rendering only                                                                         | Accepted                       |
| carousel-arrow-next-default    | 1.24   | 1.24  | font rendering only                                                                         | Accepted                       |
| social-button-tg-default       | 1.19   | 1.19  | font rendering only                                                                         | Accepted                       |
| social-button-tg-hover         | 1.19   | 1.19  | font rendering only                                                                         | Accepted                       |
| social-button-tg-focus         | 13.49  | 13.49 | stroke antialiasing (same colour, 2px ring)                                                 | Accepted                       |
| social-button-tg-pressed       | 1.24   | 1.24  | font rendering only                                                                         | Accepted                       |
| social-button-tg-disabled      | 0.52   | 0.52  | font rendering only                                                                         | Accepted                       |
| text-field-dark-default        | 5.74   | 5.74  | copy / reference frame (label, value and width differ)                                      | Accepted                       |
| text-field-dark-focus          | 7.67   | 7.67  | copy / reference frame (label, value and width differ)                                      | Accepted                       |
| text-field-light-unit          | 29.69  | 29.69 | copy / reference frame (label, value and width differ)                                      | Accepted                       |
| search-field-light-default     | 2.54   | 2.10  | font rendering only                                                                         | Accepted                       |
| search-field-graphite-default  | 22.02  | 22.02 | composition: Figma node is the popover panel (no leading icon, 168x52)                      | Owner ruling (O1)              |
| select-closed                  | 3.06   | 3.64  | copy (Marble vs All materials), container width                                             | Accepted                       |
| badge-discount                 | 10.22  | 10.22 | glyph / copy (U+2212 minus vs Figma text), 2 px width                                       | Accepted                       |
| product-card-default           | 0.92   | 2.31  | font rendering only                                                                         | Accepted                       |
| product-card-discount          | 1.44   | 2.89  | font rendering only                                                                         | Accepted                       |
| showcase-card-product-desktop  | 58.96  | 56.50 | photo and copy differ (placeholder image vs Figma photo)                                    | Accepted                       |
| showcase-card-product-mobile   | 50.86  | 50.86 | photo and copy differ (placeholder image vs Figma photo)                                    | Accepted                       |
| showcase-card-promo-desktop    | 46.91  | 48.00 | photo and copy differ (placeholder image vs Figma photo)                                    | Accepted                       |
| showcase-card-promo-mobile     | 44.92  | 44.92 | photo and copy differ (placeholder image vs Figma photo)                                    | Accepted                       |
| showcase-card-work-desktop     | 4.44   | 21.44 | glass approximation + copy                                                                  | Accepted                       |
| showcase-card-work-mobile      | 9.25   | 9.17  | glass approximation + copy                                                                  | Accepted                       |
| site-header-desktop            | 9.59   | n/a   | state of the demo (current pill) + language switch not in Figma + glass                     | Accepted                       |
| nav-pill-default               | 8.36   | 8.28  | copy / reference frame (Figma label and container width differ)                             | Accepted                       |
| nav-pill-hover                 | 8.86   | 9.81  | copy / reference frame (Figma label and container width differ)                             | Accepted                       |
| nav-pill-focus                 | 11.28  | 11.16 | copy / reference frame (Figma label and container width differ)                             | Accepted                       |
| nav-pill-pressed               | 10.57  | 9.55  | copy / reference frame (Figma label and container width differ)                             | Accepted                       |
| nav-pill-current               | 34.54  | 40.39 | copy / reference frame (Figma label and container width differ)                             | Accepted                       |
| nav-pill-disabled              | 4.99   | 4.69  | copy / reference frame (Figma label and container width differ)                             | Accepted                       |
| site-footer                    | 0.99   | 1.02  | font rendering only                                                                         | Accepted                       |
| breadcrumb-default             | 21.52  | 21.52 | copy (different trail and separators)                                                       | Accepted                       |
| site-header-compact            | n/a    | 1.02  | font rendering only                                                                         | Accepted                       |
| tab-bar-current-catalog        | n/a    | 89.11 | reference unreliable (baked flat render of a translucent fill)                              | Accepted (see tab bar section) |

## Classification summary

| Class                      | Meaning                                                                                      | Components                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Font rendering             | Inter/Lusitana glyph antialiasing differs between Figma's renderer and Chromium              | icon buttons, carousel arrows, social buttons, search field light, product cards, header compact, footer |
| Copy or photo differs      | The styleguide example label, value or photo is not the one in the Figma frame               | buttons (all variants), nav pills, text fields, select, badge, showcase cards, breadcrumb                |
| Reference frame / geometry | Figma frame is a stretched container or a wider instance (for example Light button 440 wide) | button-light, button-pill, button-primary, text fields, select                                           |
| Glass approximation        | CSS `backdrop-filter` plus inset edge approximates D020 glass                                | showcase work card, header, icon-button user hover                                                       |
| Real defect                | Value in code differs from Figma                                                             | `button-light-hover` (D1)                                                                                |
| Reference unreliable       | Figma render cannot be used as a pixel reference                                             | tab bar                                                                                                  |

Examples (full triplets in "Evidence"): the dark pill, primary and light buttons differ in label and container width
only; the product card is 0.92 % (text antialiasing, heart); the showcase promo card is 46.9 % because Figma shows a
different photo.

## Tab bar (`tab-bar-current-catalog`, 89.11 %)

Conclusion: the reference is unreliable for pixel comparison, and the implementation matches Figma's tokens. No defect.

Evidence:

- `get_design_context` on the 390 screen instance `922:26785` (Nav / Tab bar) returns: radius 20, padding 12/8, 1 px
  border `border/glass` rgba(255,255,255,0.12), `backdrop-blur 12px` (effect style "Blur/Glass background 24",
  radius 24 = CSS 12 px), and fill `surface/header` = rgba(18,20,22,0.62). Labels 12/16 Inter, active
  `text/primary`, others `text/secondary` rgba(255,255,255,0.72). The component description on `712:499` says
  "dark glass, surface/header + Blur/Glass background 24".
- `src/components/navigation/TabBar.tsx` uses `glass-blur border-glass bg-surface-header`, radius 20, 358x68: the same tokens.
- The reference PNG is an opaque flat grey (103,103,103). A 62 % opaque (18,20,22) fill over a white backdrop gives
  about 0.62*18 + 0.38*255 = 108, matching the baked grey: Figma rendered the translucent fill over a light page,
  while the styleguide shows it over the dark stage (photo hidden). The two cannot match pixel for pixel regardless of
  implementation. Icons, labels, spacing and active state (colour only) agree visually in the triplet.
- Remaining owner check: the bar over a real photo on a real page (Phase 3).

## Known deviations (accepted, not defects)

- Font rendering: Figma and Chromium antialias text differently; thin diff outlines around every glyph.
- Glass: `backdrop-filter` blur plus the inset 1 px edge (`border-glass`) are a CSS approximation of D020 GLASS. Values come
  from the spec text, not a Figma capture.
- Loading spinner on Button: not drawn in Figma, implementer-chosen.
- Language switch: Figma draws none; placement is header at 1280 and up, mobile menu below.
- Mobile menu panel: not drawn in Figma; built from tokens (opaque `bg-surface-page`, Nav/Menu entries).
- Cyrillic: Lusitana has no Cyrillic, so ru text in Lusitana roles renders in PT Serif (ADR-003). Needs a visual check in a real browser.
- Tab bar reference: see the section above.
- Motion timings (hover 180 ms, ripple 600 ms, `cubic-bezier(0.2,0,0,1)`, ring 8 to 300 px): defaults; Figma motion
  context returns nothing for these components.

## Defects (for the owner or lead to rule on; nothing was changed)

| ID  | Component           | data-qa              | Figma node | Expected                                       | Actual                                          | Cause                                                                                                                                                                                                                                                                                               |
| --- | ------------------- | -------------------- | ---------- | ---------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Button Light, Hover | `button-light-hover` | 430:473    | fill #FFFFFF with shadow 0 6 9 rgba(0,0,0,.25) | fill rgb(242,243,245) (#F2F3F5), shadow correct | `src/components/buttons/Button.tsx` line 86 uses `hov:bg-white`; the theme resets colours (`--color-*: initial` in `globals.css`), so Tailwind `bg-white` is not generated and the utility is missing from the built CSS. Fix: `hov:bg-[#ffffff]`. It is the only `*-white/black` utility in `src`. |

Pressed (#dbdee3) and default (#f2f3f5) match Figma.

Not defects but need a ruling:

| ID  | Item                                   | Detail                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1  | `search-field-graphite-default` (22 %) | Figma node 971:28941 is the Search panel inside Search/Pill Tone=Graphite Open: bg `stone/catalog-card`, 1 px `stone/catalog-line`, radius 12, padding 16, shadow 0 8 24 rgba(0,0,0,.18), text only, no leading icon. The styleguide shows the Catalog search field with a leading icon on a graphite ground. Decide whether the graphite search surface should be the icon-less panel. |
| O2  | `site-header-desktop`                  | Figma draws no current pill and no language switch; the demo shows "Create Your Stone" current and the switch. Expected given the approval items below.                                                                                                                                                                                                                                 |

## Owner approval checklist

Everything below was decided by the implementer (Figma is silent or inconsistent). Tick or overrule each.

- [ ] Motion timings are defaults (hover 180 ms, ripple 600 ms, ease `cubic-bezier(0.2,0,0,1)`, ring 8 to 300 px); Figma has no motion data for Nav/Pill/Button/Pill.
- [ ] Glass approximation (glass-card, glass-header, glass-panel: values from the spec text, inset 0 1px 0 `border-glass` edge) and the extra token `--effect-glass-background-blur` (Figma radius 24 = CSS 12 px).
- [ ] Button states invented for Outline, Save and Graphite (hover, pressed), 45 % disabled opacity for Light, Outline, Graphite and Save, and the Graphite ripple (white 10 %, likely invisible on light surfaces).
- [ ] Loading spinner on submit Button (`aria-busy`, focus kept): not in Figma.
- [ ] Primary button focus: Figma 338:523 draws a 2px white border, which is weak on white and light surfaces. Keep as Figma or raise a Figma change.
- [ ] Icon buttons: light heart hover, focus, pressed and liked states chosen by the implementer; glass heart glyph 22 px assumed; liked state only sets `aria-pressed` (no visual change); Carousel arrow hover, focus, pressed and disabled reuse the Icon-button glass states (Figma draws resting only).
- [ ] Form fields: focus-ring colours differ from #9DB4C0 (light tones ink-primary #1f2226 from Field/Select Focus 338:501; dark TextField white 90 %); error colours #f0a8a0 and #a3362d; disabled 45 %; hover and focus colours; dark-tone label; list row hover and selected look; "No options" text; no password eye toggle.
- [ ] Select look follows the live catalog field, not the stale master 338:507 (white glass pill).
- [ ] Product card: hover and pressed shadows come from the stale master 337:556, hover border is implementer-chosen; `sizes` 30vw for 768 to 1439 assumed; heart is always an `aria-pressed` button even without a handler (Phase 3 wires it).
- [ ] Header breakpoint: Full at 1280 and up, Compact below. Figma screens draw Compact at 1024, 768, 390, 360 and Full only at 1440, but the Header description says "Full from 1024". Confirm 1280 or 1024.
- [ ] Mobile menu panel is not in Figma (built from tokens).
- [ ] Language switch placement (header at 1280 and up, menu below), underline on the current language, Current look kept on hover; account IconButton "Current" is `aria-current` only (no visual cue).
- [ ] Footer and social links without destinations render as disabled non-link items (Figma and route map give none): keep disabled or omit before Phase 3.
- [ ] Tab bar: `current` optional (Figma Product screen has none); "Sign in" tab goes to `/account` until a sign-in screen exists; active state is colour only (as Figma); needs bottom padding (`pb-tabbar`, docs/ARCHITECTURE.md).
- [ ] Breadcrumb focus ring uses ink-primary (accent ring is about 1.9:1 on the light page); 44 px hit area via pseudo-element.
- [ ] Footer copyright "© 2026" is fixed in messages (stale in 2027).
- [ ] Russian strings: only the Figma tab labels are exact. All other ru strings are drafts: Создать свой камень, Корзина, Личный кабинет, menu, language, nav and footer labels, "Хлебные крошки", footer copy.
- [ ] Cyrillic PT Serif in Lusitana roles: eyeball it in a real browser in the styleguide.
- [ ] Low-resolution assets: 7 catalog images and Showcase Work exist only as 390 px WebP (sources 415 to 736 px, never upscaled), soft on DPR 2 desktop cards. Provide higher-resolution sources or accept. Layout=1280 hero (296:515) is not exported.
- [ ] Icons are the transparent SVGs from `get_design_context` (public/icons), not the opaque `download_assets` exports.
- [ ] Long button and nav-pill labels truncate with an ellipsis (single line, fixed height as Figma), accessible name stays full.
- [ ] Disabled link renders `<span role="link" aria-disabled>` without href.
- [ ] Styleguide stays reachable on the Cloudflare test deployment (`APP_ENV=preview`); set `APP_ENV=production` on any real production deploy (needs a DEPLOYMENT.md note).
- [ ] Defect D1 (Light hover fill) and question O1 (graphite search panel): fix or accept.

## Evidence

Curated triplets, each `impl | figma | diff` (red = differing pixels). 19 of the 59 unique comparisons; the full
set is regenerated by `pnpm qa:visual` (output is git-ignored except these).

| Class                | Component                            | Impl                                                        | Figma                                                         | Diff                                                        |
| -------------------- | ------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Copy / frame         | button-pill-default (1440)           | [impl](phase-2/button-pill-default-1440-impl.png)           | [figma](phase-2/button-pill-default-1440-figma.png)           | [diff](phase-2/button-pill-default-1440-diff.png)           |
| Copy / frame         | button-primary-default (1440)        | [impl](phase-2/button-primary-default-1440-impl.png)        | [figma](phase-2/button-primary-default-1440-figma.png)        | [diff](phase-2/button-primary-default-1440-diff.png)        |
| Copy / frame         | button-light-default (1440)          | [impl](phase-2/button-light-default-1440-impl.png)          | [figma](phase-2/button-light-default-1440-figma.png)          | [diff](phase-2/button-light-default-1440-diff.png)          |
| Real defect D1       | button-light-hover (1440)            | [impl](phase-2/button-light-hover-1440-impl.png)            | [figma](phase-2/button-light-hover-1440-figma.png)            | [diff](phase-2/button-light-hover-1440-diff.png)            |
| Copy / frame         | button-graphite-default (1440)       | [impl](phase-2/button-graphite-default-1440-impl.png)       | [figma](phase-2/button-graphite-default-1440-figma.png)       | [diff](phase-2/button-graphite-default-1440-diff.png)       |
| Match                | icon-button-glass-menu (1440)        | [impl](phase-2/icon-button-glass-menu-1440-impl.png)        | [figma](phase-2/icon-button-glass-menu-1440-figma.png)        | [diff](phase-2/icon-button-glass-menu-1440-diff.png)        |
| Glass                | icon-button-glass-user-hover (1440)  | [impl](phase-2/icon-button-glass-user-hover-1440-impl.png)  | [figma](phase-2/icon-button-glass-user-hover-1440-figma.png)  | [diff](phase-2/icon-button-glass-user-hover-1440-diff.png)  |
| Font rendering       | carousel-arrow-prev-default (1440)   | [impl](phase-2/carousel-arrow-prev-default-1440-impl.png)   | [figma](phase-2/carousel-arrow-prev-default-1440-figma.png)   | [diff](phase-2/carousel-arrow-prev-default-1440-diff.png)   |
| Stroke AA            | social-button-tg-focus (1440)        | [impl](phase-2/social-button-tg-focus-1440-impl.png)        | [figma](phase-2/social-button-tg-focus-1440-figma.png)        | [diff](phase-2/social-button-tg-focus-1440-diff.png)        |
| Copy / frame         | text-field-light-unit (1440)         | [impl](phase-2/text-field-light-unit-1440-impl.png)         | [figma](phase-2/text-field-light-unit-1440-figma.png)         | [diff](phase-2/text-field-light-unit-1440-diff.png)         |
| Owner ruling O1      | search-field-graphite-default (1440) | [impl](phase-2/search-field-graphite-default-1440-impl.png) | [figma](phase-2/search-field-graphite-default-1440-figma.png) | [diff](phase-2/search-field-graphite-default-1440-diff.png) |
| Copy / frame         | select-closed (1440)                 | [impl](phase-2/select-closed-1440-impl.png)                 | [figma](phase-2/select-closed-1440-figma.png)                 | [diff](phase-2/select-closed-1440-diff.png)                 |
| Font rendering       | product-card-default (1440)          | [impl](phase-2/product-card-default-1440-impl.png)          | [figma](phase-2/product-card-default-1440-figma.png)          | [diff](phase-2/product-card-default-1440-diff.png)          |
| Photo differs        | showcase-card-promo-desktop (1440)   | [impl](phase-2/showcase-card-promo-desktop-1440-impl.png)   | [figma](phase-2/showcase-card-promo-desktop-1440-figma.png)   | [diff](phase-2/showcase-card-promo-desktop-1440-diff.png)   |
| Glass                | showcase-card-work-desktop (1440)    | [impl](phase-2/showcase-card-work-desktop-1440-impl.png)    | [figma](phase-2/showcase-card-work-desktop-1440-figma.png)    | [diff](phase-2/showcase-card-work-desktop-1440-diff.png)    |
| Demo state           | site-header-desktop (1440)           | [impl](phase-2/site-header-desktop-1440-impl.png)           | [figma](phase-2/site-header-desktop-1440-figma.png)           | [diff](phase-2/site-header-desktop-1440-diff.png)           |
| Match                | site-footer (1440)                   | [impl](phase-2/site-footer-1440-impl.png)                   | [figma](phase-2/site-footer-1440-figma.png)                   | [diff](phase-2/site-footer-1440-diff.png)                   |
| Copy / frame         | nav-pill-current (1440)              | [impl](phase-2/nav-pill-current-1440-impl.png)              | [figma](phase-2/nav-pill-current-1440-figma.png)              | [diff](phase-2/nav-pill-current-1440-diff.png)              |
| Reference unreliable | tab-bar-current-catalog (390)        | [impl](phase-2/tab-bar-current-catalog-390-impl.png)        | [figma](phase-2/tab-bar-current-catalog-390-figma.png)        | [diff](phase-2/tab-bar-current-catalog-390-diff.png)        |
