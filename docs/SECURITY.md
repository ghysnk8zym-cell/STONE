# Security

Reference for the auth, session, database and admin setup (Phase 4a, ADR-002). Who may do what is in `docs/ROLES.md`; the owner steps to configure a deployment are in `docs/DEPLOYMENT.md`. Status: reviewed by an independent security review after Task 2 (auth core) and during Tasks 3 to 5, and audited as a whole at the end of Phase 4a (findings F1 to F11, handled below); Phase 4b gets its own review.

This is a **test environment with fake data and no real personal data** (ADR-002). The controls below are real nonetheless, because the code is meant to carry over to production. Production data residency (for example 152-FZ), a privacy notice and email verification are out of scope here and must be decided before a real launch.

## Threat model (summary)

| Threat                                                                                      | Control                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A Client or Guest uses an admin page or action                                              | Guards in every layout, page, server action and route handler (`docs/ROLES.md`); CI scan `tests/unit/server-actions-guarded.test.ts`; e2e matrix `tests/e2e/access.spec.ts`. The middleware is only a shortcut       |
| One user reads or changes another user's data                                               | Every account query and action filters by the session's user id; no action takes a user id from the caller                                                                                                           |
| Password guessing, credential stuffing                                                      | Rate limit per client IP and path, stored in the database; uniform error for unknown email and wrong password; scrypt hashing                                                                                        |
| Account enumeration                                                                         | Sign-in errors are identical (and Better Auth hashes on an unknown email too, so timing matches). Sign-up does reveal a taken email (accepted, below)                                                                |
| Open redirect through `next`                                                                | `sanitizeNext()` (`src/lib/safe-next.ts`) accepts internal paths of the current locale only; applied in the middleware, the guards and the actions                                                                   |
| CSRF                                                                                        | See "CSRF and origin checks"                                                                                                                                                                                         |
| Session theft                                                                               | `httpOnly`, `Secure`, `SameSite=Lax` cookie; database sessions that can be revoked; the token never reaches the browser's JavaScript or a server action result                                                       |
| Privilege escalation through sign-up or profile update                                      | `role` is `input: false`; an Admin exists only through the seed                                                                                                                                                      |
| Direct use of Better Auth's HTTP API (sessions, update-user, anything a later upgrade adds) | There is no public `/api/auth/*` route (404). The server actions call Better Auth in-process; only sign-in, sign-up, sign-out and change-password are reachable, and only through them (F1, which also settles F5)   |
| Names that read differently from what they are (bidi overrides, zero-width characters)      | Plain-text rule for every stored name and description: no control characters and no invisible formatting characters (`src/lib/plain-text.ts`), also enforced on Better Auth's own sign-up and update-user input (F2) |
| Clickjacking, `<base>` hijack, forms posting to another origin, MIME sniffing               | Response header baseline (CSP `frame-ancestors`, `base-uri`, `form-action`, `object-src`; `nosniff`; referrer and permissions policies; no `X-Powered-By`), see "Response headers" (F3, F11)                         |
| Seed turns an attacker's pre-registered account into an admin                               | The seed promotes an existing account only if it already holds `SEED_ADMIN_PASSWORD`; otherwise it refuses and stops                                                                                                 |
| Stored XSS through admin-edited texts                                                       | Product names and descriptions are plain text without control characters; React escapes all output; no `dangerouslySetInnerHTML` is used for stored data                                                             |
| Secrets in the browser bundle or in logs                                                    | Secrets are read only in `server-only` modules (`src/server/env.ts`), never `NEXT_PUBLIC_`; errors are logged by name and code only (driver messages can contain the connection URL)                                 |
| Indexing of a test environment or the admin area                                            | `X-Robots-Tag: noindex, nofollow` on every response unless `INDEXING=on`; the admin layout is `noindex` whatever the switch says                                                                                     |

## Authorization

