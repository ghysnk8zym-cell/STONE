# Animations

Every motion shipped in the app. Tokens live in `src/styles/tokens/motion.css`. Figma has no recorded transitions
for these components (`get_motion_context` returns no animated nodes), so all timings are STONE defaults.

Status for every row: **default timings, Figma has no motion data, owner to approve.**

| Name                    | Location                                                                                                                  | Trigger                                                                                                                     | Properties                                                                                                   | Duration / easing                                                                                   | Reduced motion                                                                      | PR                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------ |
| Press ripple            | `src/app/globals.css` (`@utility ripple`, `@keyframes ripple-expand`)                                                     | `:active` or `[data-state="pressed"]` (the `press` variant)                                                                 | `transform` (scale 0.0267 to 1, ring 8 px to 300 px), `opacity` (1 to 0)                                     | `--motion-ripple-duration` 600ms, `--motion-ripple-ease` cubic-bezier(0.2, 0, 0, 1)                 | `animation: none`, duration token is 0ms                                            | Phase 2 design system PR |
| Hover transitions       | `src/app/globals.css` (`@utility motion-hover`); used by buttons, pills, cards, fields, footer links, breadcrumb, tab bar | Hover, focus and state changes of the element (`hov`, `focusv`)                                                             | `background-color`, `border-color`, `color`, `box-shadow`, `opacity`                                         | `--motion-hover-duration` 180ms, `--motion-hover-ease` cubic-bezier(0.2, 0, 0, 1)                   | `transition: none`, duration token is 0ms                                           | Phase 2 design system PR |
| Loading spinner         | `src/components/buttons/Button.tsx` (`animate-spin`)                                                                      | Button `loading` prop (`aria-busy`)                                                                                         | `transform` (rotate), Tailwind `spin` keyframes                                                              | Tailwind default `animate-spin` (1s linear, infinite); not tokenised                                | `motion-reduce:animate-none` (spinner stops, `aria-busy` still announces the state) | Phase 2 design system PR |
| Select chevron rotation | `src/components/forms/Select.tsx` (`transition-transform`, `group-aria-expanded:rotate-180`)                              | Select opened / closed (`aria-expanded`)                                                                                    | `transform` (rotate 0 to 180deg)                                                                             | Tailwind default `transition-transform` (150ms, default timing function); not tokenised             | `motion-reduce:transition-none`                                                     | Phase 2 design system PR |
| Mobile menu             | `src/components/navigation/HeaderMenuButton.tsx`                                                                          | Menu button click                                                                                                           | none                                                                                                         | Not animated: the panel opens and closes instantly                                                  | n/a                                                                                 | n/a                      |
| Carousel scroll         | `src/components/carousel/Carousel.tsx` (Home v2 Catalog, Promo products, Our works)                                       | Prev / Next arrow click (one card plus the gap); touch swipe and keyboard focus use native scrolling with CSS `scroll-snap` | `scrollLeft` of the track (browser scroll, compositor-driven; no layout property animated), snap-x mandatory | `scrollBy({ behavior: "smooth" })`, browser-default duration and easing; not tokenised. No autoplay | `behavior: "auto"` (instant jump) when `prefers-reduced-motion: reduce`             | Phase 3 Task 5 PR        |

## Phase 4 reconciliation (2026-10-18)

Auth, account and admin reuse the existing small hover/focus transitions and
Button pending spinner. No route transition, layout animation, autoplay, new
library or new timing was added in Phase 4. Account sections open/close instantly;
its chevron toggles rotation immediately (`motion-hover` transitions colors and
opacity, not transform). Profile editing, password visibility, admin filtering,
selection, saving, pending text and result messages switch immediately. The Select
component retains the separate chevron transition and reduced-motion override.

The existing global reduced-motion media query disables ripple/hover transitions;
the spinner and Select have explicit motion-reduce utilities. Carousel arrows
check the preference and use native instant scroll. Reduced motion must leave
`aria-busy`, labels, error/status messages and keyboard interactions intact.

Verification must cover computed styles and actual interactions, not just the
presence of CSS classes. The Phase 5 QA record reports what ran in normal/reduced
mode. Figma's historical lack of motion data and owner timing approval remain
separate from that functional check; no owner acceptance is implied here.

## Notes for the owner

- The spinner and the chevron use Tailwind defaults instead of tokens. If the owner approves different timings,
  move them into `motion.css` at the same time.
- Animate `transform` and `opacity` only for anything new (CLAUDE.md section 5). The hover transition animates
  colour and shadow, which is a paint-only change on small elements.
- Phase 3 pages added no new motion since the carousel row. Deliberately not animated: the cost-calculator mode
  switch (Figma may use a smart-animate; not reproduced, owner checklist in `docs/QA/phase-3-pages.md`) and the
  product gallery thumbnail swap (instant).
- The styleguide (`/ru/_styleguide`, `/en/_styleguide`) shows frozen pressed states (`data-state="pressed"`), so
  the ripple can be reviewed without pressing a control.
