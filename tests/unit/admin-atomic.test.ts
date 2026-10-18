import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createDb, schema } = await import("@/server/db");
const { seedCatalog } = await import("@/server/db/seed");
const { writeAtomically } = await import("@/server/admin/atomic");

type Db = NonNullable<Awaited<ReturnType<typeof createDb>>>;

describe("writeAtomically (PGlite: the interactive transaction path)", () => {
  let db: Db;
  beforeAll(async () => {
    db = (await createDb("pglite://memory"))!;
    await seedCatalog(db);
  }, 60_000);

  const priceOf = async () =>
    (
      await db
        .select({ priceCents: schema.product.priceCents })
        .from(schema.product)
        .where(eq(schema.product.slug, "black-marble"))
    )[0]?.priceCents;
  const nameOf = async () =>
    (
      await db
        .select({ name: schema.productTranslation.name })
        .from(schema.productTranslation)
        .innerJoin(
          schema.product,
          eq(schema.productTranslation.productId, schema.product.id),
        )
        .where(eq(schema.product.slug, "black-marble"))
    ).map((row) => row.name);

  it("applies every statement when all succeed", async () => {
    await writeAtomically(db, (d) => [
      d
        .update(schema.product)
        .set({ priceCents: 24100 })
        .where(eq(schema.product.slug, "black-marble")),
    ]);
    expect(await priceOf()).toBe(24100);
    await writeAtomically(db, (d) => [
      d
        .update(schema.product)
        .set({ priceCents: 24000 })
        .where(eq(schema.product.slug, "black-marble")),
    ]);
  });

  it("applies none when a later statement fails (no half-saved product)", async () => {
    const names = await nameOf();
    await expect(
      writeAtomically(db, (d) => [
        d
          .update(schema.product)
          .set({ priceCents: 99999 })
          .where(eq(schema.product.slug, "black-marble")),
        // a translation row that breaks the locale check constraint: the statement fails
        d
          .update(schema.productTranslation)
          .set({ locale: "xx" })
          .where(
            sql`${schema.productTranslation.productId} in (select id from product where slug = 'black-marble')`,
          ),
      ]),
    ).rejects.toThrow();
    expect(await priceOf()).toBe(24000);
    expect(await nameOf()).toEqual(names);
  });

  it("uses db.batch when the driver has one (Neon HTTP has no interactive transactions)", async () => {
    const calls: unknown[][] = [];
    const fake = {
      batch: async (statements: unknown[]) => {
        calls.push(statements);
      },
      transaction: () => {
        throw new Error("No transactions support in neon-http driver");
      },
      update: () => ({ set: () => ({ where: () => "statement" }) }),
    };
    await writeAtomically(fake as unknown as Db, (d) => [
      (d as unknown as typeof fake).update().set().where() as never,
    ]);
    expect(calls).toEqual([["statement"]]);
  });
});
