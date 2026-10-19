import AxeBuilder from "@axe-core/playwright";
import {
  expect,
  test,
  type Locator,
  type Page,
  type TestInfo,
} from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import {
  QA_IDS,
  type QaId,
} from "../../src/app/[locale]/%5Fstyleguide/sections/qa-ids";

/*
 * Styleguide e2e (Task 9 part B). The page lists every component in every state under
 * `[data-qa="<id>"]` (ids in sections/qa-ids.ts). Layout switches by viewport, not by prop:
 * `site-header-desktop` is visible at >= 1280 only, `site-header-compact` below, `tab-bar-*` below 768.
 * `tab-bar-none` and `breadcrumb-long` are `inert` visual copies (not in the tab order).
 *
 * Runs in the `desktop` (1440) and `mobile` (390) projects; the @production test runs in the
 * `production-guard` project (second `next start` with APP_ENV=production on port 3001).
 * Prefetches of routes that do not exist yet show up as aborted/404 requests: not a failure here.
 */

const LOCALES = ["ru", "en"] as const;
type Locale = (typeof LOCALES)[number];
const MESSAGES = { ru, en } as const;

const qa = (page: Page, id: QaId): Locator => page.locator(`[data-qa="${id}"]`);

/**
 * Resolves once React has hydrated AND committed the page, so axe, the focus sweep (baseline
 * styles) and clicks never run on the server HTML while hydration is still in flight.
 *
 * Signal: React attaches `__reactFiber$<id>` to a DOM node when it hydrates it. Two probes:
 *  - the deepest last element of <main> (hydration walks the tree in document order, so the last
 *    node having a fiber means every earlier node was reached; this also covers Suspense gaps), and
 *  - the mobile-menu trigger button (the client island).
 * Having a fiber is not yet "committed": hydration renders into the work-in-progress tree. So the
 * fiber is walked up to its HostRoot (tag 3) and must be the root's `current` tree, which only
 * happens after the commit. `goto` resolving (load event) says nothing about this: Next streams
 * its JS and hydrates after `load`. Reads React internals (fiber `return`, `tag`, `stateNode.current`),
 * stable in React 19; no production code is involved.
 */
async function hydrated(page: Page) {
  await page.waitForFunction(
    () => {
      const main = document.querySelector("main");
      if (!main) return false;
      let last: Element = main;
      while (last.lastElementChild) last = last.lastElementChild;
      const probes = [
        last,
        main.querySelector('[data-qa="mobile-menu-trigger"] button'),
      ];
      return probes.every((el) => {
        if (!el) return false;
        const key = Object.keys(el).find((k) => k.startsWith("__reactFiber$"));
        if (!key) return false;
        type Fiber = {
          return: Fiber | null;
          tag: number;
          stateNode: { current: Fiber };
        };
        let fiber = (el as unknown as Record<string, Fiber>)[key];
        while (fiber.return) fiber = fiber.return;
        return fiber.tag === 3 && fiber.stateNode.current === fiber;
      });
    },
    undefined,
    { timeout: 20_000 },
  );
}

async function openStyleguide(page: Page, locale: Locale) {
  const response = await page.goto(`/${locale}/_styleguide`);
  expect(response?.status()).toBe(200);
  await hydrated(page);
  return response!;
}

function isMobile(testInfo: TestInfo) {
  return testInfo.project.name === "mobile";
}

/* ---------------------------------------------------------------- colour helpers */

type Rgba = { r: number; g: number; b: number; a: number };

/** Parses the computed-colour forms Chromium returns: rgb(), rgba() and color(srgb r g b / a). */
function parseColor(value: string): Rgba {
  const rgb = value.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/,
  );
  if (rgb) {
    const a = rgb[4] === undefined ? 1 : parseAlpha(rgb[4]);
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a };
  }
  const srgb = value.match(
    /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/,
  );
  if (srgb) {
    const a = srgb[4] === undefined ? 1 : parseAlpha(srgb[4]);
    return { r: +srgb[1] * 255, g: +srgb[2] * 255, b: +srgb[3] * 255, a };
  }
  throw new Error(`Unsupported computed colour: ${value}`);
}

