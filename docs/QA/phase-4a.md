# Phase 4a: Figma visual comparison notes and owner checklist

Branch `feat/phase-4-auth`. Source of truth: Figma `1vEGuD9cYYFNynyByUGHwF` (read only; `get_screenshot` only). Screen ids are in `docs/FIGMA-INVENTORY.md`.
Raw output of the run: [`phase-4a/results.md`](phase-4a/results.md). Only the curated `*-triplet.jpg` strips (impl | figma | diff, about 2.4 MB in all) are committed; the full-size PNGs are git-ignored.
Earlier phases: [`phase-2-components.md`](phase-2-components.md), [`phase-3-pages.md`](phase-3-pages.md).

## Method

- `pnpm qa:visual:pages --set phase4a` (`scripts/visual-compare.mjs --pages --set phase4a`, new in this task). Same engine as the Phase 3 page mode: full-page Playwright Chromium shots at the Figma frame width, deviceScaleFactor 1, reduced motion, animations off, images decoded, both images padded and flattened on the page colour, pixelmatch threshold 0.1 without anti-aliasing. Locale `en` (the Figma copy is English).
- Differences from Phase 3: the viewport height is 844 at 390 (the phone frames are 844 high; the pages are `min-h-dvh`) and 900 otherwise; entries marked `auth` are shot **signed in**: the script signs the browser context in through the real sign-in form (there is no Better Auth HTTP API) with the seeded **fake** test users of `.env.test.example` (no real credential is involved, a distinct `X-Forwarded-For` per login keeps the rate limit out of the way) and then loads the page. The sign-in screen has no Figma frame, so it is compared with Create account (`reference`).
- To rerun: `pnpm build`, then `E2E_PORT=3002 node --env-file=.env.test.example scripts/e2e-db-server.mjs` (a throwaway seeded PGlite database and `next start`) and `BASE_URL=http://localhost:3002 pnpm qa:visual:pages --set phase4a`. References: `tests/visual/figma/pages-phase4a/<id>-<width>.png`; the map is `pagesPhase4a` in `tests/visual/figma/references.json`.
- A raw mismatch percentage is **not** pass/fail: a height difference shifts everything below it, and the seeded demo data differs from the Figma sample data (names, products, figures). Every pair was looked at (impl | figma | diff).
- Not compared (no frame to compare with): the unavailable and error states, the below-1024 admin message, the empty states, the Customers / Promotions / Site content / Create Your Stone placeholders (Phase 4b), 768 and 1920.

## Coverage

22 comparisons: sign-up, sign-in, sign-out at 1440 and 390; account Overview, Orders, Favorites, Profile at 1440 and 390; admin Overview, Products, Add product, Orders at 1440 and 1024. Figma frames used: Create account `431:3193` / `431:3250`; Sign out `803:20474` / `803:20615`; Account `736:5318` / `737:6405`; Orders `742:7324` / `742:7736`; Favorites `742:11470` / `742:12144`; Profile `742:16191` / `742:16557`; Admin Overview `1077:51932` / `1077:55042`; Orders `1077:52201` / `1077:55311`; Products `1077:52506` / `1077:55616`; Add product `1077:52622` / `1077:55732`.

## Results

Historical Phase 4a implementation pass. **Reviewed** below means the implementer
inspected that earlier build; it does not record owner acceptance. All owner boxes
remain pending. Fresh takeover evidence and independent review are recorded in
[Phase 5 local QA](phase-5-local.md); historical numbers and images are preserved.

Classes: **data** = the seeded demo data differs from the Figma sample data; **height** = shift caused by missing or extra blocks; **font** = text antialiasing; **photo/glass** = backdrop approximation; **deviation** = owner item below; **defect** = see the list.

