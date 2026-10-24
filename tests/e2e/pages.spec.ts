import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

/*
 * Site shell e2e (Phase 3, Task 4). Runs in the `desktop` (1440) and `mobile` (390) projects.
 * The shell lives in `src/app/[locale]/(site)/layout.tsx`: header, `<main>`, footer, tab bar.
 */

const MESSAGES = { ru, en } as const;
const LOCALES = ["ru", "en"] as const;

/** Resolves once React attached its props to the language switch (hydration reached the island). */
async function hydrated(page: Page) {
  await page.waitForFunction(() => {
    const button = document.querySelector<HTMLElement>(
      "header button[aria-label^='RU / EN'], [role=dialog] button[aria-label^='RU / EN']",
    );
    const probe =
      button ??
      document.querySelector<HTMLElement>("header button[aria-haspopup]");
    if (!probe) return false;
    const key = Object.keys(probe).find((k) => k.startsWith("__reactProps$"));
    return key !== undefined;
  });
}

test.describe("site shell", () => {
  test("shell renders header, footer and tab bar at 390", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "phone layout only");
    const response = await page.goto("/ru");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    const tabBar = page.getByRole("navigation", {
      name: ru.components.tabBar.label,
    });
    await expect(tabBar).toBeVisible();

    // The bar floats 16 px above the bottom edge, over the footer: the FOOTER carries the 100 px of
    // bottom padding (its glass background extends under the bar), the page wrapper none.
    const viewport = page.viewportSize()!;
    const box = (await tabBar.boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 15);
    const main = page.getByRole("main");
    await expect(main).toHaveCount(1);
    await expect(page.locator("[data-site-shell]")).toHaveCSS(
      "padding-bottom",
      "0px",
    );
    await expect(page.getByRole("contentinfo")).toHaveCSS(
      "padding-bottom",
      "124px",
    );
    // no page-background band under the footer: the footer ends at the bottom of the document
    const footerBottom = await page
      .getByRole("contentinfo")
      .evaluate((el) => el.getBoundingClientRect().bottom + window.scrollY);
    const docHeight = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    expect(Math.abs(docHeight - footerBottom)).toBeLessThanOrEqual(1);

    // Every tab is a link since the test shop shipped the Cart page (Home, Catalog, Cart, Favorites, account).
    await expect(tabBar.getByRole("link", { name: "Главная" })).toHaveAttribute(
      "href",
      "/ru",
    );
    await expect(tabBar.locator("a[href]")).toHaveCount(5);
    await expect(tabBar.locator("[aria-disabled=true]")).toHaveCount(0);
  });

  for (const locale of LOCALES) {
    test(`unknown product is 404 in ${locale}`, async ({ page }) => {
      const response = await page.goto(`/${locale}/catalog/no-such-stone`);
      expect(response?.status()).toBe(404);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);

      const copy = MESSAGES[locale].pages.notFound;
      await expect(page.locator("h1")).toHaveText(copy.title);
      await expect(page.getByText(copy.body)).toBeVisible();
      // the 404 is rendered inside the shell, with a way back to the catalog
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
      await expect(
        page.getByRole("main").getByRole("link", { name: copy.toCatalog }),
      ).toHaveAttribute("href", `/${locale}/catalog`);
    });
  }

  test("language switch keeps path and query", async ({ page }) => {
    await page.goto("/ru/catalog?material=marble");
    await hydrated(page);

    const switchName = /^RU \/ EN/;
    const inHeader = page.getByRole("banner").getByRole("button", {
      name: switchName,
    });
    if (!(await inHeader.isVisible())) {
      // below 1280 the switch lives in the mobile menu
      await page
        .getByRole("button", { name: ru.components.nav.openMenu })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: switchName })
        .click();
    } else {
      await inHeader.click();
    }

    await expect(page).toHaveURL(/\/en\/catalog\?material=marble$/);
    // the real catalog renders in en with the filter applied
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      en.pages.catalog.title,
    );
    await expect(
      page.getByRole("button", {
        name: `${en.pages.catalog.filters.material} ${en.catalog.material.marble}`,
      }),
    ).toBeVisible();
    await expect(page.getByText("Showing 2 of 12")).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(2);
  });
});