function parseAlpha(text: string) {
  return text.endsWith("%") ? parseFloat(text) / 100 : parseFloat(text);
}

/** WCAG 2.x relative luminance. */
function luminance({ r, g, b }: Rgba) {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(a: Rgba, b: Rgba) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/* ---------------------------------------------------------------- focus-indicator helpers */

type Box = {
  outline: { style: string; width: string; color: string };
  boxShadow: string;
  border: string;
};
type Chain = { boxes: Box[]; frozen: boolean; label: string };

/**
 * Runs in the page. Reads the focus-relevant computed style of an element and of its ancestors up
 * to (excluding) the `[data-qa]` frame, because some components draw the ring on a parent (the
 * product card: `has-[a:focus-visible]`; fields: wrapper border). `which` is "all" (every element
 * marked `data-sweep`) or "active" (document.activeElement, if marked).
 */
function readChains(which: string) {
  const box = (el: Element) => {
    const cs = getComputedStyle(el);
    return {
      outline: {
        style: cs.outlineStyle,
        width: cs.outlineWidth,
        color: cs.outlineColor,
      },
      boxShadow: cs.boxShadow,
      border: [
        cs.borderTopColor,
        cs.borderRightColor,
        cs.borderBottomColor,
        cs.borderLeftColor,
        cs.borderTopWidth,
        cs.borderRightWidth,
        cs.borderBottomWidth,
        cs.borderLeftWidth,
      ].join(" "),
    };
  };
  const chainOf = (el: Element) => {
    const chain: Element[] = [];
    for (
      let cur: Element | null = el;
      cur && cur.tagName !== "MAIN" && !cur.hasAttribute("data-qa");
      cur = cur.parentElement
    ) {
      chain.push(cur);
      if (chain.length >= 7) break;
    }
    const label = `${el.closest("[data-qa]")?.getAttribute("data-qa") ?? "page"} > <${el.tagName.toLowerCase()}> ${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}`;
    return {
      boxes: chain.map(box),
      // A frozen `*-focus` example, or the Select frozen open (its trigger shows the focus look while
      // expanded; a real open Select moves focus into the listbox), has a permanent look.
      frozen: chain.some(
        (c) =>
          c.getAttribute("data-state") === "focus" ||
          c.getAttribute("aria-expanded") === "true",
      ),
      label,
    };
  };
  const targets =
    which === "all"
      ? Array.from(document.querySelectorAll("[data-sweep]"))
      : document.activeElement?.hasAttribute("data-sweep")
        ? [document.activeElement]
        : [];
  return targets.map((el) => ({
    index: Number(el.getAttribute("data-sweep")),
    ...chainOf(el),
  }));
}

/**
 * Describes what a focused chain draws that the unfocused chain does not, or null if nothing.
 *  - outline: visible (style not none, width > 0, non-transparent colour) and new or changed;
 *  - box-shadow: changed (a ring drawn as a shadow);
 *  - border: colour or width changed (Primary / Light / Pill / field-wrapper focus looks).
 * Comparing against the same element unfocused (not an absolute rule) means a permanent border or
 * shadow cannot pass as a focus ring.
 */
function indicatorBetween(baseline: Box[], focused: Box[]): string | null {
  for (let i = 0; i < focused.length; i++) {
    const b = baseline[i];
    const f = focused[i];
    const outlineVisible =
      f.outline.style !== "none" &&
      parseFloat(f.outline.width) > 0 &&
      parseColor(f.outline.color).a > 0;
    if (
      outlineVisible &&
      (b.outline.style !== f.outline.style ||
        b.outline.width !== f.outline.width ||
        b.outline.color !== f.outline.color)
    ) {
      return `outline ${f.outline.style} ${f.outline.width} ${f.outline.color} (level ${i})`;
    }
    if (b.boxShadow !== f.boxShadow) return `box-shadow (level ${i})`;
    if (b.border !== f.border) return `border ${f.border} (level ${i})`;
  }
  return null;
}

/**
 * The same comparison for a whole frozen example: every element under the frame, in DOM order.
 * Used for the `*-focus` examples, whose look is permanent (`data-state="focus"`).
 */
function readTree(frame: Element | null) {
  if (!frame) return null;
  return Array.from(frame.querySelectorAll("*")).map((el) => {
    const cs = getComputedStyle(el);
    return {
      outline: {
        style: cs.outlineStyle,
        width: cs.outlineWidth,
        color: cs.outlineColor,
      },
      boxShadow: cs.boxShadow,
      border: [
        cs.borderTopColor,
        cs.borderRightColor,
        cs.borderBottomColor,
        cs.borderLeftColor,
        cs.borderTopWidth,
        cs.borderRightWidth,
        cs.borderBottomWidth,
        cs.borderLeftWidth,
      ].join(" "),
    };
  });
}

/**
 * Runs in the page. How far a header (or any block) pokes out of the viewport: its own scroll
 * overflow, every descendant whose box leaves [0, viewport width] (the framing wrapper clips, so
 * scrollWidth alone cannot see a child that is too wide), and the page's own horizontal scroll.
 */
function measureFit(root: Element) {
  const limit = window.innerWidth;
  const escaping = Array.from(root.querySelectorAll("*"))
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > limit + 1 || r.left < -1);
    })
    .map((el) => el.tagName.toLowerCase());
  return {
    ownOverflow: root.scrollWidth - root.clientWidth,
    escaping,
    pageOverflow: document.documentElement.scrollWidth - limit,
  };
}

