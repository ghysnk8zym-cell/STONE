# Phase 3 pages: Figma visual comparison notes

Branch `feat/phase-3-pages`. Source of truth: Figma `1vEGuD9cYYFNynyByUGHwF` (read only).
Raw output of the run: [`phase-3/results.md`](phase-3/results.md). Only a curated set of images is committed (see "Evidence").
Phase 2 component notes (carried-over items, tab bar reference problem): [`phase-2-components.md`](phase-2-components.md).

## Method

- `pnpm qa:visual:pages` (`scripts/visual-compare.mjs --pages`) takes a full-page screenshot of each page with
  Playwright Chromium (viewport width = Figma frame width, height 900, deviceScaleFactor 1, reduced motion,
  animations off), locale `en`. The page is scrolled once so lazy images load, every image is decoded before the shot,
  and `position: fixed` elements at the bottom (the tab bar) are re-anchored to the bottom of the document, because a
  full-page capture otherwise leaves the bar at the bottom of the first screen while Figma draws it at the bottom of
  the screen.
- Reference images are Figma `get_screenshot` exports of the whole screen at scale 1 (original size) in
  `tests/visual/figma/pages/<id>-<width>.png`; the map (page, route, Figma node per width) is the `pages` section of
  `tests/visual/figma/references.json`.
- Both images are padded to the larger size, flattened on the page background colour and compared with pixelmatch
  (threshold 0.1, anti-aliasing ignored). Output per pair: `-impl`, `-figma`, `-diff` PNG (git-ignored) and the
  committed `-triplet.jpg` strip.
- A raw mismatch percentage is NOT a pass/fail number. A height difference shifts everything below it, and the
  Figma frames carry other copy (no "Prices are illustrative" line, no language switch) and glass over a photo.
  Every pair was looked at (impl | figma | diff). The 1440, 768 and 390 triplets of the home page, the catalog at
  1440 and 390 and the Black Marble page at 768 and 390 were inspected at full size with crops; the others through
  the strip and the diff, and they carry the same components, so the same classes apply.
- Fill values were sampled from both images where a class is claimed (see the defects list).

## Coverage

- 20 unique comparisons: 5 pages x 4 widths (1440, 1024, 768, 390). No reference is reused ("same PNG" does not
  occur in page mode).
- Pages: Home v2 (`/en`), Catalog (`/en/catalog`), Product Black Marble, Charcoal Ledger and Concrete Paver
  (`/en/catalog/<slug>`). The other nine products use the same layout and are not compared; the product Figma
  frames differ only in copy and photo.
- Not compared: 1920 and 1280 (approximations, see checklist), 360 (checked by e2e: no horizontal overflow in ru),
  ru pages (the Figma copy is English), the 404 page and the empty catalog state (no full-page Figma frame; the empty
  state is node 922:26021, checked in Task 6), the open mobile menu and the open hero search (not drawn as pages).

## Results

Status "Accepted" means the difference is explained by the classes shown. Classes: copy = the implementation shows
copy Figma does not (placeholder-price line, language switch); height = shift from that copy; glass = glass or
backdrop approximation; font = text antialiasing; frame = Figma frame inconsistency; defect = see the defects list.

