"use client";

import { useSyncExternalStore } from "react";

import {
  addLine,
  AREA_MAX_HUNDREDTHS,
  CART_MAX_LINES,
  CART_STORAGE_KEY,
  parseStoredCart,
  type CartLine,
} from "./input";

/*
 * The visitor's cart in localStorage (`stone.cart.v1`), shared by every component through one external store:
 * the product page adds to it, the cart and checkout pages read and edit it, other tabs follow through the
 * `storage` event. Blocked storage (private mode) degrades to an in-memory cart for this page view.
 */

const EMPTY: CartLine[] = [];
const listeners = new Set<() => void>();
let memory: string | null = null;
let memoryOnly = false;
let cachedRaw: string | null | undefined;
let cachedLines: CartLine[] = EMPTY;

function readRaw(): string | null {
  if (memoryOnly) return memory;
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    memory = raw;
    return raw;
  } catch {
    return memory;
  }
}

function snapshot(): CartLine[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedLines = parseStoredCart(raw);
  }
  return cachedLines;
}

function write(lines: readonly CartLine[]) {
  const raw = JSON.stringify(lines.slice(0, CART_MAX_LINES));
  memory = raw;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, raw);
    memoryOnly = false;
  } catch {
    // A successful read of the old stored value must not undo an acknowledged write.
    // A later successful write can persist this memory cart and resume cross-tab sync.
    memoryOnly = true;
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === CART_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const cart = {
  lines: snapshot,
  /**
   * Adds the area to the line of this product (or a new line). Nothing is stored when the cart is full or the line
   * would go above 10 000 m² (it would otherwise be capped or dropped silently).
   */
  add(line: CartLine): "added" | "full" | "too_large" {
    const current = snapshot();
    const existing = current.find((l) => l.slug === line.slug);
    if (
      !Number.isInteger(line.areaHundredths) ||
      line.areaHundredths < 1 ||
      (existing?.areaHundredths ?? 0) + line.areaHundredths >
        AREA_MAX_HUNDREDTHS
    )
      return "too_large";
    const next = addLine(current, line);
    if (next.length > CART_MAX_LINES) return "full";
    write(next);
    return "added";
  },
  setArea(slug: string, areaHundredths: number) {
    write(
      snapshot().map((l) => (l.slug === slug ? { ...l, areaHundredths } : l)),
    );
  },
  remove(slug: string) {
    write(snapshot().filter((l) => l.slug !== slug));
  },
  clear() {
    write([]);
  },
};

/** The cart lines; empty on the server and during hydration (see `useCartReady`). */
export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

const noop = () => () => {};
/** False on the server and during hydration, true once the stored cart can be read. */
export function useCartReady(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}
