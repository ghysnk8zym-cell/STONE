# STONE page transitions — approved 2026-10-29

The owner selected options 1 + 2 and authorized publication to the existing TEST shop.
Public route content crossfades and rises 16px over 300ms. Header and navigation persist.
Catalog photos share identity with the matching first product photo, moving over 400ms.
Mobile uses 240ms/12px and 320ms. Account/cart use a 160ms fade.
Reduced motion disables all route animation. Unsupported browsers retain ordinary navigation.
Use the installed React/Next ViewTransition integration; no new dependency or interception of navigation.
React coordinates image readiness, async route commits and cancellation; unmatched or late content fades instead of morphing.
Catalog origin query and scroll are retained for explicit product return; history remains native.
No content, backend, auth, production domain or Figma changes.
