# Public stone request demo

Owner approved parameters + photo submission with no real online payment on
2026-10-18, overriding the older Phase 4 exclusion. Deliverable: customer-approval
demo and source handover, synthetic data only. No remote write or new service.

## Design and behavior

Figma read-only contexts/screenshots: public 849:23559 (1440), 849:24247 (390),
admin 1077:52818. Existing inventory contains the public page despite the older
Phase 4 text saying there was no screen. Reuse shell, light Product/TextField,
Graphite Button, icons and current admin layout. Sections: reference upload and
preview; material/color/texture, dimensions/quantity; name/email/optional phone.
Responsive layout, keyboard focus, validation, pending/error/success and remove/
replace photo states must work. Preview is user-provided imagery, not a fixed asset.

The page is public; submission requires the existing Client/Admin session. Explain
this before data entry and link to sign-in with a return path. No new auth provider.
The confirmation is owner/admin-only and survives reload. No public request list.
Submitting creates a New request in the existing admin list; quote/status remains
tracking only. Do not label seeded requests as actual customer submissions.

## Persistence and safety

Use the existing Postgres/PGlite adapter: one request row includes a bounded canonical
PNG encoded as base64. This is a deliberately small demo adapter, not general media
storage. It avoids a new account/bucket and a filesystem path tied to one instance.
Photo bytes are excluded from list DTOs and delivered only through an owner/admin
route with no-store, nosniff and restrictive CSP. No public asset URLs or image proxy.

Browser accepts JPEG/PNG/WebP up to 5 MiB, converts and reduces to a preview PNG
up to 512 px and 512 KiB. Copy explains that the optimized reference is retained,
not the original. Server independently validates PNG signature, dimensions,
noninterlaced 8-bit RGB/RGBA, chunks/CRC and input/output size; decode/reencode
strips metadata. SVG, animated/active content and malformed files are rejected.
Reuse installed pngjs 7, promoting its existing declaration to runtime, no install.
Public zlib preflight caps inflated output at 2 MiB and requires exact scanline
length before streaming decode. Local workerd verifies normal images and rejection
of an oversized expansion; deployed Cloudflare CPU remains unmeasured.

Server derives owner, New status, revision and sequence number. UUID submission key
is scoped to owner; normalized fields/photo digest detects mismatched replay.
Rate-limit attempts before decode using an atomic database update. A single locked
demo-budget row atomically increments global/per-owner counters with the request
insert (50 public submissions total, 10 per owner). The photo and request commit
together; unique conflicts roll back quota increments. No COUNT-based race or
MAX+1 numbering. Existing seed records do not consume the public demo quota.

Default 1 MiB Next action body limit remains. Enforce same-origin explicitly as well
as Next's action check. No arbitrary filesystem paths, remote image fetches, contact
delivery, storage provisioning or payment integration.

## Verification

Unit/integration: malformed/oversized/animated/interlaced PNG, bounded decode and
canonicalization, field validation, real local PGlite + Better Auth owner/admin
guards, missing/expired session, replay/conflict, concurrent quota/idempotency,
atomic insert/photo and private delivery/cache headers. Browser: both locales,
desktop/mobile, upload/replace/remove, error/pending/success, submit/admin/reload,
cross-user/guest denial, narrow widths, axe and keyboard, restart persistence.
Independent read-only security/design/code review before completion.

Local fixture success does not establish remote Neon/Workers behavior. Remaining
deployment actions include reviewed migration 0005 and existing Preview credentials,
Linux build/size plus decoder/auth CPU verification. No remote action is authorized
by this document.
