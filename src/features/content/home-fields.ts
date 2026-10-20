/** Fixed Home v2 text surface. Links, assets and price notices are not editable. */
export const HOME_FIELDS = {
  "hero.line1": { section: "hero", label: "line1", max: 32 },
  "hero.line2": { section: "hero", label: "line2", max: 32 },
  "hero.line3": { section: "hero", label: "line3", max: 32 },
  "hero.line4": { section: "hero", label: "line4", max: 32 },
  "hero.searchPlaceholder": { section: "hero", label: "searchButton", max: 32 },
  "hero.searchLabel": { section: "hero", label: "searchLabel", max: 80 },
  "sections.catalog": { section: "catalog", label: "heading", max: 60 },
  "actions.openCatalog": { section: "catalog", label: "button", max: 32 },
  "sections.promo": { section: "promo", label: "heading", max: 60 },
  "actions.offers": { section: "promo", label: "button", max: 32 },
  "sections.works": { section: "works", label: "heading", max: 60 },
  "actions.projects": { section: "works", label: "button", max: 32 },
  "works.marble-kitchen-countertop.title": {
    section: "works",
    label: "kitchenTitle",
    max: 120,
  },
  "works.marble-kitchen-countertop.subtitle": {
    section: "works",
    label: "kitchenSubtitle",
    max: 200,
  },
  "works.natural-stone-fireplace-portal.title": {
    section: "works",
    label: "fireplaceTitle",
    max: 120,
  },
  "works.natural-stone-fireplace-portal.subtitle": {
    section: "works",
    label: "fireplaceSubtitle",
    max: 200,
  },
  "works.bathroom-cladding.title": {
    section: "works",
    label: "bathroomTitle",
    max: 120,
  },
  "works.bathroom-cladding.subtitle": {
    section: "works",
    label: "bathroomSubtitle",
    max: 200,
  },
} as const;
export type HomeTextKey = keyof typeof HOME_FIELDS;
export const HOME_TEXT_KEYS = Object.keys(HOME_FIELDS) as HomeTextKey[];
export const HOME_SECTIONS = ["hero", "catalog", "promo", "works"] as const;
export type HomeSection = (typeof HOME_SECTIONS)[number];
export type HomeText = {
  values: Record<HomeTextKey, string>;
  defaults: Record<HomeTextKey, string>;
  stored: Record<HomeTextKey, string | null>;
};
export function isHomeTextKey(value: string): value is HomeTextKey {
  return Object.hasOwn(HOME_FIELDS, value);
}
export type HomeTextResult =
  | { ok: true; text: string | null }
  | { ok: false; code: "invalid" | "conflict" | "unavailable" };