| Screen (route)                               | Width | Mismatch % | Height delta | Classification                                                                                                                                           | Status   |
| -------------------------------------------- | ----- | ---------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| sign-up (`/en/sign-up`)                      | 1440  | 1.26       | 0            | font                                                                                                                                                     | Reviewed |
| sign-up                                      | 390   | 2.60       | 0            | font; layout matches (form bottom 656 px as Figma; D1 fixed)                                                                                             | Reviewed |
| sign-in (`/en/sign-in`)                      | 1440  | 1.31       | 0            | font; title and link copy differ (Create account layout, owner item)                                                                                     | Reviewed |
| sign-in                                      | 390   | 3.23       | 0            | font; copy (Create account layout, owner item); D1 fixed                                                                                                 | Reviewed |
| sign-out (`/en/sign-out`)                    | 1440  | 15.82      | +154         | height: footer under the first screen and language switch in the header (Figma has neither; owner item); art matches (rim pixels are scaling AA)         | Reviewed |
| sign-out                                     | 390   | 39.81      | +470         | height: footer below the art, Figma draws no footer and the tab bar over the art (tab bar reference, owner item)                                         | Reviewed |
| account (`/en/account`)                      | 1440  | 5.21       | -4           | data (offer thumbnails and names), font; layout matches                                                                                                  | Reviewed |
| account                                      | 390   | 5.99       | 0            | data (offer names, order rows), font; banner is 194 px with no thumbnails as Figma draws it (D2 fixed); tab bar reference                                | Reviewed |
| account-orders                               | 1440  | 0.71       | 0            | font; the sidebar keeps Figma's shell height of 860 px (D3 fixed)                                                                                        | Reviewed |
| account-orders                               | 390   | 50.69      | -404         | height: same "Saved" block under the cards                                                                                                               | Reviewed |
| account-favorites                            | 1440  | 0.88       | 0            | font; sidebar 826 px as Figma (D3 fixed); Figma's second row of tiles is placeholders (not drawn), the heart is added (owner item)                       | Reviewed |
| account-favorites                            | 390   | 36.16      | -258         | same as 1440                                                                                                                                             | Reviewed |
| account-profile                              | 1440  | 36.55      | +283         | height: password card added (not in Figma), no Phone row; footer moves down                                                                              | Reviewed |
| account-profile                              | 390   | 36.86      | +259         | same as 1440                                                                                                                                             | Reviewed |
| admin-overview (`/en/admin`)                 | 1440  | 28.86      | -289         | height: no date range, no stock, no payment (no data), no Create Your Stone table (Phase 4b); figures and chart are the seeded orders                    | Reviewed |
| admin-overview                               | 1024  | 34.56      | -501         | same as 1440; at 1024 the Figma cards stack and so do ours                                                                                               | Reviewed |
| admin-products                               | 1440  | 8.04       | -178         | data, no stock line and no "Draft to finish" block in the seed; grid, cards and buttons match                                                            | Reviewed |
| admin-products                               | 1024  | 16.74      | -186         | same as 1440                                                                                                                                             | Reviewed |
| admin-add-product (`/en/admin/products/new`) | 1440  | 37.50      | +569         | height: ru and en name and description fields, slug, colour group, old price, discount (spec); photo area uses a picture select; no thumbnails, no stock | Reviewed |
| admin-add-product                            | 1024  | 38.92      | +889         | same as 1440                                                                                                                                             | Reviewed |
| admin-orders (`/en/admin/orders`)            | 1440  | 10.25      | -77          | data (three orders in the e2e seed, Figma seven), no payment chip or filter, no date range; list, detail card and status form match                      | Reviewed |
| admin-orders                                 | 1024  | 21.39      | -296         | same as 1440                                                                                                                                             | Reviewed |

Every row above 5 % is explained above. The auth screens at 1440, the account Overview at 1440 and the Orders and Products lists reproduce the Figma layout: positions of the sidebar, headers, cards, chips, buttons and tiles agree within a few pixels in the triplets. The seeded data in these shots is the e2e database (user "STONE Client", orders D-1048 and D-1032, one extra order D-9001).

## Defects (found by the first run; fixed in the final fix round, measured again)

| ID  | Screen                                       | Figma                                | Finding                                                                                                                                                                                                                               | Severity                                                                                                                                                                                                            |
| --- | -------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Sign-up and sign-in at 390                   | `431:3250`                           | The form block sat about 4 to 6 px higher than Figma: the "Back to products" link was 44 px high (the browser's `normal` line height of Inter is 22 px, Figma's is 19.4), and the labels and the sign-in row had the same 22 px line. | FIXED: explicit line heights below 1024 (back link 20 px = 40 px row, labels and the sign-in row 1.21, label gap 12 as Figma). Measured: form bottom 656 px, title top 254 px (Figma 656 and 255). 5.34 % to 2.60 % |
| D2  | Account Overview at 390                      | `737:6405`                           | The "Selected offers" card drew two thumbnails. Verified with `get_design_context`: Figma's banner is a fixed 194 px with `overflow: clip` and its slab row (84 px) lies below the clip, so the screen shows text only.               | FIXED: no thumbnails below 768 (the banner is 194 px). Height delta +108 to 0; 24.25 % to 5.99 %                                                                                                                    |
| D3  | Account Orders / Favorites / Profile at 1440 | `742:7324`, `742:11470`, `742:16191` | The sidebar was only as tall as its content, so on sparse pages it ended under "Sign out". Figma's sidebar spans the Shell: Orders 860 px (an empty "Saved" block drives it), Favorites 826 px, Profile 477 px.                       | FIXED: `SidebarFrame` keeps those heights as a minimum at 1440 (Overview stays content-height). Orders 39.93 % to 0.71 %, Favorites 37.50 % to 0.88 %                                                               |