/*
 * Home page e2e (Phase 3, Task 5). Runs in the `desktop` (1440) and `mobile` (390) projects.
 */
const HOME = ru.pages.home;

test.describe("static images", () => {
  test("catalog images are served directly, not redirected by the middleware", async ({
    request,
  }) => {
    const response = await request.get(
      "/images/catalog/black-marble-390.webp",
      { maxRedirects: 0 },
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/webp");
  });

  test("product page images load", async ({ page }) => {
    await page.goto("/en/catalog/black-marble");
    const image = page.locator("main img").first();
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  });
});

test.describe("home", () => {
  test("home renders three sections with Figma cards", async ({ page }) => {
    const response = await page.goto("/ru");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);

    const catalog = page.getByRole("region", { name: HOME.sections.catalog });
    const promo = page.getByRole("region", { name: HOME.sections.promo });
    const works = page.getByRole("region", { name: HOME.sections.works });

    // Six catalog cards provide a scrollable desktop selection.
    await expect(catalog.getByRole("listitem")).toHaveCount(6);
    for (const slug of ["black-marble", "grey-limestone", "grey-marble"]) {
      await expect(
        catalog.locator(`a[href="/ru/catalog/${slug}"]`),
      ).toHaveCount(1);
    }

    // Four promo cards with discount badges, price and old price.
    await expect(promo.getByRole("listitem")).toHaveCount(4);
    await expect(promo.locator("s")).toHaveCount(4);
    await expect(promo.getByText("−20%")).toHaveCount(2);
    await expect(promo.getByText("−25%")).toHaveCount(1);
    for (const slug of ["taupe-rock", "graphite-rock", "split-limestone"]) {
      await expect(promo.locator(`a[href="/ru/catalog/${slug}"]`)).toHaveCount(
        1,
      );
    }

    // Three work cards and the section action open Our works.
    await expect(works.getByRole("listitem")).toHaveCount(3);
    await expect(works.locator('a[href="/ru/works"]')).toHaveCount(4);
    for (const key of [
      "marble-kitchen-countertop",
      "natural-stone-fireplace-portal",
      "bathroom-cladding",
    ] as const) {
      await expect(
        works.getByRole("heading", { name: HOME.works[key].title }),
      ).toHaveCount(1);
    }
  });

  test("hero search submits to the catalog with q", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "phones: see next test");
    await page.goto("/ru");
    await page.getByText(HOME.hero.searchPlaceholder, { exact: true }).click();
    const field = page.getByRole("searchbox", { name: HOME.hero.searchLabel });
    await field.fill("marble");
    await field.press("Enter");
    await expect(page).toHaveURL(/\/ru\/catalog\?q=marble$/);
  });

  test("hero search is visible and usable at 390", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "phone layout only");
    await page.goto("/ru");
    const pill = page.locator("summary");
    await expect(pill).toBeVisible();
    await pill.focus();
    await pill.press("Enter");
    const field = page.getByRole("searchbox", { name: HOME.hero.searchLabel });
    await expect(field).toBeVisible();
    await field.fill("marble");
    await field.press("Enter");
    await expect(page).toHaveURL(/\/ru\/catalog\?q=marble$/);
  });

  test("Offers links to /catalog?sale=1 and Open catalog to /catalog", async ({
    page,
  }) => {
    await page.goto("/ru");
    await expect(
      page.getByRole("link", { name: HOME.actions.offers }),
    ).toHaveAttribute("href", "/ru/catalog?sale=1");
    await expect(
      page.getByRole("link", { name: HOME.actions.openCatalog }),
    ).toHaveAttribute("href", "/ru/catalog");
  });

  test("Projects opens Our works", async ({ page }) => {
    await page.goto("/ru");
    await page
      .getByRole("link", { name: HOME.actions.projects, exact: true })
      .click();
    await expect(page).toHaveURL(/\/ru\/works$/);
    await expect(page.locator("main article")).toHaveCount(5);
  });

  test("placeholder price line is visible under Promo products", async ({
    page,
  }) => {
    await page.goto("/ru");
    const promo = page.getByRole("region", { name: HOME.sections.promo });
    await expect(promo.getByText(HOME.placeholderPrices)).toBeVisible();
  });

  test("phone and desktop home cards carry live hearts", async ({
    page,
  }, testInfo) => {
    await page.goto("/ru");
    const hearts = page.locator("article button[aria-pressed]");
    if (testInfo.project.name === "mobile") {
      await expect(hearts).toHaveCount(10);
      await expect(hearts.first()).toBeVisible();
    } else {
      await expect(hearts.first()).toBeVisible();
    }
  });

  test("backdrop image is requested at most once", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (/\/images\/home\/backdrop-/.test(request.url())) {
        requests.push(request.url());
      }
    });
    await page.goto("/ru", { waitUntil: "networkidle" });
    expect(requests.length).toBeLessThanOrEqual(1);
  });

  test("hero loads exactly one image", async ({ page }) => {
    const requests: string[] = [];
    page.on("request", (request) => {
      if (/\/images\/hero\/scene-/.test(request.url())) {
        requests.push(request.url());
      }
    });
    await page.goto("/ru", { waitUntil: "networkidle" });
    expect(requests).toHaveLength(1);
  });

  test("no horizontal overflow", async ({ page }) => {
    await page.goto("/ru");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test("carousel arrows scroll", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "arrows are hidden on phones",
    );
    // At 1024 the expanded promo selection overflows the three visible cards.
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/ru");
    const promo = page.getByRole("region", { name: HOME.sections.promo });
    const prev = promo.getByRole("button", {
      name: ru.components.carousel.prev,
    });
    const next = promo.getByRole("button", {
      name: ru.components.carousel.next,
    });
    const track = promo.getByRole("list").locator("xpath=..");

    await expect(prev).toHaveAttribute("aria-disabled", "true");
    await expect(next).not.toHaveAttribute("aria-disabled", "true");
    const bounds = await track.evaluate((el) => ({
      max: el.scrollWidth - el.clientWidth,
      step:
        el.querySelector("li")!.getBoundingClientRect().width +
        Number.parseFloat(getComputedStyle(el.querySelector("ul")!).columnGap),
    }));
    // Wait for each smooth scroll to settle before reading the next disabled state.
    // Otherwise a final in-flight scroll can disable an arrow after the loop's guard.
    const move = async (direction: 1 | -1, keyboard = false) => {
      const before = await track.evaluate((el) => el.scrollLeft);
      const target = Math.max(
        0,
        Math.min(bounds.max, before + direction * bounds.step),
      );
      const arrow = direction === 1 ? next : prev;
      if (keyboard) await arrow.press("Enter");
      else await arrow.click();
      await expect
        .poll(async () =>
          Math.abs((await track.evaluate((el) => el.scrollLeft)) - target),
        )
        .toBeLessThan(2);
    };
    const steps = Math.ceil(bounds.max / bounds.step);
    for (let i = 0; i < steps; i++) await move(1);
    await expect(prev).not.toHaveAttribute("aria-disabled", "true");
    await expect(next).toHaveAttribute("aria-disabled", "true");
    // keyboard: focus on the exhausted arrow stays there (it is aria-disabled, not disabled)
    await prev.focus();
    await move(-1, true);
    await next.focus();
    await expect(next).toBeFocused();
    for (let i = 1; i < steps; i++) await move(-1);
    await expect(prev).toHaveAttribute("aria-disabled", "true");
    await expect(next).not.toHaveAttribute("aria-disabled", "true");
  });

  test("reduced motion scrolls instantly", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "arrows are hidden on phones",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/ru");
    const promo = page.getByRole("region", { name: HOME.sections.promo });
    const track = promo.getByRole("list").locator("xpath=..");
    await promo
      .getByRole("button", { name: ru.components.carousel.next })
      .click();
    const immediate = await track.evaluate((el) => el.scrollLeft);
    await page.waitForTimeout(600);
    const settled = await track.evaluate((el) => el.scrollLeft);
    expect(immediate).toBeGreaterThan(0);
    expect(immediate).toBe(settled);
  });
});