- `src/middleware.ts` only checks that a session cookie is present for `/{locale}/account/*` and `/{locale}/admin/*`. It is not a security boundary.
- `requireUser()` and `requireRole("admin")` in `src/server/auth/guards.ts` validate the session against the database (the cookie cache is off, and `getSession` also passes `disableCookieCache`). Every protected layout, page, server action and route handler calls one of them, as the **first statement** of an action. A non-admin gets a 404 for admin pages (`docs/ROLES.md` explains the choice).
- Sign-up always creates a `client`. `role` cannot be set through sign-up or update-user (and there is no public route to either). An Admin exists only through `pnpm db:seed`.
- `next` redirect targets go through `sanitizeNext()`: only internal paths of the current locale are accepted; `//evil.com`, `https:evil.com`, `/\evil.com`, `%2F%2Fevil.com`, control characters, the sign-in and sign-up pages (a loop) and `/sign-out` are refused.
- The raw request headers carry whatever the client sent. The internal `x-stone-client-ip` header is ours alone: `callAuthEndpoint` and `getSession` delete a client-supplied value.

## Server actions and route handlers

- A server action is a public `POST` endpoint. Each one guards first, then validates its `unknown` arguments with zod, then acts on the session's user (account) or on admin data (admin).
- Call Better Auth through `callAuthEndpoint()` (`src/server/auth/next.ts`), not `auth.api.*`. It calls the Better Auth handler in-process, and only the handler applies rate limiting and the origin check. **There is no HTTP route to Better Auth** (`/api/auth/*` answers 404, F1): the browser never needs one, and a public catch-all would expose every endpoint Better Auth has now or gains in an upgrade (`get-session`, `list-sessions`, `update-user`, ...). `AuthEndpoint` lists the four endpoints the actions use.
- Names and images: the app validates names itself (length 1 to 80, trimmed, no control or invisible formatting characters, `src/lib/plain-text.ts`). A `hooks.before` in `src/server/auth/auth.ts` applies the same rule to Better Auth's own `sign-up/email` and `update-user` input and rejects any `image` (F2), so a future route or script cannot bypass it. Product names and descriptions in the admin actions follow the same rule (a description may also have line feeds).
- Sign-in and sign-up results contain the raw session token. Return only `toClientResult(result)` (a code and a status, never data) to the browser. Server actions return codes and the saved value only (`src/features/account/results.ts`, `src/features/admin/results.ts`).
- `GET /api/me` and `GET /api/health/db` are public by design (`docs/ROLES.md`). Both are `no-store`. `/api/health/db` runs `select 1` per hit: do not point a short-interval uptime monitor at it (it keeps a free Neon database awake and spends compute hours).

## CSRF and origin checks

- **Server actions:** Next.js compares the `Origin` header with the host of the request and rejects a mismatch. Session cookies are `SameSite=Lax`, so a cross-site `POST` does not carry them anyway. There is no `allowedOrigins` setting; the app is served from one host. If a deployment sits behind a proxy that rewrites the `Host` header, forward `X-Forwarded-Host` so the two agree.
- **Better Auth calls** (the in-process calls of our actions; there is no HTTP route): the origin check is on (`disableOriginCheck: false`, `disableCSRFCheck: false`; Better Auth would switch it off under `NODE_ENV=test`, so it is set explicitly). Trusted origins are the origins of `BETTER_AUTH_URL` and `SITE_URL`. A `POST` with a foreign or missing `Origin` is refused (403, tested).
- **Sign-out** is a `POST` server action; a `GET` (or a link prefetch) only renders the confirmation question.
- The base URL used for the internal request to Better Auth is the configured one, otherwise the request host over https (plain http only for `localhost`); `X-Forwarded-Proto` is ignored on purpose.

## Cookies and sessions

- The session cookie is `stone.session_token` (`__Secure-stone.session_token` over https): `httpOnly`, `SameSite=Lax`, `Path=/`, `Secure`. The only exception is a base URL of plain-http `localhost`.
- If neither `BETTER_AUTH_URL` nor `SITE_URL` is set, cookies are Secure unless `APP_ENV=development`, the default. **A Node host must therefore set `APP_ENV=production` (or an https `BETTER_AUTH_URL`).** Otherwise its cookies are not Secure.
- Sessions live 7 days and are refreshed at most once a day. They are database rows: signing out deletes the row and clears the cookie; changing the password ends every other session of the user and **rotates this one** (a new token and cookie, so a token that leaked before the change is dead, F6). A changed role or a revoked session applies on the next request, because nothing is cached.

## Rate limiting

