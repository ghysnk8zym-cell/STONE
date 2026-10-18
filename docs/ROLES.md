# Roles and permissions

Three roles, one rule: **the server decides, on every request.** The UI hides what a role cannot use, but nothing relies on that. Verified against the code on 2026-10-18 (Phase 4a); the tests that keep it true are listed at the end.

| Role       | How you become one                                                                           | In the database                                                                   |
| ---------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Guest**  | No (valid) session cookie                                                                    | nothing                                                                           |
| **Client** | Sign up. Sign-up always creates a `client`; the role cannot be sent from any form or API     | `user.role = 'client'` (default)                                                  |
| **Admin**  | Only through `pnpm db:seed` (`SEED_ADMIN_EMAIL`). There is no screen or endpoint to make one | `user.role = 'admin'`; Phase 4b: Customers screen changes a role, never one's own |

An Admin is also a user: the account area works for them too (they just have no demo orders or favourites unless they create them).

## How a request is checked

1. `src/middleware.ts` (**not a security boundary**): a request to `/{locale}/account/*` or `/{locale}/admin/*` without a session cookie goes to `/{locale}/sign-in?next=<path>` (307). A cookie that is present proves nothing.
2. `src/server/auth/guards.ts`, called in the layout **and** in every page below it: `requireUser(locale)` or `requireRole("admin", locale)` read the session from the database (cookie cache off), so a revoked session or a changed role applies on the next request.
   - no valid session: redirect to `/{locale}/sign-in?next=<this page>` (`next` goes through `sanitizeNext`: internal paths of the same locale only);
   - signed in but not an admin: **404** (see below).
3. Every server action and route handler calls a guard as its **first statement**, before it reads or validates anything. A layout is not re-rendered on every client navigation, so the layout guard alone would not be enough.

## Routes

Locales `ru` and `en`; every route below exists in both. "404" is the site's own localised not-found page.

| Route                                                                                                                                 | Guest                                           | Client                 | Admin                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ---------------------- | ---------------------- |
| `/{locale}`, `/catalog`, `/catalog/[slug]` (unknown or unpublished slug: 307 to `/{locale}/404`)                                      | 200                                             | 200                    | 200                    |
| `/{locale}/sign-in`, `/sign-up`                                                                                                       | 200 (form, or "unavailable" without a database) | redirect to `/account` | redirect to `/account` |
| `/{locale}/sign-out`                                                                                                                  | redirect to the home page                       | 200 (confirmation)     | 200 (confirmation)     |
| `/{locale}/_styleguide`                                                                                                               | 200, `noindex`; 404 when `APP_ENV=production`   | same                   | same                   |
| `/{locale}/account`, `/account/orders`, `/account/favorites`, `/account/profile`                                                      | 307 to `sign-in?next=<path>`                    | 200                    | 200                    |
| `/{locale}/admin`, `/admin/products`, `/admin/products/new`, `/admin/products/[slug]`, `/admin/orders`                                | 307 to `sign-in?next=<path>`                    | **404**                | 200                    |
| `/{locale}/admin/create-your-stone`, `/customers`, `/promotions`, `/site-content` (Phase 4b; today a header and a "next update" card) | 307 to `sign-in?next=<path>`                    | **404**                | 200                    |

Below 1024 px the admin layout shows a localised message instead of the shell (owner decision); the status is still 200.

### Route handlers