/*
 * Catalog page e2e (Phase 3, Task 6). Runs in the `desktop` (1440) and `mobile` (390) projects.
 * The filter state lives in the URL; with JavaScript a change navigates (router.push), without it the
 * form is a plain GET submitted with the Apply button.
 */
const CAT = ru.pages.catalog;
const NAMES = ru.catalog.products;

/** Waits for hydration: the no-JS Apply button hides itself once the client island is mounted. */
async function catalogReady(page: Page) {
  await expect(
    page.getByRole("button", { name: CAT.applyFilters }),
  ).toBeHidden();
}

async function pick(page: Page, field: string, option: string) {
  await page.getByRole("button", { name: new RegExp(`^${field} `) }).click();
  await page.getByRole("option", { name: option }).click();
}

const cards = (page: Page) => page.getByRole("article");

test.describe("catalog", () => {
  test("filter by material updates URL and grid", async ({ page }) => {
    await page.goto("/ru/catalog");
    await catalogReady(page);
    await expect(cards(page)).toHaveCount(12);
    await pick(page, CAT.filters.material, ru.catalog.material.marble);
    await expect(page).toHaveURL(/\/ru\/catalog\?material=marble$/);
    await expect(cards(page)).toHaveCount(2);
    await expect(page.getByText("Показано 2 из 12")).toBeVisible();
  });

  test("search finds Чёрный мрамор in ru", async ({ page }) => {
    await page.goto("/ru/catalog");
    await catalogReady(page);
    const field = page.getByRole("searchbox", { name: CAT.searchLabel });
    await field.fill("чёрный");
    await field.press("Enter");
    await expect(page).toHaveURL(/q=/);
    await expect(cards(page)).toHaveCount(1);
    await expect(
      cards(page).getByRole("link", { name: NAMES["black-marble"].name }),
    ).toBeVisible();
  });

  test("sort by price ascending", async ({ page }) => {
    await page.goto("/ru/catalog");
    await catalogReady(page);
    await pick(page, CAT.filters.sort, CAT.sort["price-asc"]);
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(cards(page).first().getByRole("link")).toHaveText(
      NAMES["taupe-rock"].name,
    );
  });

  test("Back restores the previous filter", async ({ page }) => {
    await page.goto("/ru/catalog");
    await catalogReady(page);
    await pick(page, CAT.filters.material, ru.catalog.material.marble);
    await expect(page).toHaveURL(/material=marble$/);
    await pick(page, CAT.filters.color, ru.catalog.colorGroup.dark);
    await expect(page).toHaveURL(/color=dark/);
    await expect(cards(page)).toHaveCount(1);

    await page.goBack();
    await expect(page).toHaveURL(/\/ru\/catalog\?material=marble$/);
    await expect(cards(page)).toHaveCount(2);
    await expect(
      page.getByRole("button", {
        name: `${CAT.filters.color} ${CAT.filters.allColors}`,
      }),
    ).toBeVisible();
  });

  test("empty result shows empty state and reset clears filters", async ({
    page,
  }) => {
    await page.goto("/ru/catalog?material=marble&color=warm");
    await expect(page.getByText(CAT.empty.title)).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
    await expect(page.getByText("Показано 0 из 12")).toBeVisible();
    await page.getByRole("link", { name: CAT.empty.reset }).click();
    await expect(page).toHaveURL(/\/ru\/catalog$/);
    await expect(cards(page)).toHaveCount(12);
  });

  test("the results counter is a polite live region that updates", async ({
    page,
  }) => {
    await page.goto("/ru/catalog");
    await catalogReady(page);
    const live = page.locator("[aria-live=polite]");
    await expect(live).toHaveText("Показано 12 из 12");
    await pick(page, CAT.filters.material, ru.catalog.material.marble);
    await expect(live).toHaveText("Показано 2 из 12");
  });

  test("only the fields are inside the search landmark", async ({ page }) => {
    await page.goto("/ru/catalog");
    const search = page.getByRole("search");
    await expect(search).toHaveCount(1);
    await expect(search.getByRole("searchbox")).toHaveCount(1);
    await expect(search.getByRole("heading", { level: 1 })).toHaveCount(0);
    await expect(search.locator("[aria-live]")).toHaveCount(0);
  });

  test("a filter change keeps the scroll position", async ({ page }) => {
    await page.goto("/ru/catalog");
    await catalogReady(page);
    await page.evaluate(() => window.scrollTo(0, 250));
    await pick(page, CAT.filters.sort, CAT.sort["price-asc"]);
    await expect(page).toHaveURL(/sort=price-asc/);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  });

  test("search matches ё typed as е", async ({ page }) => {
    await page.goto("/ru/catalog?q=черный");
    await expect(cards(page)).toHaveCount(1);
  });

  test("invalid params render the catalog", async ({ page }) => {
    const response = await page.goto("/ru/catalog?material=granite&sort=foo");
    expect(response?.status()).toBe(200);
    await expect(cards(page)).toHaveCount(12);
  });

  test("showing N of 12 and the placeholder price line are visible", async ({
    page,
  }) => {
    await page.goto("/ru/catalog");
    await expect(page.getByText("Показано 12 из 12")).toBeVisible();
    await expect(page.getByText(CAT.placeholderPrices)).toBeVisible();
  });

  test("cards link to products, hearts and the custom request CTA are live", async ({
    page,
  }) => {
    await page.goto("/ru/catalog");
    await expect(
      page.locator('article a[href="/ru/catalog/black-marble"]'),
    ).toHaveCount(1);
    await expect(page.locator("article button[aria-pressed]")).toHaveCount(12);
    await expect(
      page.locator("article [role=button][aria-disabled=true]"),
    ).toHaveCount(0);
    await expect(
      page.getByRole("main").getByText(CAT.customOrder.cta),
    ).toBeVisible();
    await expect(
      page.getByRole("main").locator("a", { hasText: CAT.customOrder.cta }),
    ).toHaveAttribute("href", "/ru/create-your-stone");
  });

  test("back button goes home", async ({ page }) => {
    await page.goto("/ru/catalog");
    await expect(page.getByRole("link", { name: CAT.back })).toHaveAttribute(
      "href",
      "/ru",
    );
  });

  test("no horizontal overflow at 360 in ru", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto("/ru/catalog");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });

  for (const locale of LOCALES) {
    test(`axe has no critical or serious violations (${locale})`, async ({
      page,
    }) => {
      await page.goto(`/${locale}/catalog`);
      await catalogReady(page);
      // The floating glass tab bar (shell, Task 4) sits over scrolling content, so its contrast depends on
      // whatever photo is behind it; axe cannot resolve the blur and measures the photo. Shell concern.
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .exclude(`[aria-label="${MESSAGES[locale].components.tabBar.label}"]`)
        .analyze();
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(blocking.map((v) => `${v.id}: ${v.nodes[0]?.html}`)).toEqual([]);
    });
  }
});