| Page (route)                              | Width | Mismatch % | Height delta | Classification                                                                                      | Status   |
| ----------------------------------------- | ----- | ---------- | ------------ | --------------------------------------------------------------------------------------------------- | -------- |
| home (`/en`)                              | 1440  | 1.08       | +2           | font; language switch; "Prices are illustrative" line; old-price frame; D1 fixed                    | Accepted |
| home                                      | 1024  | 2.64       | +2           | same as 1440; Figma Taupe Rock price $33 vs seed $32 (frame); Prev arrow disabled at the start (D2) | Accepted |
| home                                      | 768   | 10.64      | +1           | footer flat vs Figma glass over a fade (owner item), font, "Prices are illustrative" line           | Accepted |
| home                                      | 390   | 3.41       | -6           | footer flat vs Figma gradient, hero covered by the catalog panel as drawn, tab bar reference        | Accepted |
| catalog (`/en/catalog`)                   | 1440  | 19.03      | +20          | height (placeholder-price line, +20 px shifts the grid), language switch, font                      | Accepted |
| catalog                                   | 1024  | 21.39      | +20          | height (placeholder-price line), font                                                               | Accepted |
| catalog                                   | 768   | 21.53      | +20          | height (placeholder-price line), font                                                               | Accepted |
| catalog                                   | 390   | 21.82      | +20          | height (placeholder-price line), tab bar reference; card heights match Figma (D3 withdrawn)         | Accepted |
| black-marble (`/en/catalog/black-marble`) | 1440  | 0.86       | 0            | font                                                                                                | Accepted |
| black-marble                              | 1024  | 1.26       | 0            | font                                                                                                | Accepted |
| black-marble                              | 768   | 1.39       | 0            | font (D4 fixed: was 4.24 %, -8 px)                                                                  | Accepted |
| black-marble                              | 390   | 6.74       | -1           | tab bar reference (flat grey in Figma), font (D5 fixed: was -25 px)                                 | Accepted |
| charcoal-ledger                           | 1440  | 1.09       | 0            | font                                                                                                | Accepted |
| charcoal-ledger                           | 1024  | 1.42       | 0            | font                                                                                                | Accepted |
| charcoal-ledger                           | 768   | 1.54       | 0            | font (D4 fixed: was 4.38 %)                                                                         | Accepted |
| charcoal-ledger                           | 390   | 6.45       | -1           | tab bar reference, font (D5 fixed)                                                                  | Accepted |
| concrete-paver                            | 1440  | 0.91       | 0            | font                                                                                                | Accepted |
| concrete-paver                            | 1024  | 1.15       | 0            | font                                                                                                | Accepted |
| concrete-paver                            | 768   | 1.25       | 0            | font (D4 fixed: was 4.10 %)                                                                         | Accepted |
| concrete-paver                            | 390   | 6.44       | -1           | tab bar reference, font (D5 fixed)                                                                  | Accepted |

Every row above 5 % is explained: the catalog rows by the 20 px placeholder-price line that shifts the whole grid
(the grid itself matches card for card), home 768 by the flat footer (the footer is 370 px tall there), and the three
product 390 rows by the Figma tab bar reference (a baked flat grey, see Phase 2 notes). The product pages at 1440, 1024
and 768 are within 1.6 % (text antialiasing only): gallery, specs, calculator, buttons, footer match.

## Defects and their status

Found by the first run, handled in fix round 1 (root cause first, evidence below).

| ID  | Page, component                            | Figma node                                     | Finding                                                                                             | Status                                                                                           |
| --- | ------------------------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| D1  | Home, section panels                       | 722:1310 (panel), 722:1300, 722:1563, 724:1669 | Panel about 27 levels lighter than Figma at the same pixels                                         | FIXED (cause below); home 1440 12.78 % to 1.08 %, 1024 19.29 % to 2.64 %                         |
| D2  | Home, carousel arrows                      | 722:1317, 722:1325 (1440), 722:1300            | Arrows dimmed when nothing scrolls (1440) or at the start (Prev, 1024 and 768); Figma draws enabled | Kept: deliberate behaviour (a disabled control that cannot move). Owner checklist                |
| D3  | Catalog grid at 390                        | 922:26324                                      | Reported "cards stretch to the row height"                                                          | WITHDRAWN, a misreading: the grid is already `items-start`; heights 318 / 340 vs Figma 316 / 338 |
| D4  | Product at 768, gallery to title gap       | 782:11639 (Gallery 782:11645, Info 782:11650)  | Info block started 24 px under the thumbnails, Figma 32                                             | FIXED (`md:gap-8`); page now 2361 px like Figma; mismatch 4.24 % to 1.39 %                       |
| D5  | Footer at 390 (new, found while fixing D4) | 782:11752 (370 px footer), 782:11727           | The 100 px tab-bar padding replaced the footer's own 24 px bottom padding (impl 446 px vs 470)      | FIXED (`pb-footer-tabbar` = 24 + 100); every 390 product page now within 1 px of Figma           |