| Handler              | Guest                                            | Client / Admin                                | Notes                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/me`        | `{ signedIn: false, name: null, favorites: [] }` | `{ signedIn: true, name, favorites: [slug] }` | Public **by design**: it is how the shell finds out who is looking. Reads only the caller's own session; returns no id, no email and only the caller's own favourites; `private, no-store`; any failure answers as a Guest.                                                                                                                                             |
| `GET /api/health/db` | `{ ok }` / 503 with a reason                     | same                                          | Public by design (a deployment check works before anyone signs in). Reveals ok / not ok only. Each hit runs `select 1`, which wakes a suspended Neon database: keep it out of uptime monitors.                                                                                                                                                                          |
| `/api/auth/*`        | **404** (the route does not exist)               | **404**                                       | Deliberately absent: the browser never calls Better Auth. Sign-in, sign-up, sign-out and the password change are server actions that call it in-process, so the rate limit and the origin check still apply and no Better Auth endpoint (`get-session`, `list-sessions`, `update-user` ...) is reachable over HTTP. Held by `tests/e2e/access.spec.ts` and a unit test. |

### Server actions

A server action is a public `POST` endpoint whatever the page shows, so each one checks its caller. Arguments are typed `unknown` and validated with zod inside.

| Action                                        | File                                 | Who can call              | What it can touch                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------ | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `signUpAction`, `signInAction`                | `src/app/[locale]/(auth)/actions.ts` | anyone (public by design) | creates / opens the caller's own session through the Better Auth handler (rate limit, origin check). Returns an error code and the typed email, never the session token. |
| `signOutAction`                               | same                                 | anyone (public by design) | ends the caller's own session (a Guest has none). Takes no user id.                                                                                                      |
| `toggleFavorite(slug, desired?)`              | `src/server/account/actions.ts`      | signed in (`requireUser`) | the session user's own favourites, for a published product only                                                                                                          |
| `updateProfileName(name)`                     | same                                 | signed in                 | the session user's own display name                                                                                                                                      |
| `changePassword(current, next)`               | same                                 | signed in                 | the session user's own password (current one required); ends the user's other sessions                                                                                   |
| `createProduct`, `updateProduct(slug, input)` | `src/server/admin/actions.ts`        | **admin** (`requireRole`) | any product and its ru / en copy; the slug never changes                                                                                                                 |
| `setProductPublished(slug, published)`        | same                                 | **admin**                 | publish / unpublish any product                                                                                                                                          |
| `setOrderStatus(number, status)`              | same                                 | **admin**                 | the status of any order                                                                                                                                                  |

None of the account actions takes a user id (or anything that names another user) from the caller: they act on the session's user. A Client calling an admin action directly is answered with the 404 of the guard, a Guest with the sign-in redirect.

## Why a Client gets a 404 on admin pages, not 403

Decision (spec section 4, "one, documented"): **404**. The admin area does not reveal that it exists to someone who has no business there; a 403 would confirm the path. The cost is that a Client who mistyped has no hint that the page exists for other roles, which is acceptable for a panel with one or two operators. A Guest is different: the middleware only sees "no cookie" and cannot tell a made-up path from a protected one, so a Guest is sent to sign-in with `next` (and after signing in as a Client, lands on the 404). That redirect reveals that a path is protected, not that it holds anything.

## The order-status rule

Orders have two statuses: **In progress** (`processing`) and **Delivered** (`fulfilled`). Only an Admin changes them, with `setOrderStatus`, and may move an order freely **in either direction** (a mistaken "delivered" must be undoable). There is no other state, no history and no payment status yet. The Client sees the new status in their Orders after the action revalidates the account area. A Client can never change an order, including their own.

## Adding a route, action or handler

1. Page or layout under `account/` or `admin/`: call `requireUser(locale)` / `requireRole("admin", locale)` in the page itself, not only in the layout, and add the path to `PUBLIC_ROUTES` in `src/lib/route-gate.ts` (the gate rewrites unknown paths to the 404 page; `tests/unit/route-gate.test.ts` fails when a page is missing).
2. Server action: put the guard (or a local helper whose first statement is one) on the first line. A new file must start with `"use server"` and live in a module the scan finds.
3. Route handler: guard it, or add it to `PUBLIC_ROUTE_HANDLERS` in `tests/unit/server-actions-guarded.test.ts` **with a reason** and add a row to the table above.
4. Add the path to `tests/e2e/access.spec.ts`.

## Tests that hold this

- `tests/unit/server-actions-guarded.test.ts` reads the source (TypeScript AST) and fails when an exported server action or route handler does not start with `requireUser` / `requireRole` (or a same-file helper that does), unless it is on a written allow-list with a reason. It also fails on an allow-list entry that no longer matches anything, on an inline `"use server"` it cannot see, and on exports it cannot verify (re-exports, non-functions).
- `tests/unit/auth-guards.test.ts`, `account-actions.test.ts`, `admin-actions.test.ts`: the guards and the actions against a real Better Auth on PGlite (no session, Client, Admin, expired, another user's data, a Client calling an admin action).
- `tests/e2e/access.spec.ts`: Guest / Client / Admin against every account and admin route in both languages (66 checks per viewport), plus a made-up session cookie that passes the middleware shortcut but not the guard.