test.describe("home without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("carousel arrows look disabled because they cannot scroll", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "arrows are hidden on phones",
    );
    // at 1024 the promo cards overflow the track, so with JavaScript Next would be enabled
    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/ru");
    const promo = page.getByRole("region", { name: HOME.sections.promo });
    for (const name of [
      ru.components.carousel.prev,
      ru.components.carousel.next,
    ]) {
      await expect(promo.getByRole("button", { name })).toHaveAttribute(
        "aria-disabled",
        "true",
      );
    }
  });
});

test.describe("catalog without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("filters apply without JavaScript", async ({ page }) => {
    await page.goto("/ru/catalog?sale=1");
    await expect(cards(page)).toHaveCount(4);
    // native fallback selects and the visible Apply button
    await page
      .getByLabel(CAT.filters.material, { exact: true })
      .selectOption("slate");
    await page.getByRole("button", { name: CAT.applyFilters }).click();
    await expect(page).toHaveURL(/material=slate/);
    await expect(page).toHaveURL(/sale=1/);
    await expect(cards(page)).toHaveCount(1);
    await expect(
      cards(page).getByRole("link", { name: NAMES["graphite-rock"].name }),
    ).toBeVisible();
  });

  test("material options are in ru alphabetical order", async ({ page }) => {
    await page.goto("/ru/catalog");
    const labels = await page
      .getByLabel(CAT.filters.material, { exact: true })
      .locator("option")
      .allTextContents();
    expect(labels).toEqual([
      CAT.filters.allMaterials,
      "Бетон",
      "Известняк",
      "Кварцит",
      "Мрамор",
      "Песчаник",
      "Сланец",
    ]);
  });
});

