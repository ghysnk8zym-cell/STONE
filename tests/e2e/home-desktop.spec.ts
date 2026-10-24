import { expect, test } from "@playwright/test";

for (const locale of ["en", "ru"]) {
  for (const width of [1024, 1280, 1440, 1920]) {
    test(`${locale} home desktop geometry and controls at ${width}`, async ({
      page,
    }, info) => {
      test.skip(
        info.project.name !== "desktop",
        "explicit desktop viewport matrix",
      );
      await page.setViewportSize({ width, height: 1080 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/${locale}`);
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("html")).toHaveAttribute(
        "data-account-state",
        /guest|signed-in/,
      );
      const geometry = await page.evaluate(() => {
        const box = (selector: string) =>
          document.querySelector(selector)!.getBoundingClientRect().toJSON();
        const hero = box(".home-hero");
        const heading = box(".home-hero h1");
        return {
          header: box("[data-site-header]"),
          hero,
          heading,
          search: box(".home-hero summary"),
          panels: [
            ...document.querySelectorAll(".home-page section[aria-labelledby]"),
          ].map((el) => el.getBoundingClientRect().toJSON()),
          clientWidth: document.documentElement.clientWidth,
          overflow: document.documentElement.scrollWidth - innerWidth,
          zoom: getComputedStyle(document.documentElement).zoom,
          // The wide art's quiet slab occupies x=3%..24%, before the smaller foreground slab.
          textRight:
            heading.x +
            document
              .querySelector(".home-hero h1 span:last-child")!
              .getBoundingClientRect().width,
        };
      });
      expect(geometry.header.height).toBe(48);
      await expect(page.locator(".home-hero summary")).toHaveCSS(
        "color",
        "rgb(255, 255, 255)",
      );
      expect(geometry.hero.y).toBeGreaterThanOrEqual(
        geometry.header.bottom - 1,
      );
      expect(geometry.hero.width / geometry.hero.height).toBeCloseTo(
        1920 / 630,
        2,
      );
      expect(geometry.heading.x).toBeCloseTo(geometry.search.x, 0);
      expect(geometry.heading.x).toBeGreaterThan(geometry.hero.width * 0.03);
      expect(geometry.heading.right).toBeLessThan(geometry.hero.width * 0.25);
      expect(geometry.search.y - geometry.heading.bottom).toBeCloseTo(16, 0);
      expect(geometry.overflow).toBeLessThanOrEqual(1);
      expect(geometry.zoom).toBe("1");
      expect(geometry.panels).toHaveLength(3);
      for (const panel of geometry.panels) {
        expect(panel.width).toBeCloseTo(
          Math.min(1600, geometry.clientWidth - 80),
          0,
        );
        expect(panel.left).toBeCloseTo(
          (geometry.clientWidth - panel.width) / 2,
          0,
        );
      }

      for (const section of await page
        .locator(".home-page section[aria-labelledby]")
        .all()) {
        const track = section.locator("[data-carousel-track]");
        // Scope to the two arrow wrappers; favourite hearts are inside the track.
        const prev = section
          .locator('[role="group"] > span')
          .first()
          .getByRole("button");
        const next = section
          .locator('[role="group"] > span')
          .last()
          .getByRole("button");
        const overflows = await track.evaluate(
          (el) => el.scrollWidth > el.clientWidth + 2,
        );
        await expect(prev).toHaveAttribute("aria-disabled", "true");
        if (overflows) {
          await expect(next).not.toHaveAttribute("aria-disabled", "true");
          await next.press("Enter");
          await expect
            .poll(() => track.evaluate((el) => el.scrollLeft))
            .toBeGreaterThan(0);
          await expect(prev).not.toHaveAttribute("aria-disabled", "true");
          await prev.press("Enter");
          await expect
            .poll(() => track.evaluate((el) => el.scrollLeft))
            .toBeLessThanOrEqual(2);
        } else {
          await expect(next).toHaveAttribute("aria-disabled", "true");
        }
        const partialCards = await track.evaluate((el) => {
          const viewport = el.getBoundingClientRect();
          return [...el.querySelectorAll("li")].filter((li) => {
            const card = li.getBoundingClientRect();
            return (
              card.left < viewport.right - 1 && card.right > viewport.right + 1
            );
          }).length;
        });
        expect(partialCards).toBe(0);
      }
      await expect(
        page.locator("[data-showcase-favorite]").first(),
      ).toBeVisible();
      await page.screenshot({
        path: info.outputPath(`home-${locale}-${width}.png`),
        fullPage: true,
      });
      const heart = page.locator("[data-showcase-favorite] button").first();
      await heart.press("Tab");
      await heart.press("Enter");
      await expect(page).toHaveURL(new RegExp(`/${locale}/sign-in\\?next=`));
      expect(new URL(page.url()).searchParams.get("next")).toBe(`/${locale}`);
    });
  }
}
