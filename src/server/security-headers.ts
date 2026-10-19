// No `server-only` import: next.config.ts uses this module at build time.

/*
 * The response header baseline (Phase 4a security audit F3). Sent on every response by next.config.ts and, for the files
 * served straight from static assets (Cloudflare, Netlify), repeated in public/_headers; tests/unit/next-config.test.ts
 * keeps the two in step.
 *
 * Content-Security-Policy has no `script-src` and no `default-src` ON PURPOSE: Next's own inline bootstrap scripts need a
 * per-request nonce (middleware plus dynamic rendering of every page) before a script policy is possible.
 * That infrastructure is deferred and documented in docs/SECURITY.md ("Before production"). What is here
 * has no such cost: no framing (clickjacking), no <base> hijack, forms and server actions post to this origin only, no
 * plugins.
 */
export const CONTENT_SECURITY_POLICY =
  "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'";

export function securityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
  ];
}