test.describe("catalog shell surface", () => {
  // Figma 922:25494: the glass header and footer are translucent fills over the light catalog page, so
  // they render mid-grey (~#666) and graphite (~#3b3c3e). The page surface must sit behind them.
  test("header and footer blend over the catalog surface like Figma", async ({
    page,
  }) => {
    await page.goto("/en/catalog");
    const blended = await page.evaluate(() => {
      const parse = (css: string) =>
        (css.match(/[\d.]+/g) ?? []).map(Number) as number[];
      const bg = (el: Element) => parse(getComputedStyle(el).backgroundColor);
      const shell = bg(document.querySelector("[data-site-shell]")!);
      const over = (top: number[]) => {
        const a = top[3] ?? 1;
        return [0, 1, 2].map((i) => top[i] * a + shell[i] * (1 - a));
      };
      return {
        header: over(bg(document.querySelector("header")!)),
        footer: over(bg(document.querySelector("footer")!)),
      };
    });
    const near = (got: number[], want: number[]) =>
      got.forEach((v, i) =>
        expect(Math.abs(v - want[i])).toBeLessThanOrEqual(8),
      );
    near(blended.header, [102, 102, 102]);
    near(blended.footer, [59, 60, 62]);
  });
});

/*
 * Navigation flow e2e (Phase 3, Task 8). Runs in the `desktop` (1440) and `mobile` (390) projects.
 */
