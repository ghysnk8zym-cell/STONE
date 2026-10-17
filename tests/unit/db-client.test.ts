import { EventEmitter } from "node:events";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { selectDriver, createDb, attachPoolErrorHandler } =
  await import("@/server/db/client");
const { pgliteLocation } = await import("@/server/db/pglite-url");
const { migrate } = await import("@/server/db/migrate");
const schema = await import("@/server/db/schema");

const root = process.cwd();

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

describe("database driver switch", () => {
  it("driver is chosen by DATABASE_URL", () => {
    expect(
      selectDriver(
        "postgresql://u:p@ep-cool-123.eu-central-1.aws.neon.tech/db",
      ),
    ).toBe("neon");
    expect(
      selectDriver("postgres://u:p@ep-x.neon.tech/db?sslmode=require"),
    ).toBe("neon");
    expect(selectDriver("postgres://localhost")).toBe("pg");
    expect(selectDriver("postgres://u:p@db.internal:5432/stone")).toBe("pg");
    expect(selectDriver("pglite://memory")).toBe("pglite");
    expect(selectDriver("pglite://.data/pglite")).toBe("pglite");
    expect(selectDriver(undefined)).toBeNull();
    expect(selectDriver("")).toBeNull();
  });

  it("does not mistake a lookalike host for Neon", () => {
    expect(selectDriver("postgres://u:p@neon.tech.evil.example/db")).toBe("pg");
    expect(selectDriver("postgres://u:p@notneon.tech/db")).toBe("pg");
  });

  it("rejects unsupported URL schemes without echoing the value", () => {
    expect(() => selectDriver("mysql://user:topsecret@host/db")).toThrow(
      "Unsupported DATABASE_URL",
    );
    expect(() => selectDriver("mysql://user:topsecret@host/db")).not.toThrow(
      /topsecret/,
    );
  });

  it("createDb returns null without a URL", async () => {
    expect(await createDb(undefined)).toBeNull();
  });
});

describe("pglite location", () => {
  it("pglite://memory is in-memory, other paths are directories", () => {
    expect(pgliteLocation("pglite://memory")).toBeUndefined();
    expect(pgliteLocation("pglite://")).toBeUndefined();
    expect(pgliteLocation("pglite://.data/pglite")).toBe(".data/pglite");
  });

  it("drizzle-kit uses the same in-memory meaning as the runtime", async () => {
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "pglite://memory");
    const { default: memory } = await import("../../drizzle.config");
    expect(memory).toMatchObject({
      driver: "pglite",
      dbCredentials: { url: "memory://" },
    });
    vi.resetModules();
    vi.stubEnv("DATABASE_URL", "pglite://.data/pglite");
    const { default: disk } = await import("../../drizzle.config");
    expect(disk).toMatchObject({ dbCredentials: { url: ".data/pglite" } });
    vi.unstubAllEnvs();
  });
});

describe("pg pool error handling", () => {
  afterEach(() => vi.restoreAllMocks());

  it("an idle client error is logged by code only and does not throw", () => {
    const pool = new EventEmitter();
    attachPoolErrorHandler(pool);
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(
      new Error("connect failed postgres://user:hunter2pass@db.internal/stone"),
      { code: "ECONNRESET" },
    );
    expect(() => pool.emit("error", error)).not.toThrow();
    expect(log).toHaveBeenCalledTimes(1);
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("ECONNRESET");
    expect(logged).not.toContain("hunter2pass");
    expect(logged).not.toContain("db.internal");
  });

  it("an error without a code is still handled", () => {
    const pool = new EventEmitter();
    attachPoolErrorHandler(pool);
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => pool.emit("error", new Error("boom"))).not.toThrow();
  });
});

describe("migrations", () => {
  afterEach(() => vi.restoreAllMocks());

  it("migrations apply to an in-memory PGlite and create all tables", async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle } = await import("drizzle-orm/pglite");
    const client = new PGlite();
    const db = drizzle({ client, schema });
    await migrate(db);

    const result = await client.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by table_name",
    );
    const tables = result.rows.map((row) => row.table_name);
    for (const table of [
      "account",
      "favorite",
      "order",
      "order_item",
      "product",
      "product_translation",
      "rate_limit",
      "session",
      "user",
      "verification",
    ]) {
      expect(tables).toContain(table);
    }
    const indexes = await client.query<{ indexname: string }>(
      "select indexname from pg_indexes where schemaname = 'public'",
    );
    expect(indexes.rows.map((row) => row.indexname)).toContain(
      "order_item_product_idx",
    );
    await client.close();
  });

  it("running migrate twice is a no-op", async () => {
    const db = await createDb("pglite://memory");
    expect(db).not.toBeNull();
    await migrate(db!);
    await migrate(db!);
    const rows = await db!.select({ one: sql<number>`1` }).from(schema.user);
    expect(rows).toEqual([]);
  });
});

