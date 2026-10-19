# Public request and photo demo

Owner-approved scope (2026-10-18): a customer-approval demo accepting stone
parameters and a photo, without real online payment, followed by source handover.
Only fictional contacts and non-sensitive synthetic reference images are allowed
in the approved test database. No real message is sent by submitting a request.

## Try locally

Follow README's existing PGlite quickstart. Open `/en/create-your-stone` or its RU
equivalent and sign in as the local Client. Choose a JPEG, PNG or WebP up to 5 MiB,
select material, enter color/texture, whole-number dimensions in millimetres and
quantity (1–10,000), name/email and optional phone. The optimized PNG is stored,
not the original. A success message appears only after the database confirms saving.

Reload the private confirmation: parameters and photo remain. In a separate desktop
session sign in as Admin and open `/en/admin/create-your-stone`; the new request,
contact snapshot and photo appear beside the existing quote/status editor. The
admin interface still requires at least 1024 px; the public form supports phones.
Another Client and Guests cannot fetch the image or confirmation. Existing seeded
catalog references remain unchanged. Sending proposals and taking payments stay disabled.

## Storage and handover

Migration `0005_public-stone-requests.sql` is additive: nullable submission/contact/
photo fields, an owner/key unique index, a sequence for request numbers, and a
single-row demo budget. PGlite migrates locally; no remote migration is implied.
Base64 PNGs live in the existing Postgres database, avoiding a new bucket/account
and instance-specific filesystem storage. At the 50-request limit, photo data is
at most approximately 33.4 MiB in base64, excluding row/index overhead. Per-owner
limit is 10. Limits are lifetime counters, including after record deletion; do not
reset them casually on a shared demo. No reset/delete control is exposed.

After an uncertain response, retry unchanged input or reload the same tab to recover
the saved record. Only an owner-scoped submission UUID is retained in sessionStorage.
If browser storage is unavailable, keep the page open until saving finishes. Closing
that tab before confirmation can lose the recovery key; administrators can still
find committed requests. Starting another request deliberately creates a new key.

For migration to another host, move the database through the team's approved backup
procedure, apply schema migrations with DDL credentials, and run the same Node build
with a least-privilege runtime database role. The new sequence additionally requires
USAGE; the budget table needs SELECT/UPDATE. Database backups now contain contact
snapshots and private images and must not enter a source archive.

## Release checks still required

Local tests and workerd are not a deployed preview. Keep `INDEXING=off`. Configure
an exact approved `BETTER_AUTH_URL` or `SITE_URL` for preview/production and verify
its origin/cookies; the form is disabled when deployment prerequisites are absent.
Remote credentials/roles, migration 0005, Neon HTTP write/concurrency verification,
Linux OpenNext build and compressed size, real Worker auth/image CPU, deployment,
and customer acceptance remain separate gates. No cloud resources or access changes
were made by this feature. See `docs/QA/public-request-demo.md` for local evidence.