test.describe("navigation", () => {
  test("navigation home → catalog → product → breadcrumb → catalog", async ({
    page,
  }, testInfo) => {
    await page.goto("/en");
    await expect(page.getByRole("banner")).toBeVisible();

    // Home → catalog: the hero action on desktop, the tab bar on phones (the hero is covered there).
    if (testInfo.project.name === "mobile") {
      await page
        .getByRole("navigation", { name: en.components.tabBar.label })
        .getByRole("link", { name: en.components.tabBar.catalog })
        .click();
    } else {
      await page
        .getByRole("link", { name: en.pages.home.actions.openCatalog })
        .click();
    }
    await expect(page).toHaveURL(/\/en\/catalog$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      en.pages.catalog.title,
    );

    // Catalog → product
    await page.locator('article a[href="/en/catalog/black-marble"]').click();
    await expect(page).toHaveURL(/\/en\/catalog\/black-marble$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Black Marble",
    );

    // Product → breadcrumb → catalog
    const crumbs = page.getByRole("navigation", {
      name: en.components.breadcrumb.label,
    });
    await crumbs
      .getByRole("link", { name: en.pages.catalog.title, exact: true })
      .click();
    await expect(page).toHaveURL(/\/en\/catalog$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      en.pages.catalog.title,
    );
    await expect(page.getByRole("article")).toHaveCount(12);
  });

  test("tab bar navigates home and catalog at 390", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "phone layout only");
    const tabBar = page.getByRole("navigation", {
      name: en.components.tabBar.label,
    });

    await page.goto("/en");
    await tabBar
      .getByRole("link", { name: en.components.tabBar.catalog })
      .click();
    await expect(page).toHaveURL(/\/en\/catalog$/);
    await expect(
      tabBar.getByRole("link", { name: en.components.tabBar.catalog }),
    ).toHaveAttribute("aria-current", "page");

    await tabBar.getByRole("link", { name: en.components.tabBar.home }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(
      tabBar.getByRole("link", { name: en.components.tabBar.home }),
    ).toHaveAttribute("aria-current", "page");
  });
});

/*
 * Fix round 1 (Phase 3, Task 8): findings of the page comparison.
 */
test.describe("home panel glass", () => {
  test("each section panel darkens like the Figma shadow behind the translucent fill", async ({
    page,
  }) => {
    // Figma draws the panel's drop shadow THROUGH the translucent fill (measured: backdrop under
    // the panel is about 28 % darker than the same pixels under a CSS box-shadow, which is clipped
    // inside the border box). The panel adds a 28 % black veil to match (docs/QA/phase-3-pages.md D1).
    await page.goto("/en");
    const panels = page.locator("section[aria-labelledby$='-heading']");
    await expect(panels).toHaveCount(3);
    for (let i = 0; i < 3; i += 1) {
      await expect(panels.nth(i)).toHaveCSS(
        "background-image",
        "linear-gradient(rgba(0, 0, 0, 0.28), rgba(0, 0, 0, 0.28))",
      );
    }
  });
});

