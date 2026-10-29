"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const RETURN_KEY = "stone:catalog-return";
const PRODUCT = /^\/(ru|en)\/catalog\/([^/]+)$/;
const CATALOG = /^\/(ru|en)\/catalog$/;
type Visual = { node: HTMLElement; rect: DOMRect };
type Snapshot = Visual & { from: string; photo?: Visual & { slug: string } };

/** A visual copy only: never duplicate document resources, IDs or active controls. */
function visualCopy(element: HTMLElement): HTMLElement {
  const copy = element.cloneNode(true) as HTMLElement;
  for (const node of [copy, ...copy.querySelectorAll<HTMLElement>("*")]) {
    node.removeAttribute("id");
    node.removeAttribute("data-testid");
    node.removeAttribute("data-gallery-main");
    node.removeAttribute("aria-label");
    node.removeAttribute("aria-labelledby");
    node.removeAttribute("aria-describedby");
    node.removeAttribute("aria-live");
    node.removeAttribute("autofocus");
    node.removeAttribute("name");
    node.removeAttribute("action");
    node.removeAttribute("formaction");
    node.removeAttribute("form");
    if (node instanceof HTMLAnchorElement) node.removeAttribute("href");
  }
  copy
    .querySelectorAll('title,meta,link,script,style,input[type="hidden"]')
    .forEach((node) => node.remove());
  copy.setAttribute("aria-hidden", "true");
  copy.inert = true;
  return copy;
}

function discardCopy(node: HTMLElement) {
  node
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input,textarea")
    .forEach((field) => {
      field.value = "";
      field.removeAttribute("value");
    });
  node.replaceChildren();
  node.remove();
}

function discardSnapshot(snapshot: Snapshot | null) {
  if (!snapshot) return;
  discardCopy(snapshot.node);
  if (snapshot.photo) discardCopy(snapshot.photo.node);
}

const visualSheetCopies = new WeakMap<CSSStyleSheet, CSSStyleSheet>();
function visualSheets(): CSSStyleSheet[] {
  const sheets: CSSStyleSheet[] = [];
  for (const original of document.styleSheets) {
    if (original.disabled) continue;
    try {
      let copy = visualSheetCopies.get(original);
      if (!copy) {
        copy = new CSSStyleSheet();
        const rules = Array.from(
          original.cssRules,
          (rule) => rule.cssText,
        ).join("\n");
        copy.replaceSync(
          original.media.mediaText
            ? `@media ${original.media.mediaText} {${rules}}`
            : rules,
        );
        visualSheetCopies.set(original, copy);
      }
      sheets.push(copy);
    } catch {
      /* A third-party stylesheet must not prevent navigation. */
    }
  }
  return sheets;
}

