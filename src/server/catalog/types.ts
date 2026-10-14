export const MATERIALS = [
  "marble",
  "limestone",
  "slate",
  "sandstone",
  "quartzite",
  "concrete",
] as const;
export type Material = (typeof MATERIALS)[number];

// Values exactly as shown on the 12 product screens (Figma "Product / *", 1440).
export const COLORS = [
  "black",
  "grey",
  "taupe",
  "graphite",
  "white",
  "golden-beige",
  "charcoal",
  "dark-grey",
  "silver-grey",
  "grey-and-rust",
] as const;
export type Color = (typeof COLORS)[number];

// Groups of the Catalog Color filter dropdown (Figma 922:25562).
export const COLOR_GROUPS = ["dark", "grey", "light", "warm"] as const;
export type ColorGroup = (typeof COLOR_GROUPS)[number];

export const FINISHES = ["polished", "honed", "split-face", "chipped", "smooth"] as const;
export type Finish = (typeof FINISHES)[number];

export const SORTS = ["name-asc", "name-desc", "price-asc", "price-desc"] as const;
export type CatalogSort = (typeof SORTS)[number];

export type Product = {
  slug: string;
  material: Material;
  color: Color;
  /** Catalog filter group for `color`. */
  colorGroup: ColorGroup;
  finish: Finish;
  /** length x width x thickness, mm */
  formatMm: readonly [number, number, number];
  /** price per m2, integer cents */
  priceCents: number;
  oldPriceCents?: number;
  /** Badge value stored verbatim from Figma (not computed). */
  discountPercent?: number;
  isPlaceholder: true;
  /** manifest key `images/catalog/<slug>`: cards and the product page main image. */
  image: string;
  /** "contain" for the studio slabs (Black Marble, Grey Limestone, Grey Marble). */
  imageFit: "cover" | "contain";
  /** Figma 1440 product screen node id. */
  figmaNode: string;
};

export type CatalogQuery = {
  material?: Material;
  color?: ColorGroup;
  finish?: Finish;
  sale?: true;
  sort: CatalogSort;
  q?: string;
};

export type Localizer = {
  name(slug: string): string;
  material(m: Material): string;
};

export interface CatalogRepository {
  list(query: CatalogQuery, l10n: Localizer): Promise<Product[]>;
  getBySlug(slug: string): Promise<Product | null>;
  /** Home "Catalog" carousel. */
  listFeatured(): Promise<Product[]>;
  /** Products with an old price. */
  listPromo(): Promise<Product[]>;
  /** Values present in the data, sorted. */
  facets(): Promise<{ materials: Material[]; colors: ColorGroup[]; finishes: Finish[] }>;
  total(): Promise<number>;
}
