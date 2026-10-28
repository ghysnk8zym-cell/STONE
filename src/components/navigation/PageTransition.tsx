"use client";

import {
  ViewTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const RETURN_KEY = "stone:catalog-return";

/** Keep native Link/history semantics. React coordinates snapshots with route commits. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const previous = useRef(pathname);

  // Restore before React captures the destination geometry, so the reverse photo
  // lands in the visible card rather than jumping after the animation ends.
  useLayoutEffect(() => {
    const wasProduct = /^\/(ru|en)\/catalog\/[^/]+$/.test(previous.current);
    previous.current = pathname;
    if (!wasProduct || !/^\/(ru|en)\/catalog$/.test(pathname)) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null");
      if (saved?.url === location.pathname + location.search) {
        window.scrollTo({ top: saved.y, behavior: "instant" });
      }
    } catch {
      // Storage may be disabled. Browser history still restores its own scroll.
    }
  }, [pathname]);

  useEffect(() => {
    function remember(event: MouseEvent) {
      if (
        event.button ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]",
      );
      if (!link || link.target || link.hasAttribute("download")) return;
      const destination = new URL(link.href);
      if (destination.origin !== location.origin) return;
      if (!/^\/(ru|en)\/catalog$/.test(location.pathname)) return;
      if (
        !new RegExp(`^${location.pathname}/[^/]+$`).test(destination.pathname)
      )
        return;
      try {
        sessionStorage.setItem(
          RETURN_KEY,
          JSON.stringify({
            url: location.pathname + location.search,
            y: scrollY,
          }),
        );
      } catch {
        // Navigation never depends on storage.
      }
    }
    document.addEventListener("click", remember, true);
    return () => document.removeEventListener("click", remember, true);
  }, []);

  const quiet = /\/(account|cart)(\/|$)/.test(pathname);
  return (
    <ViewTransition
      key={pathname}
      default="none"
      enter={quiet ? "stone-quiet" : "stone-page"}
      exit={quiet ? "stone-quiet" : "stone-page"}
    >
      {children}
    </ViewTransition>
  );
}

/** Only the catalog has named cards; home carousels may repeat the same product. */
export function ProductPhotoTransition({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const slug = href.split("/").filter(Boolean).at(-1) || "";
  if (!/^\/(ru|en)\/catalog$/.test(pathname)) return children;
  return (
    <ViewTransition
      name={productTransitionName(slug)}
      default="none"
      share="stone-product"
    >
      {children}
    </ViewTransition>
  );
}

export function productTransitionName(slug: string) {
  // Encode every code point to a valid, collision-free CSS identifier.
  return `stone-photo-${Array.from(slug, (c) => c.codePointAt(0)!.toString(16)).join("-")}`;
}

export function readCatalogReturn(locale: string): string {
  try {
    const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null");
    const url = new URL(saved?.url, location.origin);
    if (url.origin === location.origin && url.pathname === `/${locale}/catalog`)
      return url.pathname + url.search;
  } catch {
    // Direct product visits keep the ordinary catalog destination.
  }
  return `/${locale}/catalog`;
}
