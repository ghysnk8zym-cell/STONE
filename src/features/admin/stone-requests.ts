/** Shared, client-safe request vocabulary. A status is tracking, never evidence of payment. */
export const STONE_REQUEST_STATUSES = [
  "new",
  "draft_quote",
  "awaiting_payment",
] as const;
export type StoneRequestStatus = (typeof STONE_REQUEST_STATUSES)[number];
export type StoneRequestSnapshot = {
  revision: number;
  status: StoneRequestStatus;
  quoteUnitPriceCents: number | null;
};
export type StoneRequestResult =
  | { ok: true; snapshot: StoneRequestSnapshot }
  | {
      ok: false;
      code:
        "invalid" | "conflict" | "not-found" | "unavailable" | "quote-required";
    };
export const REQUEST_QUOTE_MAX_CENTS = 10_000_000;
