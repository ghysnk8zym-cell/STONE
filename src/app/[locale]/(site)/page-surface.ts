/**
 * Pages on the light catalog surface mark their root element (a direct child of `<main>`) with
 * `data-page-surface="catalog"`; the shell layout then paints that surface behind the translucent glass
 * header and footer (see `layout.tsx`). Task 7 product pages use the same marker.
 */
export const PAGE_SURFACE_ATTR = "data-page-surface";
export const PAGE_SURFACE_CATALOG = "catalog";
