import "server-only";

import { asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";

import type { CustomerRole } from "@/features/admin/results";
import { requireRole } from "@/server/auth/guards";

import { getDb, schema } from "../db";
import { listAdminOrders, type AdminOrder } from "./queries";

export type AdminCustomer = {
  id: string;
  name: string;
  email: string;
  role: CustomerRole;
  thumbnail: { image: string; imageFit: "cover" | "contain" } | null;
};

export type AdminCustomers = {
  customers: AdminCustomer[];
  selected: AdminCustomer | null;
  orders: AdminOrder[];
  q: string;
  page: number;
  pages: number;
  total: number;
};

const PAGE_SIZE = 50;

/** No auth internals leave this module; only the selected customer's orders are read. */
export async function getAdminCustomers(
  locale: string,
  query: { q?: string; page?: number; customer?: string } = {},
): Promise<AdminCustomers> {
  await requireRole("admin", locale);
  const db = await getDb();
  if (!db) throw new Error("admin queries need a database");
  const q = (query.q ?? "").trim().slice(0, 100);
  // Search is literal: user-entered %, _ and backslash are not SQL wildcards.
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const filter = q
    ? or(ilike(schema.user.name, pattern), ilike(schema.user.email, pattern))
    : undefined;
  const [counts] = await db
    .select({ total: count() })
    .from(schema.user)
    .where(filter);
  const total = counts?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const requested = Number.isSafeInteger(query.page) ? query.page! : 1;
  const page = Math.min(pages, Math.max(1, requested));
  const users = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
    })
    .from(schema.user)
    .where(filter)
    .orderBy(asc(schema.user.name), asc(schema.user.id))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const thumbnails = users.length
    ? await db
        .selectDistinctOn([schema.order.userId], {
          userId: schema.order.userId,
          image: schema.product.image,
          imageFit: schema.product.imageFit,
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
        .where(
          inArray(
            schema.order.userId,
            users.map((user) => user.id),
          ),
        )
        .orderBy(
          asc(schema.order.userId),
          desc(schema.order.createdAt),
          desc(schema.order.number),
          asc(schema.orderItem.id),
        )
    : [];
  const customers: AdminCustomer[] = users.map((user) => {
    const picture = thumbnails.find((item) => item.userId === user.id);
    return {
      ...user,
      role: user.role === "admin" ? "admin" : "client",
      thumbnail: picture
        ? {
            image: picture.image,
            imageFit: picture.imageFit === "contain" ? "contain" : "cover",
          }
        : null,
    };
  });
  const selected =
    customers.find((user) => user.id === query.customer) ??
    customers[0] ??
    null;
  const orders = selected ? await listAdminOrders(locale, selected.id) : [];
  return { customers, selected, orders, q, page, pages, total };
}
