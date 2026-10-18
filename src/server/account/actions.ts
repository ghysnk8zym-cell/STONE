"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import type {
  ChangePasswordResult,
  ToggleFavoriteResult,
  UpdateProfileNameResult,
} from "@/features/account/results";
import { routing } from "@/i18n/routing";
import { hasHiddenCharacters, USER_NAME_MAX } from "@/lib/plain-text";
import { REQUEST_PATH_HEADER } from "@/server/auth/constants";
import { requireUser } from "@/server/auth/guards";
import { callAuthEndpoint, toClientResult } from "@/server/auth/next";

import { getDb, schema } from "../db";

/*
 * Account server actions (Phase 4a Task 4). Every action calls `requireUser()` FIRST and acts only on
 * the session's own user id: none takes a user id (or anything that names another user) from the
 * caller, so one user cannot touch another's favourites, name or password. A Guest is redirected to
 * sign-in with the page as `next`. Arguments are `unknown` and validated here: a server action is a
 * public POST endpoint whatever the UI sends. Results are codes and the saved value only
 * (src/features/account/results.ts); the Better Auth response (session token) never leaves.
 */

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const NAME_MAX = USER_NAME_MAX;

/** The locale of the page the action was called from (the middleware sets the path header). */
async function requestLocale(): Promise<string> {
  const path = (await headers()).get(REQUEST_PATH_HEADER) ?? "";
  const first = path.split("/")[1] ?? "";
  return (routing.locales as readonly string[]).includes(first)
    ? first
    : routing.defaultLocale;
}

async function currentUser() {
  return requireUser(await requestLocale());
}

/** The account pages show favourites, orders and the name: refresh them (and the client router cache). */
function refreshAccountPages() {
  revalidatePath("/[locale]/account", "layout");
}

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/**
 * Adds the product to the session user's favourites, or removes it when it is already there, and
 * returns the new state. `desired` makes the call idempotent: true adds (no-op when present), false
 * removes (no-op when absent), so an optimistic client whose picture is stale cannot flip the wrong way.
 * Unknown and unpublished products are refused.
 */
export async function toggleFavorite(
  slug: unknown,
  desired?: unknown,
): Promise<ToggleFavoriteResult> {
  const user = await currentUser();
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) return { ok: false, code: "invalid" };
  if (desired !== undefined && typeof desired !== "boolean") {
    return { ok: false, code: "invalid" };
  }

  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };

  const [product] = await db
    .select({ id: schema.product.id })
    .from(schema.product)
    .where(
      and(
        eq(schema.product.slug, parsed.data),
        eq(schema.product.published, true),
      ),
    )
    .limit(1);
  if (!product) return { ok: false, code: "not-found" };

  const remove = () =>
    db
      .delete(schema.favorite)
      .where(
        and(
          eq(schema.favorite.userId, user.id),
          eq(schema.favorite.productId, product.id),
        ),
      );
  let favorited: boolean;
  if (desired === false) {
    await remove();
    favorited = false;
  } else {
    const inserted = await db
      .insert(schema.favorite)
      .values({ userId: user.id, productId: product.id })
      .onConflictDoNothing()
      .returning({ productId: schema.favorite.productId });
    if (desired === true) {
      favorited = true;
    } else {
      // No direction asked for: one statement decides it, so two quick clicks cannot both "add"
      // (the first insert wins, the second finds the row and removes it).
      favorited = inserted.length > 0;
      if (!favorited) await remove();
    }
  }
  refreshAccountPages();
  return { ok: true, favorited };
}

// Plain text on one line: no control characters (newlines, tabs, NUL, ...) and no invisible formatting
// characters (bidi overrides, zero-width, BOM) anywhere in the name (src/lib/plain-text.ts).
const nameSchema = z
  .string()
  .trim()
  .min(1)
  .max(NAME_MAX)
  .refine((value) => !hasHiddenCharacters(value));

/** Saves the session user's display name (plain text, 1 to 80 characters after trimming). */
export async function updateProfileName(
  name: unknown,
): Promise<UpdateProfileNameResult> {
  const user = await currentUser();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return { ok: false, code: "invalid" };

  const db = await getDb();
  if (!db) return { ok: false, code: "unavailable" };
  await db
    .update(schema.user)
    .set({ name: parsed.data })
    .where(eq(schema.user.id, user.id));
  refreshAccountPages();
  return { ok: true, name: parsed.data };
}

const currentPasswordSchema = z.string().min(1).max(PASSWORD_MAX);
const newPasswordSchema = z.string().min(PASSWORD_MIN).max(PASSWORD_MAX);

/**
 * Changes the session user's password. The current one is required and checked by Better Auth. The
 * call goes through the Better Auth handler (`callAuthEndpoint`), so its rate limit (5 per minute and
 * IP) and origin check apply. Every other session of the user is ended and this one is rotated (a new token
 * and cookie), so a token that leaked before the change is dead. The page re-render that follows the action
 * reads the new cookie from the cookie store (`getSession`, src/server/auth/session.ts), not the stale request header.
 */
export async function changePassword(
  current: unknown,
  next: unknown,
): Promise<ChangePasswordResult> {
  await currentUser();
  if (typeof current !== "string" || typeof next !== "string") {
    return { ok: false, code: "invalid" };
  }
  if (!currentPasswordSchema.safeParse(current).success) {
    return { ok: false, code: "invalidCurrent" };
  }
  if (!newPasswordSchema.safeParse(next).success) {
    return { ok: false, code: "weakPassword" };
  }

  const result = toClientResult(
    await callAuthEndpoint("/change-password", {
      currentPassword: current,
      newPassword: next,
      // Ends every other session AND rotates this one: Better Auth issues a new session and cookie, which
      // `callAuthEndpoint` writes to the cookie store. A stolen old token (this device's included) stops working.
      revokeOtherSessions: true,
    }),
  );
  if (result.ok) return { ok: true };
  if (result.status === 503) return { ok: false, code: "unavailable" };
  if (result.status === 429) return { ok: false, code: "tooManyAttempts" };
  if (result.code === "INVALID_PASSWORD") {
    return { ok: false, code: "invalidCurrent" };
  }
  if (
    result.code === "PASSWORD_TOO_SHORT" ||
    result.code === "PASSWORD_TOO_LONG"
  ) {
    return { ok: false, code: "weakPassword" };
  }
  return { ok: false, code: "generic" };
}
