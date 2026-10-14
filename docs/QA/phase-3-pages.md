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

| Page (route)                              | Width | Mismatch % | Height delta | Classification                                                                                             | Status            |
| ----------------------------------------- | ----- | ---------- | ------------ | ---------------------------------------------------------------------------------------------------------- | ----------------- |
| home (`/en`)                              | 1440  | 12.78      | +2           | glass (panel tone, footer), language switch, "Prices are illustrative" line, old-price frame, font; D1, D2 | Accepted + D1, D2 |
| home                                      | 1024  | 19.29      | +2           | same as 1440; Figma Taupe Rock price $33 vs seed $32 (frame)                                               | Accepted + D1, D2 |
| home                                      | 768   | 25.81      | +1           | same as 1440; hero reinterpretation as drawn; prev arrow disabled at the start (behaviour)                 | Accepted + D1, D2 |
| home                                      | 390   | 10.67      | -30          | footer flat vs Figma gradient, tab bar reference (see below), "Prices are illustrative" line, hero covered | Accepted          |
| catalog (`/en/catalog`)                   | 1440  | 19.03      | +20          | height (placeholder-price line, +20 px shifts the grid), language switch, font                             | Accepted          |
| catalog                                   | 1024  | 21.39      | +20          | height (placeholder-price line), font                                                                      | Accepted          |
| catalog                                   | 768   | 21.53      | +20          | height (placeholder-price line), font                                                                      | Accepted          |
| catalog                                   | 390   | 21.38      | -4           | height (placeholder-price line), cards stretch to the row height (D3), tab bar reference                   | Accepted + D3     |
| black-marble (`/en/catalog/black-marble`) | 1440  | 0.86       | 0            | font                                                                                                       | Accepted          |
| black-marble                              | 1024  | 1.26       | 0            | font                                                                                                       | Accepted          |
| black-marble                              | 768   | 4.24       | -8           | font; thumbnails to title gap 6 to 8 px tighter (D4)                                                       | Accepted + D4     |
| black-marble                              | 390   | 6.94       | -25          | tab bar reference (flat grey, Figma), footer bottom band, font                                             | Accepted          |
| charcoal-ledger                           | 1440  | 1.09       | 0            | font                                                                                                       | Accepted          |
| charcoal-ledger                           | 1024  | 1.42       | 0            | font                                                                                                       | Accepted          |
| charcoal-ledger                           | 768   | 4.38       | -8           | font; D4                                                                                                   | Accepted + D4     |
| charcoal-ledger                           | 390   | 6.65       | -25          | tab bar reference, footer bottom band, font                                                                | Accepted          |
| concrete-paver                            | 1440  | 0.91       | 0            | font                                                                                                       | Accepted          |
| concrete-paver                            | 1024  | 1.15       | 0            | font                                                                                                       | Accepted          |
| concrete-paver                            | 768   | 4.10       | -8           | font; D4                                                                                                   | Accepted + D4     |
| concrete-paver                            | 390   | 6.64       | -25          | tab bar reference, footer bottom band, font                                                                | Accepted          |

Every row above 5 % is explained: the home and catalog rows by the classes shown (they are layout-shift dominated, the
catalog grid itself matches card for card at 1440), the three product 390 rows by the Figma tab bar reference and the
25 px height of its bottom band. The product pages at 1440 and 1024 are within 1.5 % (text antialiasing only):
gallery, specs, calculator, buttons, footer match.

## Defects (for the lead, not fixed here)

| ID  | Page, component                                         | Figma node                                       | Expected (Figma)                                           | Actual                                                                                                                                                                                         | Severity             |
| --- | ------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| D1  | Home, section panels (glass panel behind each carousel) | 722:1300 (1440), 722:1563 (1024), 724:1669 (768) | Panel fill darker: sampled rgb about 71,71,72 and 87,88,90 | Panel lighter: rgb 98,98,98 and 113,113,115 at the same pixels (about 27 levels), same photo behind; glass fill or blur weaker than Figma                                                      | Medium               |
| D2  | Home, carousel arrows at 1440                           | 722:1300                                         | Prev and Next drawn enabled (white circle, dark arrow)     | Both arrows dimmed (disabled): the three cards fit, nothing to scroll. At 1024 and 768 Prev is dimmed at the start. Behaviour is deliberate in Carousel, but it differs from every Figma frame | Low (needs a ruling) |
| D3  | Catalog at 390, product grid                            | 922:26324                                        | Cards keep their own height in a row                       | Cards stretch to the tallest card of the row (Concrete Paver row: neighbour card has empty space)                                                                                              | Low                  |
| D4  | Product at 768, rhythm below the gallery                | 782:11639 (Black Marble)                         | Thumbnails to title about 6 to 8 px more, page 2361 px     | Page 2353 px (8 px shorter), title block starts higher                                                                                                                                         | Low                  |

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
  never matches pixel for pixel; its bottom band is a lighter strip and 25 px taller in Figma.
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
- [ ] D1 (home panel glass tone), D2 (home carousel arrows disabled when nothing scrolls), D3 (catalog cards stretch at
      390), D4 (product 768 rhythm): fix or accept.
- [ ] Old price strike-through: kept on every card (catalog frames draw it, home frames do not).
- [ ] Cost calculator: limits (area 0.01 to 10 000 m2, wall sides 0.01 to 100 m), +10 % extra tiles, default 2.00 m2;
      the mode switch has no animation (Figma may have a smart-animate); ru wraps the calculator header and total
      label at 390.

Carried over from Phase 2 (still apply):

- [ ] Motion timings are defaults (hover 180 ms, ripple 600 ms, carousel smooth scroll); Figma has no motion data.
- [ ] Glass approximation values and the blur conversion rule (Figma blur radius = 2x CSS blur): settle one rule; D1 may
      be related to it.
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
