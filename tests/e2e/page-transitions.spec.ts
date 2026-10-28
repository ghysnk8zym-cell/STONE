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
      const observed: string[] = [];
      const cloneSafety: boolean[] = [];
      (window as unknown as { cloneSafety: boolean[] }).cloneSafety =
        cloneSafety;
      const snapshots: { path: string; y: number }[] = [];
      (window as unknown as { motionObserved: string[] }).motionObserved =
        observed;
      (
        window as unknown as { motionSnapshots: typeof snapshots }
      ).motionSnapshots = snapshots;
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        const result = animate.call(this, frames, options);
        const id = typeof options === "object" ? options.id || "" : "";
        if (id.startsWith("stone-")) {
          cloneSafety.push(
            [
              ...document.querySelectorAll<HTMLElement>(
                "[data-stone-transition-overlay]",
              ),
            ].every(
              (stage) =>
                stage.inert &&
                stage.getAttribute("aria-hidden") === "true" &&
                !stage.querySelector(
                  "[id],[name],[action],[formaction],title,meta,input[type=hidden]",
                ),
            ),
          );
          observed.push(id);
          snapshots.push({ path: location.pathname, y: scrollY });
        }
        return result;
      };
    });
    await page.goto(`/${locale}/catalog?material=marble`);
    const card = page
      .locator("main article")
      .filter({ has: page.locator('a[href$="/catalog/grey-marble"]') })
      .first();
    await card.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      () =>
        !!document.querySelector("header button") &&
        Object.keys(document.querySelector("header button")!).some((k) =>
          k.startsWith("__reactProps$"),
        ),
    );

    await page.evaluate(() => {
      (window as unknown as { shell: Element | null }).shell =
        document.querySelector("header");
    });
    await card.locator('a[href$="/catalog/grey-marble"]').click();
    const y = await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem("stone:catalog-return")!).y as number,
    );
    await expect(page).toHaveURL(new RegExp(`/${locale}/catalog/grey-marble$`));
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
            document.getAnimations().filter((a) => a.id.startsWith("stone-"))
              .length,
        ),
      )
      .toBe(0);
    await expect(page.locator("[data-stone-transition-overlay]")).toHaveCount(
      0,
    );
    await expect(page.locator("[data-gallery-main]")).toHaveCSS("opacity", "1");
    expect(
      (
        await page.evaluate(
          () => (window as unknown as { cloneSafety: boolean[] }).cloneSafety,
        )
      ).every(Boolean),
    ).toBe(true);
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
    await expect(page).toHaveURL(new RegExp(`/${locale}/catalog/grey-marble$`));
    await page.goBack();
    await expect(page).toHaveURL(
      new RegExp(`/${locale}/catalog\\?material=marble$`),
    );
    const motion = await page.evaluate(
      () => (window as unknown as { motionObserved: string[] }).motionObserved,
    );
    expect(motion.some((name) => name.includes("stone-photo-"))).toBe(true);
    const snapshots = await page.evaluate(
      () =>
        (
          window as unknown as {
            motionSnapshots: { path: string; y: number }[];
          }
        ).motionSnapshots,
    );
    expect(
      snapshots.find((s) => s.path === `/${locale}/catalog`)?.y,
    ).toBeCloseTo(y, -1);
    expect(errors).toEqual([]);
  });
}

test("reduced motion and unavailable animation API keep navigation usable", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(Element.prototype, "animate", {
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
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const result = animate.call(this, frames, options);
      const id = typeof options === "object" ? options.id || "" : "";
      if (id.startsWith("stone-")) observed.push(id);
      return result;
    };
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
    .toContain("stone-page-enter");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { shell: Element | null }).shell ===
        document.querySelector("header"),
    ),
  ).toBe(true);
});