- Better Auth stores rate limits in the `rate_limit` table, keyed by client IP and path, so the limit holds across Worker isolates and Node processes. The limits are sign-in 10/min, sign-up 5/min, change-password 5/min and everything else 100/min (`RATE_LIMIT_RULES` in `src/server/auth/auth.ts`). Counted on every attempt, successful or not.
- The client IP comes from the platform adapter (`clientIp` in `src/server/platform`). The auth entry points copy it into an internal header and overwrite any value the client sent.

| Host                                                                                 | IP source                          | Condition and caveat                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare Workers** (the test environment)                                        | `cf-connecting-ip`                 | Cloudflare sets it at the edge and overwrites a client value. There is no other way to reach the Worker, so it cannot be forged.                                                                                                                                                                                                                                                                         |
| **Node behind one proxy** (Vercel, Netlify, nginx with `$proxy_add_x_forwarded_for`) | the **last** `X-Forwarded-For` hop | The proxy must overwrite or append to `X-Forwarded-For`; the last hop is the address the proxy saw. If clients can reach `next start` directly, they choose the value and can evade the limit.                                                                                                                                                                                                           |
| **A Node origin behind Cloudflare** (`CF -> Node`)                                   | last `X-Forwarded-For` hop         | Cloudflare appends the client address, so the last hop is the client. **The origin must accept connections only from Cloudflare's IP ranges** (firewall or Authenticated Origin Pulls); otherwise anyone can talk to it directly and choose the header.                                                                                                                                                  |
| **`CF -> nginx -> Node`**                                                            | last `X-Forwarded-For` hop         | nginx appends the address it saw, which is the Cloudflare **edge** IP. Every visitor behind that edge shares one bucket: legitimate users lock each other out after 10 sign-in attempts a minute. Fix on nginx: restore the real address with the `real_ip` module (`set_real_ip_from <Cloudflare ranges>; real_ip_header CF-Connecting-IP;`) and pass `proxy_set_header X-Forwarded-For $remote_addr;`. |
| **Hops with a port** (`203.0.113.7:51234`, as some Azure services send)              | last hop, **not validated**        | Better Auth's IP check refuses the value and the request falls into the shared "no IP" bucket (and the one-time warning does not fire). Strip the port at the proxy.                                                                                                                                                                                                                                     |

- Without any client IP, all requests share one bucket per path and a warning is logged once ("rate limiting falls back to one shared bucket"). That is safe (stricter), but one visitor can lock the others out.
- The e2e server runs behind no proxy; `tests/e2e/auth-fixtures.ts` gives every test its own `X-Forwarded-For` so tests never share a bucket.

## Passwords

- Hashing is Better Auth's default, **scrypt**, with its own salt per user; verification is constant-time. Minimum 8 and maximum 128 characters (the maximum bounds the hashing cost an attacker can request).
- **Workers Free CPU risk.** Workers Free allows about 10 ms of CPU per request. A scrypt hash with Better Auth's parameters takes tens of milliseconds on a normal server CPU, so sign-in and sign-up **may fail on the Cloudflare preview** with a CPU-limit error (Worker exceeded CPU time limit, Cloudflare error 1102). It cannot be tested locally, only on the preview once Neon is configured (`docs/DEPLOYMENT.md`, section "Check the preview"). If it fails, the options are: (a) a Workers Paid plan (rejected by the owner so far: no paid plan); (b) replace the hash with WebCrypto **PBKDF2** through Better Auth's `emailAndPassword.password.hash` / `verify` override (native code, far cheaper than scrypt written in JavaScript; the iteration count must be measured on the preview, because a count that is strong enough may still be tight inside 10 ms); (c) host the test environment on a Node platform. **Choosing (b) is the owner's decision**: it changes how passwords are stored, so existing seed users must be recreated after the switch. Do not change the algorithm without that decision.

## Accounts and email

- Errors for an unknown email and a wrong password are identical (`INVALID_EMAIL_OR_PASSWORD`, 401).
- There is **no email service** on the test environment. Consequences: no email verification (an address is not proven to belong to the person who typed it), no password reset ("I forgot my password" has no answer; an Admin would have to reseed or edit the database), no email change, no notifications. A real launch needs an email provider (SPF/DKIM/DMARC) before any of these is turned on.
- Better Auth logs at the error level only, because lower levels log email addresses (a duplicate sign-up is logged at info). Telemetry is off.