test.describe("catalog grid card heights", () => {
  test("cards keep their own height at 390 (no stretch to the row)", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "two-column grid at 390");
    await page.goto("/en/catalog");
    // Concrete Paver has a discount badge and an old price (taller), Golden Rock sits next to it.
    const heightOf = async (name: string) =>
      (await page
        .getByRole("article")
        .filter({ hasText: name })
        .first()
        .boundingBox())!.height;
    const paver = await heightOf("Concrete Paver");
    const golden = await heightOf("Golden Rock");
    expect(paver).toBeGreaterThan(golden + 10);
  });
});

/*
 * Spec worst-case data: product names wrap to at most two lines with an ellipsis, and a long
 * unbroken word breaks instead of overflowing. The real names are short, so the test swaps in the
 * styleguide long name plus a 63-letter word, at 320 and at the project width.
 */
test.describe("long product names", () => {
  const LONG = `${ru.styleguide.demo.longName.name} ${"Известняк".repeat(7)}`;
  const NAME = "article h3[class*='type-catalog-product-name']";

  async function expectClamped(page: Page) {
    const box = await page
      .locator(NAME)
      .first()
      .evaluate((heading, text) => {
        (heading.querySelector("a") ?? heading).textContent = text;
        const style = getComputedStyle(heading);
        const card = heading.closest("article")!;
        return {
          height: heading.getBoundingClientRect().height,
          lineHeight: parseFloat(style.lineHeight),
          overflow: heading.scrollWidth - heading.clientWidth,
          cardOverflow: card.scrollWidth - card.clientWidth,
          // -webkit-line-clamp draws the ellipsis itself (text-overflow stays "clip")
          clamp: style.getPropertyValue("-webkit-line-clamp"),
          truncated: heading.scrollHeight > heading.clientHeight,
        };
      }, LONG);
    expect(box.height).toBeLessThanOrEqual(box.lineHeight * 2 + 1);
    expect(box.overflow).toBeLessThanOrEqual(0);
    expect(box.cardOverflow).toBeLessThanOrEqual(0);
    expect(box.clamp).toBe("2");
    expect(box.truncated).toBe(true);
  }

  for (const width of [320, undefined]) {
    test(`catalog and home cards clamp a long name at ${width ?? "project width"}`, async ({
      page,
    }) => {
      if (width) await page.setViewportSize({ width, height: 800 });
      await page.goto("/ru/catalog");
      await expectClamped(page);
      await page.goto("/ru");
      await expectClamped(page);
    });
  }
});

/*
 * Design QA fixes D7 / D8 (docs/QA/phase-3-pages.md): the Our works card and panel match Figma's
 * heights (Figma strokes sit inside the 4 px rim, CSS borders do not), and the last home panel is
 * 24 px above the footer at 390.
 */
test.describe("home design QA geometry", () => {
  test("Our works keeps card height with compact panel padding", async ({
    page,
  }, testInfo) => {
    const mobile = testInfo.project.name === "mobile";
    await page.goto("/ru");
    const works = page.locator("section[aria-labelledby='home-works-heading']");
    const card = works.getByRole("article").first();
    // Figma 713:561 Work: media 300 / 240 plus the 4 px rim on both sides
    expect((await card.boundingBox())!.height).toBe(mobile ? 248 : 308);
    // Compact desktop: 22 px padding + border each side, header 40, gap 20. Mobile is unchanged.
    expect((await works.boundingBox())!.height).toBe(mobile ? 338 : 414);
  });

  test("the last home panel is 24 px above the footer at 390", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "mobile padding");
    await page.goto("/ru");
    const works = page.locator("section[aria-labelledby='home-works-heading']");
    const panel = (await works.boundingBox())!;
    const foot = (await page.getByRole("contentinfo").boundingBox())!;
    expect(foot.y - (panel.y + panel.height)).toBe(24);
  });
});