D1 root cause. The fill matches Figma exactly (`surface/panel` #1214168c, blur 12 = Figma radius 24, border, shadow, radius
and the backdrop photo outside the panels within 3 to 5 levels). Inside the panel Figma is darker at every sampled point
by the same factor: at (100,780) 71 vs 98, at (100,1250) 65 vs 89, at (1330,1250) 70 vs 99, at (1330,1700) 71 vs 101,
which is an effective fill alpha of 0.70 instead of 0.55. The cause is the drop shadow `0 16 40 rgba(0,0,0,.35)`: Figma
draws it THROUGH the translucent fill (it is visible behind the node), while CSS `box-shadow` is clipped inside the
border box. Fix: `--effect-glass-panel-shadow-through: 0.28` and the `glass-panel-veil` utility (a 28 % black layer over
the fill), applied to the home section panels. After: the same four points read 71 vs 71, 64 vs 65, 71 vs 70, 73 vs 71.
Near the top edge the veil overshoots slightly (80 vs 87 at (700,690)) because the real shadow fades towards the edge.
This is not the Phase 2 "blur 2x" question: the blur values were already equal. Guarded by an e2e test on the veil.

D4 numbers (Figma 782:11639 against the page at 768, absolute y; layout identical except one gap): Product 158, Columns
202, thumbnails 772.67 (gap 16 under the 554.67 image), thumbnails end 904.67, Info 936.67 (gap 32), Description +76,
Specs +122 (193), Calculator +339 (503), Actions +866 (108), Main padding-bottom 80, Footer 370. Before the fix every item
after the gallery sat 8 px higher (Info at 928.66). At 390 the gap is 24 in both (418.06 - 394.06), unchanged. Guarded by
an e2e test (gap 32 at 768, 24 at 390).

D5 numbers (Figma 782:11727): Footer instance 370 px at y 1634.06, band 100 px below it (tab bar at 2020, page ends
2104). Implementation footer was 446 px (346 content + 100) because `pb-tabbar` replaced the footer's own `pb-6`.

Not defects (Figma inconsistency, listed for the owner): the old price is struck through in the catalog frames but
drawn plain in the home frames, while both use the same component (the implementation strikes through everywhere);
Figma home 1024 shows $33.00 for Taupe Rock where the catalog and the seed say $32.00.

## Tab bar contrast (manual note: axe excludes the floating bar)

The bar is `bg-surface-header` rgba(18,20,22,0.62) with blur 12 px over whatever is behind it, so contrast depends on
the page. Measured at 390 with Playwright (the bar hidden, the pixels under it sampled, the bar fill composited over
the darkest, mean and brightest pixel; blur is not applied, so the real value lies between mean and brightest):

| Backdrop under the bar (page, scroll)             | Darkest | Mean   | Brightest |
| ------------------------------------------------- | ------- | ------ | --------- |
| Home top (hero photo and panels), inactive labels | 9.38:1  | 4.05:1 | 3.73:1    |
| Home top, active label (white)                    | 17.21:1 | 6.05:1 | 5.46:1    |
| Catalog scrolled to cream cards, inactive         | 10.15:1 | 3.92:1 | 3.73:1    |
| Catalog scrolled to cream cards, active           | 19.44:1 | 5.82:1 | 5.46:1    |
| Product (light page), inactive                    | 9.66:1  | 3.85:1 | 3.81:1    |
| Product (light page), active                      | 17.95:1 | 5.68:1 | 5.62:1    |

Conclusion: active labels pass 4.5:1 on every backdrop (at least 5.4:1). Inactive labels (white 72 %, 12 px) are about
3.7 to 4.05:1 over light backdrops, below 4.5:1, and above 9:1 over dark ones. This is Figma's own token pair
(`text/secondary` on `surface/header`), so it is an owner decision, not an implementation defect. A fix would be a
darker bar fill (about 0.80 alpha gives at least 4.5:1) or inactive labels at full white.

## Deviations (accepted, not defects)

- Copy: the visible placeholder-price line ("Prices are illustrative") on the home Promo section and the catalog is not
  in Figma (CLAUDE.md section 8). It adds 20 px to the catalog height at 1440, 1024 and 768.
- Language switch: header at 1280 and up only (not drawn in Figma); inactive label full white with the current one
  underlined.
- Footer: flat dark colour outside the backdrop root on the home page (Figma draws translucent glass over the fade,
  lighter at the top). Sampled rgb 20,23,25 vs 32,33,34. On catalog and product it matches (cream surface behind the
  glass).
- Hero: 1440 backdrop upscaled from the 1440 source to the 1984 box; 1024 and 768 use their scene crops, 390 hero is
  covered by the catalog panel exactly as Figma draws it.
- Mobile (390): the Figma tab bar reference is a baked flat render of a translucent fill (see Phase 2 notes), so the bar
  never matches pixel for pixel; Figma draws the band below the footer lighter than the footer.
