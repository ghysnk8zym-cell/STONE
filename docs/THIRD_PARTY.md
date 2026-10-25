# Photo conversion notices

Product photo preparation optionally loads **heic-to 1.6.6** (Hopper Gee) in a
browser worker, under LGPL-3.0. The package is unmodified. Its source and build
instructions are available at <https://github.com/hoppergee/heic-to/tree/v1.6.6>.
The installed version is pinned in `package.json` and `pnpm-lock.yaml`.

- Library license: `/licenses/heic-to-LGPL-3.0.txt`.
- The decoder embeds libheif 1.23.6 and libde265 1.0.16, per the upstream build
  instructions. libheif notices and license texts: `/licenses/libheif-COPYING.txt`.
- libheif source: <https://github.com/strukturag/libheif/tree/v1.23.6>.
- libde265 source and notices: <https://github.com/strukturag/libde265/tree/v1.0.16>.

The application integration is in `src/features/admin/prepare-product-photo*`.
To reproduce it or substitute an interface-compatible decoder, install the
locked dependencies and run the project's ordinary build commands. The decoder
is loaded separately from the initial editor code; no original photos leave the
device until the prepared PNG is sent to STONE's existing upload endpoint.
