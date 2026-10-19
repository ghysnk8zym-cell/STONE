import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import {
  lineTotalCents,
  MAX_CENTS,
  type CartLine,
  type Quote,
  type QuoteLine,
} from "@/features/cart/input";

import { products as staticProducts } from "../catalog";
import { getDb, schema } from "../db";

type Priced = {
  slug: string;
  name: string | null;
  material: string;
  finish: string;
  image: string;
  imageFit: "cover" | "contain";
  priceCents: number;
  isPlaceholder: boolean;
};

/**
 * Published products of these slugs with the stored name for `locale`: ONE query on the database (Workers allow
 * 50 subrequests per request, so nothing here may run per line), the static catalog without a database.
 */
async function loadProducts(
  slugs: readonly string[],
  locale: "ru" | "en",
): Promise<Map<string, Priced>> {
  const db = await getDb();
  if (!db) {
    return new Map(
      staticProducts
        .filter((p) => slugs.includes(p.slug))
        .map((p) => [
          p.slug,
          {
            slug: p.slug,
            name: null,
            material: p.material,
            finish: p.finish,
            image: p.image,
            imageFit: p.imageFit,
            priceCents: p.priceCents,
            isPlaceholder: p.isPlaceholder,
          },
        ]),
    );
  }
  const rows = await db
    .select({
      slug: schema.product.slug,
      name: schema.productTranslation.name,
      material: schema.product.material,
      finish: schema.product.finish,
      image: schema.product.image,
      imageFit: schema.product.imageFit,
      priceCents: schema.product.priceCents,
      isPlaceholder: schema.product.isPlaceholder,
    })
    .from(schema.product)
    .leftJoin(
      schema.productTranslation,
      and(
        eq(schema.productTranslation.productId, schema.product.id),
        eq(schema.productTranslation.locale, locale),
      ),
    )
    .where(
      and(
        inArray(schema.product.slug, [...slugs]),
        eq(schema.product.published, true),
      ),
    );
  return new Map(
    rows.map((row) => [
      row.slug,
      {
        ...row,
        name: row.name?.trim() || null,
        imageFit: row.imageFit === "contain" ? "contain" : "cover",
      },
    ]),
  );
}

/**
 * Current names, pictures, prices and totals of a (validated, merged) cart, read from the catalog: the database
 * when DATABASE_URL is set (published products only), the static catalog otherwise. Read-only.
 */
export async function buildQuote(
  lines: readonly CartLine[],
  locale: string,
): Promise<Quote> {
  const found = await loadProducts(
    lines.map((l) => l.slug),
    locale === "en" ? "en" : "ru",
  );
  const quoted: QuoteLine[] = lines.map((line): QuoteLine => {
    const product = found.get(line.slug);
    if (!product)
      return {
        slug: line.slug,
        areaHundredths: line.areaHundredths,
        available: false,
      };
    return {
      ...product,
      areaHundredths: line.areaHundredths,
      available: true,
      lineTotalCents: lineTotalCents(line.areaHundredths, product.priceCents),
    };
  });
  const totalCents = quoted.reduce(
    (sum, line) => sum + (line.available ? line.lineTotalCents : 0),
    0,
  );
  // Order totals are Postgres integers: anything above would fail inside the insert.
  const tooLarge = totalCents > MAX_CENTS;
  return {
    lines: quoted,
    totalCents,
    tooLarge,
    orderable:
      quoted.length > 0 && !tooLarge && quoted.every((line) => line.available),
  };
}
