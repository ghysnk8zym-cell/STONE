/**
 * Idempotency keys for "Place test order". One key per submission identity (the cart content): a retry of the
 * same content — after a lost response, a network error or a timeout — sends the same key, so the server's unique
 * (user, key) index returns the order it already saved instead of creating a second one.
 *
 * The key is kept in memory for the life of the page (the source of truth for retries), and mirrored to
 * sessionStorage so a reload of the same tab can still recover it. Storage is optional: when it cannot be read or
 * written (private mode, blocked site data, quota), retries in the same page view still reuse the in-memory key.
 *
 * Rotation: `forget()` after a successful order or a `conflict` answer; a different cart content gets a new key.
 * Limitation: with storage unavailable, a page reload after a lost response cannot recover the key — the next
 * attempt is a new submission (the earlier order, if it was saved, is in the account's Orders list).
 */

export const ATTEMPT_STORAGE_KEY = "stone.checkout.attempt";

type Attempt = { content: string; key: string };

export type AttemptKeys = {
  /** The key for this content: the remembered one when the content is the same, a new one otherwise. */
  keyFor(content: string): string;
  /** Ends the current submission (after success or a conflict): the next call starts a new key. */
  forget(): void;
};

function readStored(storage: () => Storage | undefined): Attempt | null {
  try {
    const raw = storage()?.getItem(ATTEMPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Attempt> | null;
    return parsed &&
      typeof parsed.key === "string" &&
      typeof parsed.content === "string"
      ? { key: parsed.key, content: parsed.content }
      : null;
  } catch {
    return null; // unreadable or blocked: memory decides
  }
}

function writeStored(storage: () => Storage | undefined, attempt: Attempt) {
  try {
    storage()?.setItem(ATTEMPT_STORAGE_KEY, JSON.stringify(attempt));
  } catch {
    // blocked or full: the in-memory key still covers retries in this page view
  }
}

export function createAttemptKeys(
  newKey: () => string = () => crypto.randomUUID(),
  storage: () => Storage | undefined = () =>
    typeof window === "undefined" ? undefined : window.sessionStorage,
): AttemptKeys {
  let current: Attempt | null = null;
  return {
    keyFor(content) {
      if (current?.content === content) {
        writeStored(storage, current); // best effort, e.g. storage became writable again
        return current.key;
      }
      const stored = readStored(storage);
      if (stored?.content === content) {
        current = stored; // a reload of this tab after a lost response
        return stored.key;
      }
      current = { content, key: newKey() };
      writeStored(storage, current);
      return current.key;
    },
    forget() {
      current = null;
      try {
        storage()?.removeItem(ATTEMPT_STORAGE_KEY);
      } catch {
        // nothing stored
      }
    },
  };
}