describe("schema constraints", () => {
  async function freshDb() {
    const db = await createDb("pglite://memory");
    if (!db) throw new Error("expected a database");
    return db;
  }

  const now = new Date("2026-10-17T10:00:00Z");

  async function insertUser(
    db: Awaited<ReturnType<typeof freshDb>>,
    id: string,
    email: string,
  ) {
    await db.insert(schema.user).values({
      id,
      name: "Test",
      email,
      createdAt: now,
      updatedAt: now,
    });
  }

  it("new users default to the client role and other roles are rejected", async () => {
    const db = await freshDb();
    await insertUser(db, "u1", "one@example.test");
    const [row] = await db.select().from(schema.user);
    expect(row?.role).toBe("client");
    await expect(
      db.execute(sql`update "user" set role = 'superuser' where id = 'u1'`),
    ).rejects.toThrow();
  });

  it("a user can favourite a product only once", async () => {
    const db = await freshDb();
    await insertUser(db, "u1", "one@example.test");
    const [product] = await db
      .insert(schema.product)
      .values({
        slug: "black-marble",
        material: "marble",
        color: "black",
        colorGroup: "dark",
        finish: "polished",
        format: [600, 300, 20],
        priceCents: 24000,
        image: "images/catalog/black-marble",
      })
      .returning();
    const pair = { userId: "u1", productId: product!.id };
    await db.insert(schema.favorite).values(pair);
    await expect(db.insert(schema.favorite).values(pair)).rejects.toThrow();
  });

  it("product prices are integer cents and slugs are unique", async () => {
    const db = await freshDb();
    const base = {
      slug: "a",
      material: "marble",
      color: "black",
      colorGroup: "dark",
      finish: "polished",
      format: [600, 300, 20],
      priceCents: 24000,
      image: "images/catalog/a",
    };
    const [row] = await db.insert(schema.product).values(base).returning();
    expect(row?.isPlaceholder).toBe(true);
    expect(row?.published).toBe(true);
    expect(row?.imageFit).toBe("cover");
    await expect(db.insert(schema.product).values(base)).rejects.toThrow();
    await expect(
      db.insert(schema.product).values({ ...base, slug: "b", priceCents: -1 }),
    ).rejects.toThrow();
  });

  it("orders keep their items and numbers are unique", async () => {
    const db = await freshDb();
    await insertUser(db, "u1", "one@example.test");
    const [product] = await db
      .insert(schema.product)
      .values({
        slug: "p",
        material: "marble",
        color: "black",
        colorGroup: "dark",
        finish: "polished",
        format: [600, 300, 20],
        priceCents: 24000,
        image: "images/catalog/p",
      })
      .returning();
    const [order] = await db
      .insert(schema.order)
      .values({ number: "D-1048", userId: "u1", totalCents: 48000 })
      .returning();
    expect(order?.status).toBe("in_progress");
    await db.insert(schema.orderItem).values({
      orderId: order!.id,
      productId: product!.id,
      finish: "polished",
      quantity: 2,
      priceCents: 24000,
    });
    await expect(
      db
        .insert(schema.order)
        .values({ number: "D-1048", userId: "u1", totalCents: 1 }),
    ).rejects.toThrow();
  });
});

describe("database portability guard", () => {
  it("only src/server/db imports a database driver", () => {
    const dbDir = join(root, "src", "server", "db") + sep;
    const driver =
      /["'](pg|@neondatabase\/serverless|@electric-sql\/pglite|drizzle-orm\/(node-postgres|neon-http|pglite)[^"']*)["']/;
    const offenders = sourceFiles(join(root, "src"))
      .filter((file) => !file.startsWith(dbDir))
      .filter((file) => driver.test(readFileSync(file, "utf8")))
      .map((file) => relative(root, file));
    expect(offenders).toEqual([]);
  });

  it("drivers are never imported statically", () => {
    const text = readFileSync(
      join(root, "src", "server", "db", "client.ts"),
      "utf8",
    );
    expect(text).not.toMatch(
      /^import(?!\s+type\b)[^;]*from\s+["'](pg|@neondatabase\/serverless|@electric-sql\/pglite|drizzle-orm\/(node-postgres|neon-http|pglite))["']/m,
    );
  });
});
