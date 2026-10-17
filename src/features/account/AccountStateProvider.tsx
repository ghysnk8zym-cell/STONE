"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { toggleFavorite as toggleFavoriteAction } from "@/server/account/actions";

import {
  AccountContext,
  type AccountContextValue,
  type AccountStatus,
} from "./account-context";
import { GUEST_STATE, type AccountState } from "./results";

/*
 * The signed-in state of the visitor for the PUBLIC pages (catalog, product, home, the header and the
 * tab bar). Those pages are static (SSG / ISR) and cannot read the session at render time without
 * becoming dynamic, which would give up the static generation Phase 3 built. So the state lives here, in
 * a client island: it is fetched from `GET /api/me` after hydration (never cached) and drives the hearts,
 * the Save button and the account entries. The server stays the authority: every change goes through the
 * guarded `toggleFavorite` action, and the page shows the server's answer once it arrives.
 *
 * Trade-off (documented in the Task 4 report): a signed-in visitor's heart is drawn empty for the
 * fraction of a second between hydration and the response, and there is no flash on later in-site
 * navigation (this provider sits in the site layout and keeps its state; it re-reads `/api/me` after each
 * navigation so a sign-in or sign-out is never stale, keeping the old state until the answer arrives).
 */

const PENDING_KEY = "stone.pending-favorite";
/** A Guest's heart click is remembered this long while they sign in. */
const PENDING_MAX_AGE_MS = 30 * 60 * 1000;

function rememberPending(slug: string) {
  try {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ slug, at: Date.now() }),
    );
  } catch {
    // private mode / blocked storage: the Guest just signs in without the favourite being added
  }
}

function takePending(): string | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(PENDING_KEY);
    const value = JSON.parse(raw) as { slug?: unknown; at?: unknown };
    if (
      typeof value.slug === "string" &&
      typeof value.at === "number" &&
      Date.now() - value.at < PENDING_MAX_AGE_MS
    ) {
      return value.slug;
    }
  } catch {
    // unreadable: ignore
  }
  return null;
}

function parseState(value: unknown): AccountState | null {
  if (typeof value !== "object" || value === null) return null;
  const { signedIn, name, favorites } = value as Record<string, unknown>;
  if (typeof signedIn !== "boolean") return null;
  return {
    signedIn,
    name: typeof name === "string" ? name : null,
    favorites: Array.isArray(favorites)
      ? favorites.filter((slug): slug is string => typeof slug === "string")
      : [],
  };
}

export function AccountStateProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AccountState | null>(null);
  // Optimistic toggles still waiting for the server: a state fetched meanwhile could be older than them.
  const pendingToggles = useRef(0);

  const favorites = useMemo(() => new Set(state?.favorites), [state]);
  const status: AccountStatus =
    state === null ? "loading" : state.signedIn ? "signed-in" : "guest";

  const setMembership = useCallback((slug: string, present: boolean) => {
    setState((previous) => {
      if (!previous) return previous;
      const rest = previous.favorites.filter((entry) => entry !== slug);
      return {
        ...previous,
        favorites: present ? [slug, ...rest] : rest,
      };
    });
  }, []);

  /** Tells the server the wanted state (not "flip": a stale picture here cannot make it flip the wrong way). */
  const send = useCallback(
    (slug: string, favorited: boolean, before: boolean) => {
      pendingToggles.current += 1;
      toggleFavoriteAction(slug, favorited)
        .then((result) => {
          setMembership(slug, result.ok ? result.favorited : before);
        })
        .catch(() => setMembership(slug, before))
        .finally(() => {
          pendingToggles.current -= 1;
        });
    },
    [setMembership],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/me", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        const next = parseState(body);
        if (controller.signal.aborted || pendingToggles.current > 0) return;
        // A Guest who clicked a heart signed in and came back: add that favourite once.
        const pending = next?.signedIn ? takePending() : null;
        if (next && pending && !next.favorites.includes(pending)) {
          setState({ ...next, favorites: [pending, ...next.favorites] });
          send(pending, true, false);
          return;
        }
        // An unreadable answer is treated as "not signed in" the first time, and ignored afterwards.
        setState((previous) => next ?? previous ?? GUEST_STATE);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState((previous) => previous ?? GUEST_STATE);
        }
      });
    return () => controller.abort();
  }, [pathname, send]);

  // A readiness signal for tests and styling: `html[data-account-state]` is loading | guest | signed-in.
  useEffect(() => {
    document.documentElement.dataset.accountState = status;
  }, [status]);

  const setFavorite = useCallback(
    (slug: string, favorited: boolean) => {
      if (state === null) return; // not known yet: the click would be a guess
      if (!state.signedIn) {
        if (!favorited) return; // a Guest has nothing to remove
        rememberPending(slug);
        const next = window.location.pathname + window.location.search;
        router.push(`/${locale}/sign-in?next=${encodeURIComponent(next)}`);
        return;
      }
      const before = state.favorites.includes(slug);
      setMembership(slug, favorited); // optimistic
      send(slug, favorited, before);
    },
    [state, locale, router, setMembership, send],
  );

  const toggleFavorite = useCallback(
    (slug: string) => setFavorite(slug, !favorites.has(slug)),
    [setFavorite, favorites],
  );

  const value = useMemo<AccountContextValue>(
    () => ({
      status,
      name: state?.name ?? null,
      isFavorite: (slug) => favorites.has(slug),
      toggleFavorite,
      setFavorite,
    }),
    [status, state?.name, favorites, toggleFavorite, setFavorite],
  );

  return (
    <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
  );
}
