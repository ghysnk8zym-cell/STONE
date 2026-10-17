import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { and, count, eq } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { createDb, schema } = await import("@/server/db");
const { seed, seedCatalog, seedAccountData, formatSeedSummary } =
  await import("@/server/db/seed");

const options = {
  adminEmail: "admin@example.test",
  adminPassword: "pw-admin-MARKER-1",
  clientEmail: "client@example.test",
  clientPassword: "pw-client-MARKER-2",
};

async function freshDb() {
  const db = await createDb("pglite://memory");
  if (!db) throw new Error("expected a database");
  return db;
}

type TestDb = Awaited<ReturnType<typeof freshDb>>;

async function insertUser(db: TestDb, email: string, role = "client") {
  const now = new Date("2026-10-17T10:00:00Z");
  await db.insert(schema.user).values({
    id: `id-${email}`,
    name: "Test",
    email,
    role,
    createdAt: now,
    updatedAt: now,
  });
}

async function rowCounts(db: TestDb) {
  const n = async (table: PgTable) =>
    (await db.select({ n: count() }).from(table))[0]!.n;
  return {
    products: await n(schema.product),
    translations: await n(schema.productTranslation),
    users: await n(schema.user),
    orders: await n(schema.order),
    orderItems: await n(schema.orderItem),
    favorites: await n(schema.favorite),
  };
}