## Database and seed

- All database code is in `src/server/db`. Queries are built with Drizzle (parameterised); there is no string-built SQL with user input.
- Migrations are committed (`drizzle/`) and applied with `pnpm db:migrate`. The Neon driver is the HTTP one (no persistent connection); admin writes use one atomic unit (`db.batch` on Neon, a transaction elsewhere).
- Seed rules (`pnpm db:seed`, `src/server/db/seed.ts`):
  - the Admin and the Client are created through Better Auth's hashing; emails are lowercased; passwords come from `SEED_*` and are never printed (the seed prints counts only);
  - it only inserts missing rows and never overwrites products, translations or orders an admin has edited;
  - an existing account is promoted to Admin only if it already holds `SEED_ADMIN_PASSWORD`; otherwise the seed throws `SeedRefusalError` (names variables, never values) and stops. If `SEED_ADMIN_EMAIL` was pre-registered by someone else, the seed refuses rather than hand them the role;
  - it refuses a remote database (anything but `pglite://` or a postgres URL on `localhost`) unless `SEED_ALLOW_REMOTE=1` is set, and then only with a `SEED_ADMIN_PASSWORD` of at least 16 characters (the refusal names the variable, never the value; F4);
  - the demo orders and favourites attach to the account that holds `SEED_CLIENT_EMAIL`; if someone pre-registered that address, the (fake) demo data attaches to their account (low).
- Use strong, unique passwords for the **preview** seed users: the preview is reachable by anyone who has the URL, and the Admin account can edit the catalog.
- Tests and CI use a throwaway PGlite database and the obviously fake values of `.env.test.example`. They never touch Neon.

## Secrets inventory (names only)

| Name                                                                                   | Purpose                                               | Where it lives                                                            | Notes                                                        |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`                                                                         | Postgres connection string (contains the password)    | Cloudflare Workers Secret; local `.env.local`; the shell for migrate/seed | Secret. Never in the repository, logs or chat.               |
| `BETTER_AUTH_SECRET`                                                                   | Signs and encrypts auth data (at least 32 characters) | Cloudflare Workers Secret; local `.env.local`                             | Secret. Changing it signs everyone out.                      |
| `BETTER_AUTH_URL`                                                                      | Public base URL; trusted origin; cookie `Secure` flag | Workers variable or Secret                                                | Not secret, but wrong value breaks sign-in (origin check).   |
| `SITE_URL`                                                                             | Public base URL (also a trusted origin)               | Workers variable                                                          | Not secret.                                                  |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_CLIENT_EMAIL`, `SEED_CLIENT_PASSWORD` | Test users created by the seed                        | Local shell or `.env.local` when seeding; optionally kept as Secrets      | The running site never reads them; only `pnpm db:seed` does. |
| `SEED_ALLOW_REMOTE`                                                                    | Allows the seed to write to a remote database         | Local shell only, for one command                                         | Never set it permanently.                                    |
| `.env.test.example` values                                                             | Fake values for the e2e server                        | Committed on purpose                                                      | Obviously fake; never use them anywhere real.                |

`.env*` is git-ignored except `.env.example` and `.env.test.example`. No secret is ever committed, pasted into a pull request, printed by a script or entered into a web dashboard by an agent.

## Response headers

Every response carries (`src/server/security-headers.ts`, applied by `next.config.ts`; the same lines are in `public/_headers` for the static files that bypass Next, and `tests/unit/next-config.test.ts` keeps them equal; `poweredByHeader` is off):

| Header                    | Value                                                                            |
| ------------------------- | -------------------------------------------------------------------------------- |
| `Content-Security-Policy` | `frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'` |
| `X-Content-Type-Options`  | `nosniff`                                                                        |
| `Referrer-Policy`         | `strict-origin-when-cross-origin`                                                |
| `Permissions-Policy`      | `camera=(), microphone=(), geolocation=()`                                       |
| `X-Robots-Tag`            | `noindex, nofollow` unless `INDEXING=on`                                         |