No functional defect was found by this pass; the three visual ones are fixed (table above). Two stale comments (`api/me/route.ts`, `AccountStateProvider.tsx`: "public pages are SSG/ISR") were corrected in `docs: describe roles, security ...`; no behaviour changed.

## Not in Figma: states to approve from screenshots

These have no frame, so only the owner can approve them (the Task 3 to 5 screenshots are in the git-ignored `.superpowers` folder of the working copy; the shots are reproducible with the commands above): the sign-in screen (Create account layout, "No account? Create one"), the error states (red `#f0a8a0` on the dark photo, one uniform message for unknown email and wrong password), the "Sign-in is unavailable on this environment" state, the admin message below 1024 px ("The admin panel is available on screens from 1024 px"), the historical "next update" cards (superseded by the implemented Phase 4b sections), the empty states ("No orders yet" ...), and the Russian copy (all ru strings are drafts).

## Owner approval checklist (Phase 4a)

One list, consolidated from every task of Phase 4a. Tick or overrule each; a ticked box means "accepted as built".

Auth screens

- [ ] **Sign-in screen**: same layout as Create account (`431:3193`) with sign-in copy; it exists only as a decision, not as a Figma frame.
- [ ] **Error and unavailable states** on the auth screens (colours, copy, uniform message); the unavailable state when no database is configured.
- [ ] **Russian title layout**: the current 390 px capture displays the sign-up title on one line. Review the current RU wording and layout at both captured widths; the earlier two-line observation is superseded by the Phase 5 screenshots.
- [ ] **Sign-out page shell**: the confirmation sits inside the site shell, so a footer appears under the first screen and the 1440 header shows the language switch. Figma draws neither.
- [ ] "Show password" eye has one visual state (as drawn); the pressed state is `aria-pressed` and shows the text.

Account

