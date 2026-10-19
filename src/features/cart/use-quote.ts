"use client";

import { useEffect, useState } from "react";

import { quoteCart } from "@/server/shop/actions";

import type { CartLine, Quote } from "./input";

export type QuoteState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; quote: Quote; stale?: boolean }
  | { status: "error" };

const DEBOUNCE_MS = 200;

/**
 * The server's prices for the current cart (`quoteCart`). Re-quoted whenever the lines change (debounced while
 * typing); a stale answer for older lines is dropped. The browser never computes a total on its own.
 */
export function useQuote(
  lines: readonly CartLine[],
  locale: string,
): QuoteState {
  const key = JSON.stringify(lines);
  const [state, setState] = useState<{ key: string; value: QuoteState }>({
    key: "",
    value: { status: "idle" },
  });

  useEffect(() => {
    if (key === "[]") return;
    let current = true;
    const id = setTimeout(() => {
      quoteCart(JSON.parse(key), locale)
        .then((result) => {
          if (!current) return;
          setState({
            key,
            value: result.ok
              ? { status: "ok", quote: result.quote }
              : { status: "error" },
          });
        })
        .catch(() => {
          if (current) setState({ key, value: { status: "error" } });
        });
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(id);
    };
  }, [key, locale]);

  if (key === "[]") return { status: "idle" };
  // Keep showing the previous answer while the new one loads (no flicker of the totals).
  if (state.key !== key)
    return state.value.status === "ok"
      ? { ...state.value, stale: true }
      : { status: "loading" };
  return state.value;
}
