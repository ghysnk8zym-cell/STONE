import { expect, test } from "@playwright/test";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

for (const locale of ["ru", "en"] as const) {
  test(`route motion ${locale}: product, return filters and history`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      const start = document.startViewTransition?.bind(document);
      const observed: string[] = [];
      (window as unknown as { motionObserved: string[] }).motionObserved =
        observed;
      if (start)
        document.startViewTransition = ((...args: Parameters<typeof start>) => {
          const transition = start(...args);
          void transition.ready
            .then(() => {
              for (const animation of document.getAnimations()) {
                const effect = animation.effect as KeyframeEffect | null;
                if (effect?.pseudoElement) observed.push(effect.pseudoElement);
              }
            })
            .catch(() => {});
          return transition;
        }) as typeof document.startViewTransition;
    });
    await page.goto(`/${locale}/catalog?material=marble`);
    const card = page
      .locator("main article")
      .filter({ has: page.locator('a[href$="/catalog/black-marble"]') })
      .first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        !!document.querySelector("header button") &&
        Object.keys(document.querySelector("header button")!).some((k) =>
          k.startsWith("__reactProps$"),
        ),
    );
    const y = await page.evaluate(() => scrollY);
    await page.evaluate(() => {
      (window as unknown as { shell: Element | null }).shell =
        document.querySelector("header");
    });
    await card.locator('a[href$="/catalog/black-marble"]').click();
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/catalog/black-marble$`),
    );
    await expect(page.locator("[data-gallery-main] img")).toBeVisible();
    await page.waitForFunction(() =>
      [
        ...document.querySelectorAll<HTMLImageElement>(
          "[data-gallery-main] img",
        ),
      ].every((img) => img.complete && img.naturalWidth > 0),
    );
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document
              .getAnimations()
              .filter((a) => (a.effect as KeyframeEffect | null)?.pseudoElement)
              .length,
        ),
      )
      .toBe(0);
    await page.screenshot({
      path: testInfo.outputPath(`product-${locale}.png`),
    });
    await expect(
      page.getByRole("link", {
        name: (locale === "en" ? en : ru).pages.product.back,
        exact: true,
      }),
    ).toHaveAttribute("href", `/${locale}/catalog?material=marble`);
    expect(
      await page.evaluate(
        () =>
          (window as unknown as { shell: Element | null }).shell ===
          document.querySelector("header"),
      ),
    ).toBe(true);
    await page
      .getByRole("link", {
        name: (locale === "en" ? en : ru).pages.product.back,
        exact: true,
      })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/catalog\\?material=marble$`),
    );
    await expect.poll(() => page.evaluate(() => scrollY)).toBeCloseTo(y, -1);
    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/catalog/black-marble$`),
    );
    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/catalog\\?material=marble$`),
    );
    const motion = await page.evaluate(
      () => (window as unknown as { motionObserved: string[] }).motionObserved,
    );
    expect(motion.some((name) => name.includes("stone-photo-"))).toBe(true);
    expect(errors).toEqual([]);
  });
}

test("reduced motion and unsupported browser keep navigation usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(document, "startViewTransition", {
      value: undefined,
      configurable: true,
    });
  });
  await page.goto("/en/catalog");
  expect(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--motion-product-duration")
        .trim(),
    ),
  ).toMatch(/^0(?:ms|s)$/);
  await page.locator('main a[href$="/catalog/black-marble"]').first().click();
  await expect(page.locator("[data-gallery-main]")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/en\/catalog$/);
});

test("new-tab click preserves the current catalog", async ({
  page,
  context,
}) => {
  await page.goto("/en/catalog?material=marble");
  const [opened] = await Promise.all([
    context.waitForEvent("page"),
    page
      .locator('main a[href$="/catalog/black-marble"]')
      .first()
      .click({ modifiers: ["Control"] }),
  ]);
  await opened.waitForURL(/\/en\/catalog\/black-marble$/);
  await expect(page).toHaveURL(/\/en\/catalog\?material=marble$/);
  await opened.close();
});

test("ordinary navigation fades page content while the header stays mounted", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observed: string[] = [];
    (window as unknown as { pageMotion: string[] }).pageMotion = observed;
    const start = document.startViewTransition.bind(document);
    document.startViewTransition = ((...args: Parameters<typeof start>) => {
      const transition = start(...args);
      void transition.ready
        .then(() => {
          observed.push(
            ...document
              .getAnimations()
              .map((a) => (a as CSSAnimation).animationName || ""),
          );
        })
        .catch(() => {});
      return transition;
    }) as typeof document.startViewTransition;
  });
  await page.goto("/en");
  await page.waitForFunction(() =>
    Object.keys(document.querySelector("header button")!).some((k) =>
      k.startsWith("__reactProps$"),
    ),
  );
  await page.evaluate(() => {
    (window as unknown as { shell: Element | null }).shell =
      document.querySelector("header");
  });
  await page.locator('a[href="/en/catalog"]:visible').first().click();
  await expect(page).toHaveURL(/\/en\/catalog$/);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { pageMotion: string[] }).pageMotion,
      ),
    )
    .toContain("stone-page-in");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { shell: Element | null }).shell ===
        document.querySelector("header"),
    ),
  ).toBe(true);
});