/* ---------------------------------------------------------------- tests */

test.describe("styleguide", () => {
  for (const locale of LOCALES) {
    test(`styleguide renders in ${locale}`, async ({ page }) => {
      const messages = MESSAGES[locale].styleguide;
      await openStyleguide(page, locale);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText(messages.title);
      await expect(page).toHaveTitle(messages.title);
      // Copy from the other namespaces of the same page is really there (the 404 test greps for these).
      await expect(page.getByText(messages.intro)).toBeVisible();
      await expect(qa(page, "approval-checklist")).toBeAttached();
    });
  }

  test("styleguide is noindex", async ({ page }) => {
    for (const locale of LOCALES) {
      const response = await openStyleguide(page, locale);
      const robots = page.locator('meta[name="robots"]');
      await expect(robots).toHaveCount(1);
      await expect(robots).toHaveAttribute("content", /noindex/);
      await expect(robots).toHaveAttribute("content", /nofollow/);
      expect(response.headers()["x-robots-tag"]).toContain("noindex");
    }
  });

  // Runs only in the `production-guard` project: a second `next start` of the same build with
  // APP_ENV=production (port 3001). Not @smoke: a deployed preview cannot be started in production mode.
  test("styleguide is 404 in production @production", async ({
    request,
    baseURL,
  }) => {
    expect(baseURL).toContain(":3001");
    for (const locale of LOCALES) {
      const messages = MESSAGES[locale].styleguide;
      const response = await request.get(`/${locale}/_styleguide`);
      expect(response.status(), `${locale}/_styleguide`).toBe(404);
      const body = await response.text();
      // No styleguide copy anywhere in the response (HTML and the flight payload).
      for (const marker of [
        messages.title,
        messages.intro,
        messages.sections.approval,
        messages.approval.checklist,
        messages.approval.intro,
        messages.tokens.colors,
      ]) {
        expect(body, `"${marker}" must not be in the 404 body`).not.toContain(
          marker,
        );
      }
      expect(body).not.toContain("data-qa=");
      // The guard is specific to the styleguide: the rest of the site is up in the same process.
      expect((await request.get(`/${locale}`)).status()).toBe(200);
    }
  });

  test("keyboard Tab reaches every interactive element with a visible focus ring", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    // Hover/focus colours transition (motion-hover); reduced motion removes the transition so the
    // computed style read right after Tab is the final one, not the first frame.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openStyleguide(page, "en");

    // Interactive elements inside <main> that are rendered, enabled, not tabindex=-1 and not inert.
    const total = await page.evaluate(() => {
      const selector =
        "main a[href], main button, main input, main select, main textarea, main [tabindex]";
      let index = 0;
      for (const el of Array.from(
        document.querySelectorAll<HTMLElement>(selector),
      )) {
        const disabled = (el as HTMLButtonElement).disabled === true;
        const visible = el.checkVisibility({ checkVisibilityCSS: true });
        if (
          disabled ||
          el.getAttribute("tabindex") === "-1" ||
          el.closest("[inert]") ||
          !visible
        ) {
          continue;
        }
        el.setAttribute("data-sweep", String(index++));
      }
      return index;
    });
    expect(total, "the styleguide has interactive elements").toBeGreaterThan(
      60,
    );

    const baseline = new Map(
      (await page.evaluate(readChains, "all")).map((c) => [c.index, c]),
    );
    expect(baseline.size).toBe(total);

    const focused = new Map<number, Chain & { index: number }>();
    let lastIndex = -1;
    let stalls = 0;
    for (let i = 0; i < total * 2 + 50 && focused.size < total; i++) {
      await page.keyboard.press("Tab");
      const [active] = await page.evaluate(readChains, "active");
      if (!active) continue; // focus is outside <main> (layout chrome) or on the document
      if (focused.has(active.index)) {
        if (++stalls > 5) break; // focus is stuck or has wrapped around
        continue;
      }
      // Tab order follows the DOM order (no positive tabindex anywhere).
      expect(active.index, `tab order at ${active.label}`).toBeGreaterThan(
        lastIndex,
      );
      lastIndex = active.index;
      focused.set(active.index, active);
    }

    const unreached = [...baseline.values()]
      .filter((c) => !focused.has(c.index))
      .map((c) => c.label);
    expect(unreached, "elements Tab never reached").toEqual([]);

    // A ring must appear on focus. `*-focus` examples are frozen (data-state="focus"): their look is
    // permanent, so it cannot "appear"; the separate frozen-focus test covers those against `-default`.
    const missing: string[] = [];
    let checked = 0;
    for (const [index, now] of focused) {
      if (now.frozen) continue;
      checked++;
      const before = baseline.get(index)!;
      if (!indicatorBetween(before.boxes, now.boxes)) missing.push(now.label);
    }
    test.info().annotations.push({
      type: "sweep",
      description: `${total} interactive, ${focused.size} reached, ${checked} judged for a ring`,
    });
    expect(missing, "focused elements with no visible indicator").toEqual([]);
    expect(checked, "most elements were judged, not skipped").toBeGreaterThan(
      total * 0.7,
    );
  });

  test("frozen focus examples draw a focus indicator that the default example lacks", async ({
    page,
  }) => {
    await openStyleguide(page, "en");
    const focusIds = QA_IDS.filter((id) => id.endsWith("-focus"));
    expect(focusIds.length).toBeGreaterThan(15);
    const problems: string[] = [];
    for (const id of focusIds) {
      const stem = id.slice(0, -"-focus".length);
      // The unfocused twin: `<stem>-default`, `<stem>-closed` (Select) or the bare `<stem>`.
      const ids: readonly string[] = QA_IDS;
      const defaultId =
        [`${stem}-default`, `${stem}-closed`, stem].find((c) =>
          ids.includes(c),
        ) ?? stem;
      expect(QA_IDS as readonly string[], `${id} has a baseline`).toContain(
        defaultId,
      );
      const focusTree = await qa(page, id).evaluate(readTree);
      const baseTree = await qa(page, defaultId as QaId).evaluate(readTree);
      if (!focusTree || !baseTree || focusTree.length !== baseTree.length) {
        problems.push(`${id}: structure differs from ${defaultId}`);
        continue;
      }
      const seen = focusTree.some((now, i) =>
        indicatorBetween([baseTree[i]], [now]),
      );
      if (!seen) problems.push(`${id}: looks the same as ${defaultId}`);
    }
    expect(problems).toEqual([]);
  });

  /*
   * KNOWN FIGMA-DERIVED DESIGN QUESTION (owner approval item `primaryFocus`, Task 4 ruling): the
   * Primary button's keyboard focus is a 2px WHITE border (Figma 338:523), weak on light surfaces
   * (about 1.1:1 on #f3f0eb). This test therefore asserts that the indicator EXISTS (white token,
   * 2px, absent when not focused), not its contrast. Do not turn this into a contrast check
   * until the owner decides.
   */
  test("primary button focus is the 2px white border (owner approval item primaryFocus)", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openStyleguide(page, "en");
    const white = await page.evaluate(() => {
      const probe = document.createElement("span");
      probe.style.color = "var(--text-primary)";
      document.body.append(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    });
    const border = (button: Locator) =>
      button.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { width: cs.borderTopWidth, color: cs.borderTopColor };
      });

    // Frozen look.
    const frozen = await border(
      qa(page, "button-primary-focus").getByRole("button"),
    );
    expect(frozen).toEqual({ width: "2px", color: white });

    // Real keyboard focus: absent before, the same white 2px border after.
    const button = qa(page, "button-primary-default").getByRole("button");
    expect((await border(button)).color).not.toBe(white);
    await button.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(button).toBeFocused();
    expect(await border(button)).toEqual({ width: "2px", color: white });
  });

  test("focus ring is visible on product card", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openStyleguide(page, "en");
    const frame = qa(page, "product-card-default");
    const card = frame.locator("article");
    const ring = (el: Locator) =>
      el.evaluate((node) => {
        const cs = getComputedStyle(node);
        return {
          style: cs.outlineStyle,
          width: cs.outlineWidth,
          color: cs.outlineColor,
          surface: cs.backgroundColor,
        };
      });

    // Unfocused: no ring (so the focused assertion below cannot pass vacuously).
    // (Tailwind's `outline-0` keeps style "solid" with a 0px width.)
    expect(parseFloat((await ring(card)).width)).toBe(0);

    // Keyboard focus: the heart comes first in the DOM, Tab moves on to the stretched card link.
    await frame.getByRole("button").first().focus();
    await page.keyboard.press("Tab");
    const link = frame.getByRole("link");
    await expect(link).toBeFocused();

    const focused = await ring(card);
    expect(focused.style).toBe("solid");
    expect(parseFloat(focused.width)).toBeGreaterThanOrEqual(2);
    const ratio = contrastRatio(
      parseColor(focused.color),
      parseColor(focused.surface),
    );
    // WCAG 1.4.11 non-text contrast: the ink-primary ring against the light card surface.
    expect(
      ratio,
      `ring ${focused.color} on ${focused.surface}`,
    ).toBeGreaterThanOrEqual(3);
  });

  for (const locale of LOCALES) {
    test(`axe has no critical or serious violations (${locale})`, async ({
      page,
    }) => {
      test.setTimeout(90_000);
      await openStyleguide(page, locale);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      const report = blocking
        .map(
          (v) =>
            `${v.id} (${v.impact}): ${v.help}\n` +
            v.nodes
              .slice(0, 6)
              .map(
                (n) =>
                  `  ${n.target.join(" ")}  ${n.failureSummary?.split("\n")[1] ?? ""}`,
              )
              .join("\n"),
        )
        .join("\n");
      expect(blocking, report).toEqual([]);
      expect(results.passes.length, "axe actually ran rules").toBeGreaterThan(
        10,
      );
    });
  }

  test("header has no horizontal overflow at 390 in ru", async ({
    page,
  }, testInfo) => {
    test.skip(!isMobile(testInfo), "the 390 px header is the mobile project");
    await openStyleguide(page, "ru");
    expect(page.viewportSize()?.width).toBe(390);

    const header = qa(page, "site-header-compact");
    await expect(header).toBeVisible();
    await expect(qa(page, "site-header-desktop")).toBeHidden();

    const fit = await header.evaluate(measureFit);
    expect(fit.ownOverflow).toBeLessThanOrEqual(1);
    expect(fit.escaping).toEqual([]);
    expect(fit.pageOverflow).toBeLessThanOrEqual(0);
  });

  for (const locale of LOCALES) {
    test(`page has no horizontal overflow and the visible header fits (${locale})`, async ({
      page,
    }, testInfo) => {
      await openStyleguide(page, locale);
      const header = qa(
        page,
        isMobile(testInfo) ? "site-header-compact" : "site-header-desktop",
      );
      await expect(header).toBeVisible();
      const fit = await header.evaluate(measureFit);
      expect(fit.ownOverflow).toBeLessThanOrEqual(1);
      expect(fit.escaping).toEqual([]);
      expect(fit.pageOverflow).toBeLessThanOrEqual(0);
    });

    for (const id of ["button-long-label", "nav-pill-long-label"] as const) {
      test(`${id} truncates inside its 358px column in ${locale}`, async ({
        page,
      }) => {
        await openStyleguide(page, locale);
        const pill = qa(page, id).locator("button, a").first();
        await pill.scrollIntoViewIfNeeded();
        const metrics = await pill.evaluate((root) => {
          const column = root.parentElement!;
          const label = root.querySelector<HTMLElement>("span.truncate")!;
          return {
            rootScroll: root.scrollWidth,
            rootClient: root.clientWidth,
            right: root.getBoundingClientRect().right,
            columnRight: column.getBoundingClientRect().right,
            columnWidth: column.getBoundingClientRect().width,
            labelTruncated: label.scrollWidth > label.clientWidth,
            labelOverflow: getComputedStyle(label).textOverflow,
            page: document.documentElement.scrollWidth,
            viewport: window.innerWidth,
          };
        });
        expect(metrics.rootScroll).toBeLessThanOrEqual(metrics.rootClient + 1);
        expect(metrics.right).toBeLessThanOrEqual(metrics.columnRight + 1);
        expect(metrics.columnWidth).toBeLessThanOrEqual(358);
        // The stress example really is wider than the column, and it ends in an ellipsis.
        expect(metrics.labelTruncated).toBe(true);
        expect(metrics.labelOverflow).toBe("ellipsis");
        expect(metrics.page).toBeLessThanOrEqual(metrics.viewport);
      });
    }
  }

  test("layout follows the viewport: header, tab bar", async ({
    page,
  }, testInfo) => {
    await openStyleguide(page, "ru");
    if (isMobile(testInfo)) {
      await expect(qa(page, "site-header-compact")).toBeVisible();
      await expect(qa(page, "site-header-desktop")).toBeHidden();
      const bar = qa(page, "tab-bar-current-catalog");
      await expect(bar).toBeVisible();
      await expect(bar.locator('[aria-current="page"]')).toHaveCount(1);
      await expect(qa(page, "tab-bar-none")).toBeVisible();
      // The visual copy without a current page is not reachable by keyboard.
      expect(
        await qa(page, "tab-bar-none").evaluate(
          (el) => !!el.closest("[inert]"),
        ),
      ).toBe(true);
    } else {
      await expect(qa(page, "site-header-desktop")).toBeVisible();
      await expect(qa(page, "site-header-compact")).toBeHidden();
      await expect(qa(page, "tab-bar-current-catalog")).toBeHidden();
    }
  });

  test("tab bar and labels fit at 320 through 390 wide", async ({
    page,
  }, testInfo) => {
    test.skip(!isMobile(testInfo), "the tab bar is the phone navigation");
    for (const locale of LOCALES) {
      await openStyleguide(page, locale);
      await page.evaluate(() => document.fonts.ready);
      for (const width of [320, 360, 375, 390]) {
        await page.setViewportSize({ width, height: 844 });
        const nav = qa(page, "tab-bar-current-catalog").locator("nav");
        const bar = (await nav.boundingBox())!;
        const links = nav.getByRole("link");
        await expect(links).toHaveCount(5);
        for (let i = 0; i < 5; i++) {
          const box = (await links.nth(i).boundingBox())!;
          expect(box.x, `${width}: tab ${i} left`).toBeGreaterThanOrEqual(
            bar.x,
          );
          expect(
            box.x + box.width,
            `${width}: tab ${i} right`,
          ).toBeLessThanOrEqual(bar.x + bar.width);
          expect(
            box.width,
            `${locale} ${width}: touch target ${i}`,
          ).toBeGreaterThanOrEqual(44);
        }
        const labels = await links.evaluateAll((items) =>
          items.map((item) => {
            const range = document.createRange();
            const node = [...item.childNodes].find(
              (child) =>
                child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
            );
            if (!node) throw new Error("Tab label missing");
            range.selectNode(node);
            const rect = range.getBoundingClientRect();
            return { left: rect.left, right: rect.right };
          }),
        );
        for (let i = 1; i < labels.length; i++) {
          expect(
            labels[i].left - labels[i - 1].right,
            `${locale} ${width}: labels ${i - 1}/${i} remain separate`,
          ).toBeGreaterThanOrEqual(2);
        }
        if (width === 390) {
          expect((await links.nth(0).boundingBox())!.width).toBe(64);
        }
      }
    }
  });

  test("hover styles apply only on hover-capable devices", async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openStyleguide(page, "ru");
    const canHover = await page.evaluate(
      () => matchMedia("(hover: hover)").matches,
    );
    expect(canHover).toBe(!isMobile(testInfo));
    // Nav/Pill default example: hov:border-glass-strong hov:bg-surface-card-hover.
    const target = qa(page, "nav-pill-default").locator("a, button").first();
    const color = () =>
      target.evaluate((el) => {
        const s = getComputedStyle(el);
        return `${s.backgroundColor}|${s.borderTopColor}`;
      });
    const before = await color();
    await target.hover();
    if (canHover) {
      await expect.poll(color).not.toBe(before);
    } else {
      await page.waitForTimeout(100);
      expect(await color()).toBe(before);
    }
  });

  test.describe("reduced motion", () => {
    // The press ripple is the ::after of every `.ripple` component (globals.css `@utility ripple`):
    // `animation: ripple-expand` under the `press` variant, `animation: none` under prefers-reduced-motion.
    const PRESSED = [
      "button-pill-pressed",
      "button-graphite-pressed",
      "icon-button-glass-user-pressed",
      "carousel-arrow-next-pressed",
      "nav-pill-pressed",
    ] as const;

    const rippleAnimation = (id: QaId, page: Page) =>
      qa(page, id)
        .locator(".ripple")
        .first()
        .evaluate((el) => getComputedStyle(el, "::after").animationName);

    test("reduced motion disables ripple", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await openStyleguide(page, "en");
      for (const id of PRESSED) {
        expect(await rippleAnimation(id, page), id).toBe("none");
      }
      // The loading spinner stops too (motion-reduce:animate-none).
      const spinner = qa(page, "button-primary-loading").locator(
        ".animate-spin",
      );
      await expect(spinner).toHaveCount(1);
      expect(
        await spinner.evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("none");
    });

    test("without reduced motion the pressed examples do animate (so the test above can fail)", async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await openStyleguide(page, "en");
      for (const id of PRESSED) {
        expect(await rippleAnimation(id, page), id).toBe("ripple-expand");
      }
      const spinner = qa(page, "button-primary-loading").locator(
        ".animate-spin",
      );
      expect(
        await spinner.evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("spin");
    });
  });

  test("mobile menu opens and closes with Escape", async ({
    page,
  }, testInfo) => {
    test.skip(!isMobile(testInfo), "the menu is the 390 px navigation");
    await openStyleguide(page, "ru");
    const trigger = qa(page, "mobile-menu-trigger").getByRole("button");
    const dialog = page.getByRole("dialog");

    // openStyleguide waited for hydration, so the click handler is attached.
    await trigger.click();
    await expect(dialog).toBeVisible();

    // Focus is moved inside the dialog and stays there while tabbing.
    const insideDialog = () =>
      page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return !!d && d.contains(document.activeElement);
      });
    expect(await insideDialog()).toBe(true);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await insideDialog(), `focus inside after Tab #${i + 1}`).toBe(
        true,
      );
    }

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });
});
