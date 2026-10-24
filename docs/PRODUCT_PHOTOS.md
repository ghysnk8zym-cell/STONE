# Product photo uploads

Local implementation approved on 2026-10-24. Cloud provisioning, remote database
migrations and deployment require separate owner approval.

## Editor and storefront

The product editor accepts JPEG, PNG and WebP originals up to 5 MiB each. A product
has up to eight ordered images; the first image is its card/main image. Admins can
select multiple files, make an image main, move it earlier/later, remove it from
the gallery, and add an existing catalog asset. To replace an image, add the new
one and remove the old one. At least one image is required when saving.

Uploads complete before Save draft / Publish / Save changes become available.
An upload does not publish the product. Completed uploads remain in the editor if
a later file fails. A failed save preserves the fields and selected images.

The browser applies image orientation, strips metadata and normalizes to PNG,
with a maximum side of 1600 pixels and a maximum encoded size of 2 MiB. It tries
smaller sizes down to 800 pixels when necessary. The server independently checks
the signature, dimensions, bounded inflation, PNG chunks, CRC and decoded bytes,
then re-encodes the image. SVG, animated formats and arbitrary external URLs are
not accepted. The existing private request-photo limits remain unchanged.

Published cards use the main image. The product page switches between real photos
without cropping them. Existing single-asset products retain their full/detail
view. No unrelated mobile styles or navigation were changed.

## Persistence and access

Migration `0007_product-media.sql` adds `product.gallery` and the `product_media`
registry. Product metadata and translations are still saved atomically with the
existing optimistic revision check. Registered upload IDs and dimensions are
checked before a product can reference them. Existing asset keys still work.

File bytes are separate from the database. In local PGlite mode they live under
`.data/product-images/`, outside `public/` and ignored by Git. Keep that directory
alongside the local database when restarting or backing up the local preview.
Local disk fallback is disabled for remote databases and APP_ENV=production.

The Cloudflare adapter expects the private R2 binding `PRODUCT_IMAGES`. Local
`env.test` configuration names the dedicated bucket `stone-test-product-images`.
This configuration is not deployed. Uploads fail honestly when storage is unavailable.

`POST /api/admin/product-images` requires an admin session and same-origin request,
and bounds the body while reading. A failed database registration attempts to
remove its newly written object. Clients and Guests cannot upload.

`GET /api/product-images/:id` serves bytes only if referenced by a published product
or requested by an admin. Draft/staged/removed images are private. Responses use
`private, no-store` so publication is checked again after removal or unpublishing.
The bucket itself must remain private; no public bucket URL is needed.

Removing a thumbnail detaches it on the next successful product save. Physical
objects are retained, including cancelled/abandoned uploads, to avoid deleting
files still referenced by another product or an unsaved editor. Automated orphan
collection is not included; review retention/cleanup before opening uploads to a
large catalog. A database restore must be coordinated with the object backup.

## Cloudflare connection

The owner approved connecting R2 on 2026-10-24 and activated the service before
continuation on 2026-10-25. The earlier API error 10042 is resolved. The dedicated
bucket `stone-test-product-images` now exists in the existing test-shop Cloudflare
account, with Standard storage class and location ENAM. The `r2.dev` endpoint is
disabled and no custom domains are connected.

This binding is prepared inside local `env.test` in `wrangler.jsonc`:

```jsonc
"r2_buckets": [
  { "binding": "PRODUCT_IMAGES", "bucket_name": "stone-test-product-images" }
]
```

Apply migration 0007 to the approved test database and grant the runtime role only
the required SELECT/INSERT access to `product_media` (plus its existing product
permissions). Do not run remote migrations at request time. Verify the Linux
OpenNext build, Worker size, real Worker PNG CPU/memory, R2 access, authentication,
upload, restart/reload, publication and revocation before publishing a release.
A 24 × 16 synthetic PNG was uploaded and downloaded through the authenticated R2
API; SHA-256 matched (`eecff1b857d8de1ca7c3d862ebc4392266603d961330e019c6350b1be1b1f0ee`).
The temporary `_checks/connection-2026-10-25.png` object was then deleted. This
verifies storage management access, not the not-yet-deployed Worker upload route.

The agent did not change subscription/billing settings, remote database or live
Worker bindings. Publishing the feature remains a separate approval after cloud
validation. Migration 0007, runtime table grants, commit/push, green Linux CI and
deployment of `stone-test` are still pending for this feature.

## Local checks

`tests/unit/product-media.test.ts` covers registered references, byte validation,
upload authorization/origin, storage failure, public access and revocation using
PGlite and isolated storage. `tests/unit/product-storage.test.ts` exercises the R2
adapter contract with a fake binding, without contacting Cloudflare.

The `product photos` scenarios in `tests/e2e/admin.spec.ts` exercise real local file
storage through the browser in RU/EN, draft persistence, main image, ordering,
removal, public desktop/mobile galleries and recoverable failures. Local results
are recorded in `docs/QA/2026-10-24-product-photos.md`.
