// e2e only (run by scripts/e2e-db-server.mjs after `db-seed.mjs`): a second Client with an order of its own, so the
// admin e2e test can change an order's status without touching the seeded Client's demo orders that
// tests/e2e/account.spec.ts reads (the tests run in parallel against one database).
// Never part of `pnpm db:seed`; the values come from .env.test.example (obviously fake). Prints counts only.
import "./ts-hooks.mjs";

const email = process.env.E2E_ORDERS_EMAIL;
const password = process.env.E2E_ORDERS_PASSWORD;
if (!email || !password) {
  console.error("e2e-extra-seed: set E2E_ORDERS_EMAIL and E2E_ORDERS_PASSWORD");
  process.exit(1);
}

const ORDERS = [{ number: "D-9001", slug: "black-marble", quantity: 2 }];

try {
  const { getDb, schema } = await import("../src/server/db/index.ts");
  const { eq } = await import("drizzle-orm");
  const { getAuth, createSeedUser } =
    await import("../src/server/auth/auth.ts");
  const db = await getDb();
  const auth = await getAuth();
  if (!db || !auth) throw new Error("no database");

  const normalized = email.toLowerCase();
  const find = () =>
    db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, normalized));
  if ((await find()).length === 0) {
    await createSeedUser(auth, {
      email: normalized,
      password,
      name: "E2E Orders",
      role: "client",
    });
  }
  const [user] = await find();

  for (const [index, order] of ORDERS.entries()) {
    const [product] = await db
      .select({ id: schema.product.id, priceCents: schema.product.priceCents })
      .from(schema.product)
      .where(eq(schema.product.slug, order.slug));
    const [created] = await db
      .insert(schema.order)
      .values({
        number: order.number,
        userId: user.id,
        status: "in_progress",
        totalCents: product.priceCents * order.quantity,
        createdAt: new Date(Date.UTC(2026, 9, 1 + index, 9)),
      })
      .onConflictDoNothing()
      .returning({ id: schema.order.id });
    if (created) {
      await db.insert(schema.orderItem).values({
        orderId: created.id,
        productId: product.id,
        finish: "polished",
        quantity: order.quantity,
        priceCents: product.priceCents,
      });
    }
  }
  console.log(`e2e-extra-seed done. orders: ${ORDERS.length}`);
  process.exit(0);
} catch (error) {
  console.error(`e2e-extra-seed failed (${error?.name ?? "Error"})`);
  process.exit(1);
}