- Photos: seven catalog images and the Works images exist only as 390 px sources and are soft on DPR 2 desktop cards.
- Font rendering: thin outlines around every glyph in the diffs.

## Owner approval checklist

One list, ticked or overruled by the owner. Phase 3 items first, then Phase 2 items that still apply.

Phase 3:

- [ ] Placeholder prices: every price comes from Figma and is unconfirmed. The visible line "Prices are illustrative" is
      shown under Promo products and the catalog results, and the calculator labels the total "Illustrative estimate".
      Keep, reword or replace with confirmed prices before launch.
- [ ] Localised 404 (unknown product or path): not designed in Figma. Built from tokens inside the shell with a link
      back to the catalog; copy `pages.notFound`.
- [ ] Russian copy: every ru string except the Figma tab labels is a draft. Includes the hero line, where «долговечность»
      may be too long at 390 (fallback «прочность»), «Рваный скол», «Любая обработка», «Цена за м²», the calculator
      labels and the filter and sort labels. English colour and finish labels are derived from Figma ids.
- [ ] Inert controls (default Figma look, non-link, `aria-disabled`, out of the tab order) until their pages exist:
      header and menu Create Your Stone, Cart, account; tab bar Favorites, Cart, Sign in; Projects; product hearts and
      Save; Buy now; Add to cart; the custom-order CTA. Confirm the list and the look.
- [ ] Colour filter groups (dark, grey, light, warm) differ from the Figma dropdown, which does not match the product
      colours. Mapping is the implementer's judgement: dark = black-marble, charcoal-ledger, graphite-rock,
      graphite-stack; grey = grey-limestone, grey-marble, concrete-paver, silver-ledger, rustic-split;
      light = split-limestone; warm = taupe-rock, golden-rock.
- [ ] Language switch: the inactive locale is full white and the current one is marked by an underline only (raised from
      white 72 %, which was 3.3:1 to 3.7:1 on the grey header). Visible change in a non-Figma element.
- [ ] Hero search is hidden and inert at 390 (the Figma 390 frame covers the hero with the catalog panel); search is
      reachable through the Catalog tab and the catalog page.
- [ ] Home footer is flat dark outside the backdrop; Figma shows glass over a fade. Accept or
      extend the backdrop under the footer.
- [ ] Home backdrop is upscaled above 1440 and the 1920 and 1280 layouts are approximations (no 1920 frame offsets,
      Figma draws no 1280 home).
- [ ] Low-resolution photos: seven products plus Our works exist only as small sources (see Phase 2 item). Provide
      larger sources or accept.
- [ ] 360 px: checked by e2e (no horizontal overflow in ru on catalog and product), not compared pixel for pixel.
- [ ] Tab bar contrast: inactive labels are 3.7 to 4.05:1 over light backdrops (table above). Accept Figma's tokens, or
      darken the bar fill, or use full white labels.
- [ ] D1: the home panel veil (`glass-panel-veil`, 28 % black) approximates Figma's drop shadow drawn through the
      translucent fill; the value 0.28 was picked from four measurements (it overshoots near the top edge). Accept or tune.
- [ ] D2: the home carousel arrows are disabled when nothing can scroll (all three cards fit at 1440) and Prev at the start
      (1024, 768); Figma frames 722:1300, 722:1563 and 724:1669 draw every arrow enabled (nodes 722:1317, 722:1325).
      Kept as correct behaviour; confirm. D1, D4 and D5 are fixed, D3 was a misreading (see Defects).
- [ ] Old price strike-through: kept on every card (catalog frames draw it, home frames do not).
- [ ] Cost calculator: limits (area 0.01 to 10 000 m2, wall sides 0.01 to 100 m), +10 % extra tiles, default 2.00 m2;
      the mode switch has no animation (Figma may have a smart-animate); ru wraps the calculator header and total
      label at 390. Below 390 (no Figma frame) the total label can wrap above the amount and the amount scales down
      with the card, so the largest total (10 000 m²) stays inside at 320. Inputs accept "10 000" (space, NBSP or NNBSP
      thousands groups).
- [ ] Sale filter has no visible indicator (Offers → `?sale=1`): nothing on the catalog shows it is on, the counter
      ("Показано 4 из 12") is unexplained and only Back or the empty-state reset clears it. Figma Chip/Applied 338:546
      could show it later as a visible, removable "On sale" chip.
