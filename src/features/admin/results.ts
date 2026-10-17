/*
 * What the admin server actions return to the browser. Client-safe and dependency-free: the admin
 * form components import these types (erased at build time) and turn the codes into localised copy
 * (`admin.*`). Only codes, the names of the failed fields and the saved slug / status travel.
 */

export type ProductActionResult =
  | { ok: true; slug: string }
  | {
      ok: false;
      code: "invalid" | "slug-taken" | "not-found" | "unavailable";
      /** Names of the form fields that failed validation (`invalid` only). */
      fields?: string[];
    };

export type PublishActionResult =
  | { ok: true; published: boolean }
  | { ok: false; code: "invalid" | "not-found" | "unavailable" };

export type OrderStatus = "in_progress" | "delivered";

export type OrderActionResult =
  | { ok: true; status: OrderStatus }
  | { ok: false; code: "invalid" | "not-found" | "unavailable" };