- [ ] **Favorites**: the tile has a heart that removes the product (Figma draws an arrow only); the Overview tile heart also removes (Figma: a bare outline heart).
- [ ] **Profile**: no Phone row (there is no phone in the data model); the **password card** and the open state of the **Account sections** list (390) are not in Figma.
- [ ] **Orders**: the empty "Saved" heading and grid that Figma draws under the orders are not drawn. "**View order**" is inert (there is no order screen); Overview rows lead to the Orders list.
- [ ] **Heart flash**: for a signed-in visitor the hearts of static pages are unsaved for a moment after load until the account state arrives; the last tab flips from "Sign in" to "Account".
- [ ] **Tab bar fill** on account pages is denser than on the public pages (the idle labels failed contrast over the light page); Figma Account 390 draws it that way.
- [ ] **Account sections** label at 390 stays the generic "Account sections" (as Figma); the current section is added for screen readers only.
- [ ] The name falls back to the email's local part for accounts without a name; the Overview says "Demo order D-1048" (demo data is labelled).
- [ ] Showcase hearts on the home page are live on phone cards only (as drawn).
- [ ] The sidebar keeps the Figma shell height at 1440 on Orders (860 px), Favorites (826 px) and Profile (477 px) even when the page has little content (Figma's own content there includes a hidden "Saved" block and placeholder tiles).
- [ ] The Overview banner has no thumbnails below 768 (Figma draws them below a clip, so they are not visible).

Admin

- [ ] **No date range, no stock, no payment column or chip** (no data behind them; adding stock or payment is a data model change that needs approval). Overview shows "Published products" instead of stock; Orders has one status (In progress / Delivered) that an Admin can move either way.
- [ ] **Phase 4b sections and Overview requests**: the historical placeholders have since been replaced locally; review the current Customers, Promotions, Site content and Create Your Stone screenshots and their explicit demo limitations.
- [ ] **Add product** uses separate ru and en name and description fields (spec), the slug, a picture select from the existing catalog images (no upload yet) and a text storefront preview; Figma has one name, a photo area with thumbnails and "Add photo".
- [ ] **No admin language switch** (the URL locale is the language); **below 1024 px** a message replaces the admin (the Figma admin exists from 1024 only).
- [ ] **Unknown product URL**: `/{locale}/catalog/<unknown>` answers with a redirect to `/{locale}/404`, so the address bar changes (a Next 16.3.8 limit: `notFound()` cannot render a server-side 404 there).
- [ ] **The product page is no longer ISR** (spec section 2 said ISR): it is rendered per request, so admin edits show at once and unknown slugs are never cached. Cost: two small queries per product page view.

Security and hosting

- [ ] **Password hashing on Cloudflare Free** (scrypt vs the 10 ms CPU limit): verify on the preview after adding Neon (`docs/DEPLOYMENT.md`, 3.5). If sign-in fails with a CPU-limit error, replacing the hash with PBKDF2 is **your decision** (`docs/SECURITY.md`).
- [ ] **Neon on the preview and on production**: create the project, add the secrets, run migrate and seed (`docs/DEPLOYMENT.md`, section 3), and use strong unique passwords for the seeded users.
- [ ] **Known accepted risks** in `docs/SECURITY.md`: sign-up reveals a taken email; `GET /api/me` and `GET /api/health/db` are public by design; no email verification or password reset (no email service); a Client gets a 404 (not 403) on admin pages.
- [ ] **No email provider**: forgotten passwords cannot be reset on the test environment.

Carried over from Phase 2 and 3 (still open; details in `phase-2-components.md` and `phase-3-pages.md`)

- [ ] Placeholder prices: every price comes from Figma and is unconfirmed; the visible "Prices are illustrative" line stays until confirmed prices exist.
- [ ] Russian copy: every ru string except the Figma tab labels is a draft (now also all `auth.*`, `account.*` and `admin.*` strings).
- [ ] Inert controls that remain: Create Your Stone, Cart, Projects, Buy now, Add to cart, the custom-order CTA, the account Support and bell, "View order". (Favorites, the account entries and the "Sign in" tab are live since 4a.)
- [ ] Home footer is flat dark outside the backdrop (Figma: glass over a fade); the home backdrop is upscaled above 1440; 1920 and 1280 are approximations; seven product photos and the Our works images are low resolution.
- [ ] Tab bar contrast: inactive labels are 3.7 to 4.05:1 over light backdrops (Figma's own tokens); the tab bar reference at 390 is a baked flat render.
- [ ] Home carousel arrows disabled when nothing can scroll (D2 of Phase 3) and the home panel veil value (D1 of Phase 3).
- [ ] Colour filter groups, the old-price strike-through, the cost calculator limits, the sale filter without a visible indicator, carousel arrows without JavaScript, hero search hidden at 390, the language switch look (all Phase 3 lists).
- [ ] Phase 2 list: motion timings, glass approximation, invented button and field states, header breakpoint 1280, mobile menu, footer copyright year, Cyrillic serif fallback, icons source, long label truncation, the graphite search panel question (O1), the blur conversion rule.

## Evidence

Triplets, each `impl | figma | diff` (red = differing pixels), 520 px per panel:

| Screen                      | 1440 / 1024                                                                                              | 390                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Sign up                     | [1440](phase-4a/sign-up-1440-triplet.jpg)                                                                | [390](phase-4a/sign-up-390-triplet.jpg)           |
| Sign in (vs Create account) | [1440](phase-4a/sign-in-1440-triplet.jpg)                                                                | [390](phase-4a/sign-in-390-triplet.jpg)           |
| Sign out                    | [1440](phase-4a/sign-out-1440-triplet.jpg)                                                               | [390](phase-4a/sign-out-390-triplet.jpg)          |
| Account                     | [1440](phase-4a/account-1440-triplet.jpg)                                                                | [390](phase-4a/account-390-triplet.jpg)           |
| Orders                      | [1440](phase-4a/account-orders-1440-triplet.jpg)                                                         | [390](phase-4a/account-orders-390-triplet.jpg)    |
| Favorites                   | [1440](phase-4a/account-favorites-1440-triplet.jpg)                                                      | [390](phase-4a/account-favorites-390-triplet.jpg) |
| Profile                     | [1440](phase-4a/account-profile-1440-triplet.jpg)                                                        | [390](phase-4a/account-profile-390-triplet.jpg)   |
| Admin Overview              | [1440](phase-4a/admin-overview-1440-triplet.jpg), [1024](phase-4a/admin-overview-1024-triplet.jpg)       | -                                                 |
| Admin Products              | [1440](phase-4a/admin-products-1440-triplet.jpg), [1024](phase-4a/admin-products-1024-triplet.jpg)       | -                                                 |
| Admin Add product           | [1440](phase-4a/admin-add-product-1440-triplet.jpg), [1024](phase-4a/admin-add-product-1024-triplet.jpg) | -                                                 |
| Admin Orders                | [1440](phase-4a/admin-orders-1440-triplet.jpg), [1024](phase-4a/admin-orders-1024-triplet.jpg)           | -                                                 |