**No `script-src` yet, on purpose.** Next's own inline bootstrap scripts need a per-request nonce, which means a middleware nonce and dynamic rendering of every page; that would give up the static home page and is a larger change than a baseline. A Report-Only script policy is also deferred: it would only produce noise until the nonce exists. HSTS is left to the host (Cloudflare and Vercel send it on their own domains; set it on the custom domain at launch).

## Accepted for the test deployment

These are known and accepted while the site holds fake data and the audience is the owner and testers.

1. **Sign-up reveals a taken email** ("this address is already registered"). Accepted in the spec; the sign-in screen does not reveal anything. Mitigated by the 5/min sign-up limit per IP.
2. **`GET /api/me` is public.** By design. It answers only for the caller's own session and returns no id or email.
3. **`GET /api/health/db` is public** and wakes a suspended Neon database.
4. **No email verification, no password reset** (no email service).
5. **F5 (resolved by F1).** Better Auth's own HTTP surface is not exposed, so its per-endpoint behaviour (session listing, `update-user`, ...) is not reachable and needs no separate review until a route is added.
6. **F4, partly handled.** The remote seed needs an admin password of at least 16 characters. Still open: the sign-in limit is per IP and path, **not per email**, so a distributed attack on one admin address is not slowed down; the admin has **no second factor**; a session lives **7 days**. Acceptable with fake data; see "Before production".
7. **F7: previews and production share one Neon project and secret** until real data exists. Anyone with a preview address (every pull-request branch has one) talks to the same database and the same `BETTER_AUTH_SECRET`. Fine for fake data. **Before any real data:** a separate Neon branch (own `DATABASE_URL`) and a separate `BETTER_AUTH_SECRET` for previews, so a preview can never read or sign for production.
8. **F8: no edge rate limit.** The auth rate limit lives in the database and counts only sign-in, sign-up and change-password. Server actions in general (favourites, admin writes) and `/api/*` have none, and a burst spends Worker and Neon quota. **Before production:** a Cloudflare rate-limiting rule for `POST` requests that carry a `Next-Action` header and for `/api/*` (Security, WAF, Rate limiting rules; verify in the current dashboard), for example 60 requests a minute per IP, plus a lower limit on the sign-in and sign-up pages.
9. **Workers Free CPU limit vs scrypt** (see "Passwords"): open until checked on the preview; the fix is an owner decision.
10. **A signed-in visitor sees an unsaved heart for a moment** on a full page load of a static page, until `/api/me` answers. Cosmetic.
11. **The 404 for unknown products is a 307 to `/{locale}/404`** (Next 16.3.8 cannot render a server-side 404 from a `notFound()` thrown during render); the URL changes. Not a security issue, listed because the owner decides on it.
12. **Rate limiting depends on how the host supplies the client IP** (table above). A host that does not meet its row weakens or over-tightens the limit.
13. **The Neon batch write path is tested only against a fake handle** here; it runs for real for the first time on the preview.
14. **Cloudflare Workers Free has request and CPU quotas**: a burst of traffic can make the preview return errors. It is a test environment.
15. **No `script-src` in the CSP** (see "Response headers").

## Before production

In this order of importance:

1. **Real data separation (F7):** a separate Neon branch and `BETTER_AUTH_SECRET` for previews; production secrets never set on preview deployments.
2. **Brute-force and abuse limits (F4, F8):** a per-email sign-in limit (counted by normalised email, in addition to the per-IP one), the Cloudflare rate-limiting rule for `Next-Action` POSTs and `/api/*`, and an alert on repeated sign-in failures for the admin address.
3. **Admin hardening (F4):** a second factor for the Admin (Better Auth two-factor plugin or the identity provider of the company), a shorter admin session (for example 8 hours with re-authentication for destructive actions), and a way to list and revoke sessions.
4. **Email:** a provider (SPF, DKIM, DMARC), email verification and password reset.
5. **Password hash:** the decision on scrypt vs PBKDF2 vs Argon2 on a paid plan (see "Passwords").
6. **Headers:** a nonce-based `script-src` (and `style-src`), first as Report-Only, then enforced; HSTS on the real domain.
7. **Launch switches:** `INDEXING=on` and the removal of the noindex rule in `public/_headers`; `APP_ENV=production`; a real domain in `BETTER_AUTH_URL`.
8. **Compliance:** data residency and a privacy notice (for example 152-FZ), and a second security review of 4b.