function overlay(visual: Visual, zIndex: number): HTMLElement {
  const stage = document.createElement("div");
  stage.dataset.stoneTransitionOverlay = "";
  stage.setAttribute("aria-hidden", "true");
  stage.inert = true;
  Object.assign(stage.style, {
    position: "fixed",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: String(zIndex),
  });
  const { node, rect } = visual;
  Object.assign(node.style, {
    position: "fixed",
    left: `${rect.left}px`,
    top: `${rect.top}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
    margin: "0",
    transform: "none",
    opacity: "1",
    pointerEvents: "none",
  });
  // Closed decorative trees cannot duplicate live text, labels or form controls.
  const shadow = stage.attachShadow({ mode: "closed" });
  shadow.adoptedStyleSheets = visualSheets();
  shadow.appendChild(node);
  document.body.appendChild(stage);
  return stage;
}

function mainContent(): HTMLElement | null {
  const child = document.querySelector(
    "[data-site-shell] > main",
  )?.firstElementChild;
  return child instanceof HTMLElement ? child : null;
}

function milliseconds(styles: CSSStyleDeclaration, name: string): number {
  const value = styles.getPropertyValue(name).trim();
  return (parseFloat(value) || 0) * (value.endsWith("ms") ? 1 : 1000);
}

function imageReady(image: HTMLImageElement): Promise<boolean> {
  if (image.complete) return Promise.resolve(image.naturalWidth > 0);
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
      resolve(image.complete && image.naturalWidth > 0);
    };
    const loaded = () => finish();
    const failed = () => finish();
    const timer = setTimeout(finish, 180);
    image.addEventListener("load", loaded, { once: true });
    image.addEventListener("error", failed, { once: true });
  });
}

/** Motion is separate from React's router/metadata lifecycle. Never intercept navigation. */
export function NavigationMemory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const previous = useRef<string | null>(null);
  const lastUrl = useRef("");
  const pending = useRef<Snapshot | null>(null);
  const expiration = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const stop = useRef<() => void>(() => {});
  const ignoreScrollUntil = useRef(0);

  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    function cancel() {
      stop.current();
      discardSnapshot(pending.current);
      pending.current = null;
      clearTimeout(expiration.current);
    }
    function capture(destination?: URL, history = false) {
      cancel();
      if (
        reduced.matches ||
        !("inert" in HTMLElement.prototype) ||
        typeof ShadowRoot === "undefined" ||
        !("adoptedStyleSheets" in ShadowRoot.prototype) ||
        typeof CSSStyleSheet === "undefined" ||
        typeof CSSStyleSheet.prototype.replaceSync !== "function"
      )
        return;
      const root = mainContent();
      if (!root) return;
      const from = history
        ? lastUrl.current
        : location.pathname + location.search;
      const fromPath = new URL(from, location.origin).pathname;
      const snapshot: Snapshot = {
        node: visualCopy(root),
        rect: root.getBoundingClientRect(),
        from,
      };
      if (destination) {
        let frame: HTMLElement | null = null;
        let slug: string | undefined;
        const product = PRODUCT.exec(destination.pathname);
        if (CATALOG.test(fromPath) && product) {
          slug = product[2];
          frame = root.querySelector<HTMLElement>(
            `[data-product-photo="${CSS.escape(slug)}"]`,
          );
          try {
            sessionStorage.setItem(
              RETURN_KEY,
              JSON.stringify({ url: from, y: scrollY }),
            );
          } catch {
            /* Storage is optional. */
          }
        } else if (
          CATALOG.test(destination.pathname) &&
          PRODUCT.test(fromPath)
        ) {
          frame = root.querySelector<HTMLElement>("[data-gallery-main]");
          slug = PRODUCT.exec(fromPath)?.[2];
          if (frame && !["full", "0"].includes(frame.dataset.view || ""))
            frame = null;
        }
        const image = frame?.querySelector<HTMLImageElement>("img");
        if (frame && slug && image?.complete && image.naturalWidth > 0) {
          const rect = frame.getBoundingClientRect();
          if (
            rect.width > 0 &&
            rect.height > 0 &&
            rect.bottom > 0 &&
            rect.top < innerHeight
          ) {
            snapshot.photo = { node: visualCopy(frame), rect, slug };
          }
        }
      }
      pending.current = snapshot;
      expiration.current = setTimeout(() => {
        discardSnapshot(pending.current);
        pending.current = null;
      }, 1800);
    }
    function click(event: MouseEvent) {
      if (
        event.button ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest<HTMLAnchorElement>("a[href]");
      if (link) {
        if (
          (link.target && link.target !== "_self") ||
          link.hasAttribute("download")
        )
          return;
        const destination = new URL(link.href);
        if (
          destination.origin !== location.origin ||
          !/^\/(ru|en)(\/|$)/.test(destination.pathname)
        )
          return;
        if (
          destination.pathname === location.pathname &&
          destination.search === location.search
        )
          return;
        capture(destination);
      } else if (target?.closest("button")) capture();
    }
    const submit = () => capture();
    const pop = () => capture(new URL(location.href), true);
    const scroll = () => {
      if (performance.now() > ignoreScrollUntil.current) cancel();
    };
    const preference = () => {
      if (reduced.matches) cancel();
    };
    document.addEventListener("click", click, true);
    document.addEventListener("submit", submit, true);
    window.addEventListener("popstate", pop, true);
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("resize", cancel);
    reduced.addEventListener("change", preference);
    return () => {
      cancel();
      document.removeEventListener("click", click, true);
      document.removeEventListener("submit", submit, true);
      window.removeEventListener("popstate", pop, true);
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("resize", cancel);
      reduced.removeEventListener("change", preference);
    };
  }, []);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = pathname;
    lastUrl.current = location.pathname + location.search;
    if (!before || before === pathname) {
      discardSnapshot(pending.current);
      pending.current = null;
      clearTimeout(expiration.current);
      return;
    }
    const snapshot = pending.current;
    pending.current = null;
    clearTimeout(expiration.current);
    stop.current();
    ignoreScrollUntil.current = performance.now() + 60;
    if (PRODUCT.test(before) && CATALOG.test(pathname)) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null");
        if (saved?.url === lastUrl.current)
          window.scrollTo({ top: saved.y, behavior: "instant" });
      } catch {
        /* Native history remains usable without storage. */
      }
    }
    const root = mainContent();
    if (
      !root ||
      typeof root.animate !== "function" ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      discardSnapshot(snapshot);
      return;
    }
    const styles = getComputedStyle(document.documentElement);
    const quiet = /\/(account|cart|checkout)(\/|$)/.test(pathname);
    const duration = milliseconds(
      styles,
      quiet ? "--motion-quiet-duration" : "--motion-page-duration",
    );
    const rise = quiet
      ? 0
      : parseFloat(styles.getPropertyValue("--motion-page-rise")) || 0;
    const easing =
      styles.getPropertyValue("--motion-route-ease").trim() || "ease-out";
    const animations: Animation[] = [];
    const stages: HTMLElement[] = [];
    const copies: HTMLElement[] = snapshot
      ? [snapshot.node, ...(snapshot.photo ? [snapshot.photo.node] : [])]
      : [];
    const restores: (() => void)[] = [];
    let cancelled = false;
    function clear() {
      if (cancelled) return;
      cancelled = true;
      animations.forEach((animation) => animation.cancel());
      stages.forEach((stage) => stage.remove());
      restores.forEach((restore) => restore());
      copies.forEach(discardCopy);
      animations.length = stages.length = restores.length = copies.length = 0;
    }
    stop.current = clear;
    function animate(
      node: HTMLElement,
      frames: Keyframe[],
      id: string,
      ms = duration,
    ) {
      try {
        const animation = node.animate(frames, { duration: ms, easing, id });
        animations.push(animation);
        return animation.finished.catch(() => {});
      } catch {
        // Animation support must never become a navigation requirement.
        return Promise.resolve();
      }
    }
    const frame = snapshot?.photo
      ? root.querySelector<HTMLElement>(
          `[data-product-photo="${CSS.escape(snapshot.photo.slug)}"]`,
        )
      : null;
    const destinationRect = frame?.getBoundingClientRect();
    let oldPage: HTMLElement | undefined;
    if (
      snapshot &&
      new URL(snapshot.from, location.origin).pathname === before
    ) {
      oldPage = overlay(snapshot, 20);
      stages.push(oldPage);
    }
    const baseTransform = getComputedStyle(root).transform;
    // The fading old copy supplies the crossfade. Keep live text opaque so
    // contrast and accessibility never depend on the animation's current frame.
    const entered = animate(
      root,
      [
        {
          opacity: 1,
          transform: `translateY(${rise}px) ${baseTransform === "none" ? "" : baseTransform}`,
        },
        { opacity: 1, transform: baseTransform },
      ],
      "stone-page-enter",
    );
    const exited = oldPage
      ? animate(
          oldPage,
          [{ opacity: 1 }, { opacity: 0 }],
          "stone-page-exit",
        ).then(() => oldPage?.remove())
      : Promise.resolve();
    const shared = async () => {
      const photo = snapshot?.photo;
      const image = frame?.querySelector<HTMLImageElement>("img");
      if (
        !photo ||
        !frame ||
        !image ||
        !destinationRect?.width ||
        !destinationRect.height
      )
        return;
      const oldFrameInPage = snapshot?.node.querySelector<HTMLElement>(
        `[data-product-photo="${CSS.escape(photo.slug)}"]`,
      );
      if (oldFrameInPage) oldFrameInPage.style.opacity = "0";
      const sourceStage = overlay(photo, 25);
      stages.push(sourceStage);
      const opacity = frame.style.opacity;
      frame.style.opacity = "0";
      restores.push(() => {
        frame.style.opacity = opacity;
      });
      if (!(await imageReady(image)) || cancelled) {
        sourceStage.remove();
        frame.style.opacity = opacity;
        return;
      }
      const next: Visual = { node: visualCopy(frame), rect: destinationRect };
      copies.push(next.node);
      const destinationStage = overlay(next, 25);
      stages.push(destinationStage);
      const a = photo.rect,
        b = destinationRect;
      const ms = milliseconds(styles, "--motion-product-duration");
      photo.node.style.transformOrigin = "top left";
      next.node.style.transformOrigin = "top left";
      await Promise.all([
        animate(
          photo.node,
          [
            { opacity: 1, transform: "none" },
            {
              opacity: 0,
              transform: `translate(${b.left - a.left}px, ${b.top - a.top}px) scale(${b.width / a.width}, ${b.height / a.height})`,
            },
          ],
          "stone-photo-old",
          ms,
        ),
        animate(
          next.node,
          [
            {
              opacity: 0,
              transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height})`,
            },
            { opacity: 1, transform: "none" },
          ],
          "stone-photo-new",
          ms,
        ),
      ]);
      sourceStage.remove();
      destinationStage.remove();
      frame.style.opacity = opacity;
    };
    void Promise.all([entered, exited, shared().catch(() => {})]).finally(
      clear,
    );
    return clear;
  }, [pathname, search]);
  return null;
}

export function readCatalogReturn(locale: string): string {
  try {
    const saved = JSON.parse(sessionStorage.getItem(RETURN_KEY) || "null");
    const url = new URL(saved?.url, location.origin);
    if (url.origin === location.origin && url.pathname === `/${locale}/catalog`)
      return url.pathname + url.search;
  } catch {
    /* Direct product visits keep the ordinary catalog destination. */
  }
  return `/${locale}/catalog`;
}