- [ ] Carousel arrows without JavaScript: both are drawn disabled (Figma disabled look), because they cannot scroll
      before hydration; the track still scrolls natively. With JavaScript they enable as before.
- [ ] Product names on cards are clamped to two lines with an ellipsis (spec); no current name is that long.

Carried over from Phase 2 (still apply):

- [ ] Motion timings are defaults (hover 180 ms, ripple 600 ms, carousel smooth scroll); Figma has no motion data.
- [ ] Glass approximation values and the blur conversion rule (Figma blur radius = 2x CSS blur): settle one rule. D1 showed
      the panel blur was already equal; the difference was the shadow seen through the fill (now the `glass-panel-veil`
      token, 0.28); the same effect may apply to other translucent shadowed glass (showcase work card).
- [ ] Button, icon button, field, select and product card states chosen by the implementer (see Phase 2 list); primary
      button focus ring weak on light surfaces.
- [ ] Header breakpoint: Full at 1280 and up, Compact below (Figma draws Compact at 1024, 768, 390, 360).
- [ ] Mobile menu panel is not in Figma. Without JavaScript the compact header menu is inert between 768 and 1279 px.
- [ ] Footer copyright "© 2026" is fixed text; ru strings in the header, footer and tab bar are drafts.
- [ ] Cyrillic PT Serif in Lusitana roles: eyeball it on the real pages in ru.
- [ ] Question O1 (graphite search panel look) and the hero search Open state taken from Search/Pill 21:108.
- [ ] `APP_ENV=production` on any real production deploy (the styleguide is a 404 there).

## Deferred minor findings

From the task reviews, none blocks the phase:

- T0: `LOW_RES` list is hard-coded in `assets.test.ts`.
- T1: `Localizer` has no locale for `localeCompare` (the catalog passes the locale); no Cyrillic sort test; ё and е are
  not normalised in the repository itself (the search does it); enum params are case-sensitive; seed objects are shared
  by reference.
- T2: ".5" is rejected, so the UI error copy should say "e.g. 0.5".
- T3: "10 %" spacing in one string; the message test does not compare ICU arguments or `pages.*` coverage.
- T5: the inert style lists duplicate the resting styles (drift risk); hero LCP preload only at 1024 and 1440; the 390
  hero search uses `max-md:invisible` instead of `inert`.
- T7: the calculator live region can announce "—" up to 800 ms before the error text.

## Evidence

All 20 comparisons as one strip each, `impl | figma | diff` (red = differing pixels), downscaled (1440 and 1024 to 40 %,
768 and 390 to 60 %), JPEG, about 1.9 MB in total. Full-size PNGs are regenerated by `pnpm qa:visual:pages`.

| Page            | 1440                                              | 1024                                              | 768                                              | 390                                              |
| --------------- | ------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| home            | [strip](phase-3/home-1440-triplet.jpg)            | [strip](phase-3/home-1024-triplet.jpg)            | [strip](phase-3/home-768-triplet.jpg)            | [strip](phase-3/home-390-triplet.jpg)            |
| catalog         | [strip](phase-3/catalog-1440-triplet.jpg)         | [strip](phase-3/catalog-1024-triplet.jpg)         | [strip](phase-3/catalog-768-triplet.jpg)         | [strip](phase-3/catalog-390-triplet.jpg)         |
| black-marble    | [strip](phase-3/black-marble-1440-triplet.jpg)    | [strip](phase-3/black-marble-1024-triplet.jpg)    | [strip](phase-3/black-marble-768-triplet.jpg)    | [strip](phase-3/black-marble-390-triplet.jpg)    |
| charcoal-ledger | [strip](phase-3/charcoal-ledger-1440-triplet.jpg) | [strip](phase-3/charcoal-ledger-1024-triplet.jpg) | [strip](phase-3/charcoal-ledger-768-triplet.jpg) | [strip](phase-3/charcoal-ledger-390-triplet.jpg) |
| concrete-paver  | [strip](phase-3/concrete-paver-1440-triplet.jpg)  | [strip](phase-3/concrete-paver-1024-triplet.jpg)  | [strip](phase-3/concrete-paver-768-triplet.jpg)  | [strip](phase-3/concrete-paver-390-triplet.jpg)  |
