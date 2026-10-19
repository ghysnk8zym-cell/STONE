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

import { cart } from "@/features/cart/cart-store";
import { toggleFavorite as toggleFavoriteAction } from "@/server/account/actions";

import {
  AccountContext,
  type AccountContextValue,
  type AccountStatus,
} from "./account-context";
import { GUEST_STATE, type AccountState } from "./results";

/*
 * The signed-in state of the visitor for the PUBLIC pages (catalog, product, home, the header and the
 * tab bar). Public content and session state stay separate. Session state lives here, in
 * a client island: it is fetched from `GET /api/me` (never cached) and drives the hearts, the Save button
 * and the account entries. The server stays the authority: every change goes through the guarded
 * `toggleFavorite` action, and the page shows the server's answer once it arrives.
 *
 * When it is read (each read is a Worker request plus two database reads, so not on every navigation):
 * - once when the site layout mounts, i.e. on a full page load and when coming back from the auth screens
 *   (they have their own layout), which is where a sign-in or sign-up lands;
 * - when leaving the sign-out confirmation (the session just ended inside this layout);
 * - when the tab becomes visible again (the session may have changed or expired meanwhile).
 * Between reads the provider is the cache: a toggle updates it at once and then takes the server's answer.
 *
 * Trade-off (Task 4 report): a signed-in visitor's heart is drawn empty for the fraction of a second between
 * hydration and the response. A click in that moment is queued and applied once the state is known.
 */

const PENDING_KEY = "stone.pending-favorite";
/** A Guest's heart click is remembered this long while they sign in. */
const PENDING_MAX_AGE_MS = 30 * 60 * 1000;
const SIGN_OUT_PATH = /\/sign-out\/?$/;

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

function withMembership(favorites: string[], slug: string, present: boolean) {
  const rest = favorites.filter((entry) => entry !== slug);
  return present ? [slug, ...rest] : rest;
}

export function AccountStateProvider({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [state, setState] = useState<AccountState | null>(null);
  // Optimistic toggles still waiting for the server: a state fetched meanwhile could be older than them.
  const pendingToggles = useRef(0);
  // Clicks made before the state was known (slug -> wanted state, the last click wins).
  const queued = useRef(new Map<string, boolean>());
  const inflight = useRef<AbortController | null>(null);
  const previousPath = useRef(pathname);
  // The sign-out confirmation was just left: if the server now says Guest, the sign-out happened.
  const leftSignOut = useRef(false);

  const favorites = useMemo(() => new Set(state?.favorites), [state]);
  const status: AccountStatus =
    state === null ? "loading" : state.signedIn ? "signed-in" : "guest";

  const setMembership = useCallback((slug: string, present: boolean) => {
    setState((previous) =>
      previous
        ? {
            ...previous,
            favorites: withMembership(previous.favorites, slug, present),
          }
        : previous,
    );
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

  const goToSignIn = useCallback(
    (slug: string) => {
      rememberPending(slug);
      const next = window.location.pathname + window.location.search;
      router.push(`/${locale}/sign-in?next=${encodeURIComponent(next)}`);
    },
    [locale, router],
  );

  /** The state just arrived: show it, and act on the clicks that waited for it. */
  const applyLoaded = useCallback(
    (loaded: AccountState | null) => {
      const wanted = new Map(queued.current);
      queued.current.clear();
      const signedOut = leftSignOut.current && loaded?.signedIn === false;
      leftSignOut.current = false;
      // A shared device: the next visitor must not find the previous customer's cart.
      if (signedOut) cart.clear();
      if (!loaded) {
        // An unreadable answer is treated as "not signed in" the first time, and ignored afterwards.
        setState((previous) => previous ?? GUEST_STATE);
        return;
      }
      if (!loaded.signedIn) {
        setState(loaded);
        const guestClick = [...wanted].find(([, favorited]) => favorited);
        if (guestClick) goToSignIn(guestClick[0]);
        return;
      }
      // A Guest who clicked a heart signed in and came back: add that favourite once.
      const pending = takePending();
      if (pending && !wanted.has(pending)) wanted.set(pending, true);
      let list = loaded.favorites;
      const changes: [string, boolean, boolean][] = [];
      for (const [slug, favorited] of wanted) {
        const before = list.includes(slug);
        if (before === favorited) continue;
        list = withMembership(list, slug, favorited);
        changes.push([slug, favorited, before]);
      }
      setState({ ...loaded, favorites: list });
      for (const [slug, favorited, before] of changes) {
        send(slug, favorited, before);
      }
    },
    [goToSignIn, send],
  );

  // `load` must keep its identity (it is an effect dependency); the callback it ends in changes with the router.
  const applyLoadedRef = useRef(applyLoaded);
  useEffect(() => {
    applyLoadedRef.current = applyLoaded;
  }, [applyLoaded]);

  const load = useCallback(() => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    fetch("/api/me", {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        if (controller.signal.aborted || pendingToggles.current > 0) return;
        applyLoadedRef.current(parseState(body));
      })
      .catch(() => {
        if (!controller.signal.aborted) applyLoadedRef.current(null);
      });
  }, []);

  // Once per mount of the site layout.
  useEffect(() => {
    load();
    return () => inflight.current?.abort();
  }, [load]);

  // The session ended inside this layout (sign-out confirmation -> home): read the state again.
  useEffect(() => {
    const previous = previousPath.current;
    previousPath.current = pathname;
    if (previous !== pathname && SIGN_OUT_PATH.test(previous)) {
      leftSignOut.current = true;
      load();
    }
  }, [pathname, load]);

  // Coming back to the tab: the session may have changed or expired meanwhile.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  // A readiness signal for tests and styling: `html[data-account-state]` is loading | guest | signed-in.
  useEffect(() => {
    document.documentElement.dataset.accountState = status;
  }, [status]);

  const setFavorite = useCallback(
    (slug: string, favorited: boolean) => {
      if (state === null) {
        // Not known yet: remember the click, `applyLoaded` acts on it (a Guest is sent to sign-in).
        queued.current.set(slug, favorited);
        return;
      }
      if (!state.signedIn) {
        if (favorited) goToSignIn(slug); // a Guest has nothing to remove
        return;
      }
      const before = state.favorites.includes(slug);
      setMembership(slug, favorited); // optimistic
      send(slug, favorited, before);
    },
    [state, goToSignIn, setMembership, send],
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
