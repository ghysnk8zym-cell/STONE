# Test shop — cart and test checkout

**Date:** 2026-10-19
**Status:** Owner brief of 2026-10-19 ("finish and publish a fully working customer-review TEST shop") is the approved requirement; this spec records the design decisions derived from the existing code. No Figma frames exist for cart/checkout: screens reuse existing components and tokens only (owner approval from screenshots).

## Decisions

| Topic | Decision | Why |
|---|---|---|
| Unit | A cart line is an **area in m², 0.01 precision** (integer hundredths), default = the calculator's *order area* (surface + 10 % extra). Price is the product's current **price per m²** in USD cents (placeholder). Line total = `round(areaHundredths × priceCents / 100)` — the calculator's rounding. | Catalog prices are per m²; the calculator already defines order area and limits (0.01–10 000 m²). No pieces, no whole m², no new currency. |
| Guest policy | Guests can build a cart; **placing an order requires signing in or creating an account** (existing policy: orders belong to a user — `order.user_id NOT NULL`; favourites already send Guests to sign-in and back). Sign-in returns to `/cart`. | Follows the existing account model; nothing new is forced beyond what orders already require. |
| Cart storage | Browser `localStorage` (`stone.cart.v1`: `[{ slug, areaHundredths }]`, ≤ 20 lines). Survives refresh and sign-in in the same browser. Cleared after a successful order. | No server state needed for the demo; the server never trusts it. |
| Pricing | `quoteCart` (public, read-only server action) returns current names, images, prices, availability, line totals and the total from the database (static catalog without a DB). The browser total is display only. | "Validate availability, quantities and current prices on the server." |
| Checkout | `/[locale]/checkout` (signed in): summary + a prominent "Test order — no payment is taken" notice + "Place test order". `placeTestOrder({ items, key, expectedTotalCents })` re-quotes on the server; if the server total differs from what the customer saw it returns `prices_changed` with the fresh quote instead of ordering. | No card fields, no payment provider. |
| Persistence | One SQL statement (CTE): insert the order (`kind = 'test_checkout'`, number `T-<sequence>`, status `in_progress`, server total) and all items, guarded by a per-user demo cap; `ON CONFLICT (user_id, idempotency_key) DO NOTHING`. A retry with the same key and same content returns the existing order; same key + different content → `conflict`. Works on pg, PGlite and Neon HTTP (single statement). | Atomic, duplicate-safe, driver-independent (same pattern as public stone requests). |
| Confirmation | Shown only after the insert returns: redirect to `/[locale]/account/orders/[number]?placed=1` (new owner-only order page, also activates "View order"). | "Show an order number only after successful persistence." |
| Visibility | Customer: account Orders list + the new order page. Admin: existing Orders list/detail with status change (`in_progress` ↔ `delivered`, unchanged). Area lines display "2,20 м² × 240,00 $ / м²". Legacy demo orders keep "Quantity N". | Existing screens, existing statuses. |
| Permissions | `requireUser` for checkout and the order page (query filters by session user — another customer's number → 404); admin views stay `requireRole("admin")`. | Server-side ownership. |
| Test marking | A thin, non-dismissible "Test version — orders are not paid or delivered" banner in the site shell; order pages say "Test order". | "Clearly mark the site as a test/demo." |
| Navigation | Header "Cart" pill, mobile menu and tab bar Cart become live links; product "Add to cart" adds the calculator's order area; "Buy now" adds and opens the cart. Both disabled while the calculator input is invalid. | Removes the inert placeholders. |

## Data (additive migration 0006)

- `order.kind text not null default 'demo'` (check in `demo`, `test_checkout`), `order.idempotency_key uuid null`, `order.submission_digest text null`; unique index `(user_id, idempotency_key)` where key is not null; sequence `order_number_seq` start 2001.
- `order_item.area_hundredths integer null` (check 1–1 000 000), `order_item.line_total_cents integer null` (check ≥ 0). Area lines store `quantity = 1`; existing rows untouched.
- Demo cap: a soft limit of 50 test orders per user (counted inside the insert statement; not serialised, see docs/SECURITY.md).

## Limits and errors

- ≤ 20 lines, each 0.01–10 000 m², duplicates merged by slug; unknown/unpublished products → line marked unavailable and checkout blocked until removed.
- Errors: `unavailable` (no DB), `invalid`, `empty`, `product_unavailable`, `prices_changed`, `limit`, `conflict`, `generic` — all localised (ru/en).

## Tests

Unit/integration (PGlite): quote maths and rounding, validation bounds, unpublished product, price change, idempotent retry (same key twice → one order), conflicting retry, ownership (other user → null), demo cap, guard scan (checkout guarded; `quoteCart` allow-listed as public read-only). E2E: add from product page → cart persists after reload → guest sent to sign-in and back with cart intact → place test order → confirmation number → visible in account and admin → admin marks delivered → customer sees it; another client cannot open the order (404); empty cart state; invalid area error; RU/EN; 390 overflow; axe.
