# Security

Short reference for the auth setup (Phase 4a, ADR-002). The Phase 4 security review extends this file.

## Authorization

- `src/middleware.ts` only checks that a session cookie is present for `/{locale}/account/*` and `/{locale}/admin/*`. It is not a security boundary.
- `requireUser()` and `requireRole("admin")` in `src/server/auth/guards.ts` validate the session against the database (the cookie cache is off). Every protected layout, page, server action and route handler calls one of them. A non-admin gets a 404 for admin pages.
- Sign-up always creates a `client`. `role` cannot be set through sign-up or update-user. An Admin exists only through `pnpm db:seed`, and the seed promotes an existing account only if it already holds `SEED_ADMIN_PASSWORD`. Otherwise the seed refuses and stops.
- `next` redirect targets go through `sanitizeNext()` (`src/lib/safe-next.ts`): only internal paths of the current locale are accepted.

## Server actions

- Call Better Auth through `callAuthEndpoint()` (`src/server/auth/next.ts`), not `auth.api.*`. Only the handler applies rate limiting and the origin check.
- Sign-in and sign-up results contain the raw session token. Return only `toClientResult(result)` to the browser.

## Cookies

- The session cookie is `httpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` with the `__Secure-` prefix. The exception is a base URL of plain-http `localhost`.
- If neither `BETTER_AUTH_URL` nor `SITE_URL` is set, cookies are Secure unless `APP_ENV=development`, the default. **A Node host must therefore set `APP_ENV=production` (or an https `BETTER_AUTH_URL`).** Otherwise its cookies are not Secure.

## Rate limiting

- Better Auth stores rate limits in the `rate_limit` table, keyed by client IP and path. The limits are sign-in 10/min, sign-up 5/min, change-password 5/min and everything else 100/min (`RATE_LIMIT_RULES` in `src/server/auth/auth.ts`).
- The client IP comes from the platform adapter (`clientIp` in `src/server/platform`). The auth entry points copy it into an internal header and overwrite any value the client sent.
  - **Cloudflare Workers:** `cf-connecting-ip`, set by Cloudflare. A client cannot forge it.
  - **Node hosts:** the **last** `X-Forwarded-For` hop. This is correct only when the Node server sits behind exactly one reverse proxy that overwrites or appends to `X-Forwarded-For` (Vercel, Netlify, nginx with `$proxy_add_x_forwarded_for`). If clients reach a bare `next start` directly, they choose the value and can evade the limit. Behind several proxies, the last hop is the inner proxy, and all clients share its bucket.
- Without any client IP, all requests share one bucket per path, and a warning is logged once.

## Accounts

- Errors for an unknown email and a wrong password are identical (`INVALID_EMAIL_OR_PASSWORD`, 401). Sign-up reports an email that is already taken (accepted in the spec).
- There is no email service on the test environment, so there is no email verification and no password reset.
- Better Auth logs at the error level only, because lower levels log email addresses.

## Known risks

- Workers Free has a 10 ms CPU limit, and scrypt password hashing (Better Auth's default) may exceed it on sign-in and sign-up. This needs checking on the preview once Neon is configured. Replacing the hash is an owner decision.