const messages = (locale: string) =>
  JSON.parse(
    readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as {
    catalog: {
      products: Record<string, { name: string; description: string }>;
    };
  };

afterEach(() => vi.restoreAllMocks());

describe("seed catalog", () => {
  it("creates the 12 products with ru and en translations from messages/*.json", async () => {
    const db = await freshDb();
    await seedCatalog(db);
    const counts = await rowCounts(db);
    expect(counts.products).toBe(12);
    expect(counts.translations).toBe(24);

    const [row] = await db
      .select({
        locale: schema.productTranslation.locale,
        name: schema.productTranslation.name,
        description: schema.productTranslation.description,
      })
      .from(schema.productTranslation)
      .innerJoin(
        schema.product,
        eq(schema.product.id, schema.productTranslation.productId),
      )
      .where(
        and(
          eq(schema.product.slug, "black-marble"),
          eq(schema.productTranslation.locale, "ru"),
        ),
      );
    const ru = messages("ru").catalog.products["black-marble"]!;
    expect(row).toEqual({
      locale: "ru",
      name: ru.name,
      description: ru.description,
    });
  });

  it("keeps the Figma sort order", async () => {
    const db = await freshDb();
    await seedCatalog(db);
    const rows = await db
      .select({ slug: schema.product.slug })
      .from(schema.product)
      .orderBy(schema.product.sortOrder);
    expect(rows.map((r) => r.slug)[0]).toBe("black-marble");
    expect(rows.at(-1)?.slug).toBe("taupe-rock");
  });
});

describe("seed", () => {
  it("seed twice creates no duplicates", async () => {
    const db = await freshDb();
    await insertUser(db, options.clientEmail);
    await insertUser(db, options.adminEmail, "admin");
    await seed(db, options);
    const first = await rowCounts(db);
    await seed(db, options);
    expect(await rowCounts(db)).toEqual(first);
    expect(first).toMatchObject({
      products: 12,
      translations: 24,
      orders: 2,
      orderItems: 2,
      favorites: 3,
    });
  });

  it("seeds the demo orders and favourites of the Client from Figma Account", async () => {
    const db = await freshDb();
    await insertUser(db, options.clientEmail);
    await seed(db, options);

    const orders = await db
      .select({
        number: schema.order.number,
        status: schema.order.status,
        totalCents: schema.order.totalCents,
        userId: schema.order.userId,
        slug: schema.product.slug,
        finish: schema.orderItem.finish,
        quantity: schema.orderItem.quantity,
      })
      .from(schema.order)
      .innerJoin(
        schema.orderItem,
        eq(schema.orderItem.orderId, schema.order.id),
      )
      .innerJoin(
        schema.product,
        eq(schema.product.id, schema.orderItem.productId),
      )
      .orderBy(schema.order.number);
    expect(orders).toEqual([
      {
        number: "D-1032",
        status: "delivered",
        totalCents: 38400,
        userId: `id-${options.clientEmail}`,
        slug: "grey-limestone",
        finish: "honed",
        quantity: 2,
      },
      {
        number: "D-1048",
        status: "in_progress",
        totalCents: 24000,
        userId: `id-${options.clientEmail}`,
        slug: "black-marble",
        finish: "polished",
        quantity: 1,
      },
    ]);

    const favorites = await db
      .select({ slug: schema.product.slug })
      .from(schema.favorite)
      .innerJoin(
        schema.product,
        eq(schema.product.id, schema.favorite.productId),
      )
      .orderBy(schema.product.slug);
    expect(favorites.map((f) => f.slug)).toEqual([
      "black-marble",
      "grey-limestone",
      "grey-marble",
    ]);
  });

  it("seeds only the catalog until the client user exists", async () => {
    const db = await freshDb();
    await seed(db, options);
    expect(await rowCounts(db)).toMatchObject({
      products: 12,
      users: 0,
      orders: 0,
      favorites: 0,
    });
    // The same command links the demo data once the user appears.
    await insertUser(db, options.clientEmail);
    await seedAccountData(db, options.clientEmail);
    expect(await rowCounts(db)).toMatchObject({ orders: 2, favorites: 3 });
  });

  it("creates missing users through the hook, makes the admin an admin and never recreates them", async () => {
    const db = await freshDb();
    const createUser = vi.fn(
      async (u: { email: string; password: string; name: string }) => {
        await insertUser(db, u.email);
      },
    );
    await seed(db, { ...options, createUser });
    expect(createUser).toHaveBeenCalledTimes(2);
    const roles = await db
      .select({ email: schema.user.email, role: schema.user.role })
      .from(schema.user)
      .orderBy(schema.user.email);
    expect(roles).toEqual([
      { email: options.adminEmail, role: "admin" },
      { email: options.clientEmail, role: "client" },
    ]);

    await seed(db, { ...options, createUser });
    expect(createUser).toHaveBeenCalledTimes(2);
    expect(await rowCounts(db)).toMatchObject({
      users: 2,
      orders: 2,
      favorites: 3,
    });
  });

  it("seed output contains no password or secret", async () => {
    const db = await freshDb();
    await insertUser(db, options.clientEmail);
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(
      (m) => vi.spyOn(console, m).mockImplementation(() => {}),
    );
    const counts = await seed(db, options);
    const summary = formatSeedSummary(counts);
    const printed = [...spies.flatMap((s) => s.mock.calls), summary]
      .flat()
      .join("\n");
    expect(printed).not.toContain("MARKER");
    expect(JSON.stringify(counts)).not.toContain("MARKER");
    expect(summary).toMatch(/products\D+12/);
  });
});

describe("pnpm db:seed", () => {
  it("runs against DATABASE_URL, prints counts and no secrets", () => {
    const result = spawnSync(
      process.execPath,
      [join("scripts", "db-seed.mjs")],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 60_000,
        env: {
          NODE_ENV: "test",
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          DATABASE_URL: "pglite://memory",
          BETTER_AUTH_SECRET: "s".repeat(32) + "SECRETMARKER",
          SEED_ADMIN_EMAIL: options.adminEmail,
          SEED_ADMIN_PASSWORD: options.adminPassword,
          SEED_CLIENT_EMAIL: options.clientEmail,
          SEED_CLIENT_PASSWORD: options.clientPassword,
        },
      },
    );
    const output = `${result.stdout}\n${result.stderr}`;
    expect(result.status, output).toBe(0);
    expect(result.stdout).toMatch(/products\D+12/);
    for (const secret of [
      "MARKER",
      options.adminEmail,
      options.clientEmail,
      "SECRETMARKER",
      "pglite://",
    ]) {
      expect(output).not.toContain(secret);
    }
  }, 90_000);

  it("fails with variable names only when the database or seed users are not configured", () => {
    const result = spawnSync(
      process.execPath,
      [join("scripts", "db-seed.mjs")],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        timeout: 60_000,
        env: {
          NODE_ENV: "test",
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          SEED_ADMIN_PASSWORD: "pw-admin-MARKER-1",
        },
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("DATABASE_URL");
    expect(result.stderr).not.toContain("MARKER");
  }, 60_000);
});
