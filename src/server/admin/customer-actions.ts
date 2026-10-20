"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { CustomerRoleResult } from "@/features/admin/results";
import { requireRole } from "@/server/auth/guards";
import { requestLocale } from "@/server/auth/request-locale";

import { getDb, schema } from "../db";

const inputSchema = z.object({
  id: z.string().min(1).max(128),
  role: z.enum(["client", "admin"]),
});

/** Changes another user's role. Existing sessions read the new role on their next request. */
export async function setCustomerRole(
  id: unknown,
  role: unknown,
): Promise<CustomerRoleResult> {
  const actor = await requireRole("admin", await requestLocale());
  const parsed = inputSchema.safeParse({ id, role });
  if (!parsed.success) return { ok: false, code: "invalid" };
  if (parsed.data.id === actor.id) return { ok: false, code: "self" };
  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };
  const [updated] = await db
    .update(schema.user)
    .set({ role: parsed.data.role })
    .where(
      and(eq(schema.user.id, parsed.data.id), ne(schema.user.id, actor.id)),
    )
    .returning({ id: schema.user.id });
  if (!updated) return { ok: false, code: "not-found" };
  revalidatePath("/[locale]/admin", "layout");
  revalidatePath("/[locale]/account", "layout");
  return { ok: true, role: parsed.data.role };
}
