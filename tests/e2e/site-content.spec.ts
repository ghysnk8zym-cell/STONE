import AxeBuilder from "@axe-core/playwright";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { expect, signInInContext, test } from "./auth-fixtures";
import { SEEDED } from "./test-env";

for (const [locale, messages] of [
  ["en", en],
  ["ru", ru],
] as const) {
  const t = messages.admin.siteContent;
  test(`${locale}: edits home text, refuses a stale tab, renders literal text and restores messages`, async ({
    page,
    context,
  }, info) => {
    test.skip(
      info.project.name !== "auth-desktop",
      "The desktop project exercises editing.",
    );
    await signInInContext(context, SEEDED.admin);
    const stale = await context.newPage();
    const home = await context.newPage();
    try {
      for (const tab of [page, stale]) {
        await tab.goto(`/${locale}/admin/site-content`);
        await tab
          .getByRole("navigation", { name: t.pages })
          .getByRole("button", { name: t.sections.works, exact: true })
          .click();
      }
      const literal = "<b>{name}</b>";
      await page.getByLabel(t.fields.heading, { exact: true }).fill(literal);
      await page.getByRole("button", { name: t.save, exact: true }).click();
      await expect(page.getByRole("status")).toHaveText(t.saved);
      const firstHome = await home.goto(`/${locale}`);
      expect(firstHome?.headers()["x-nextjs-cache"]).toBeUndefined();
      expect(firstHome?.headers()["cache-control"]).toMatch(/no-store/);
      await expect(
        home.getByRole("heading", { name: literal, exact: true, level: 2 }),
      ).toBeVisible();
      await expect(home.locator("#home-works-heading b")).toHaveCount(0);
      await stale
        .getByLabel(t.fields.heading, { exact: true })
        .fill("Stale text");
      await stale.getByRole("button", { name: t.save, exact: true }).click();
      await expect(stale.getByRole("main").getByRole("alert")).toHaveText(
        t.errors.conflict,
      );
      await expect(
        stale.getByLabel(t.fields.heading, { exact: true }),
      ).toHaveValue("Stale text");
      await page
        .getByLabel(t.fields.heading, { exact: true })
        .fill("Updated works");
      await page.getByRole("button", { name: t.save, exact: true }).click();
      await expect(page.getByRole("status")).toHaveText(t.saved);
      await home.reload();
      await expect(
        home.getByRole("heading", {
          name: "Updated works",
          exact: true,
          level: 2,
        }),
      ).toBeVisible();
      await page.getByRole("button", { name: t.restore, exact: true }).click();
      await expect(page.getByRole("status")).toHaveText(t.restored);
      const restoredHome = await home.reload();
      expect(restoredHome?.headers()["x-nextjs-cache"]).toBeUndefined();
      expect(restoredHome?.headers()["cache-control"]).toMatch(/no-store/);
      await page.reload();
      await page
        .getByRole("navigation", { name: t.pages })
        .getByRole("button", { name: t.sections.works, exact: true })
        .click();
      const restoredValue = await page
        .getByLabel(t.fields.heading, { exact: true })
        .inputValue();
      await info.attach("restored-home-cache", {
        body: JSON.stringify({
          status: restoredHome?.status(),
          cache: restoredHome?.headers()["x-nextjs-cache"],
          cacheControl: restoredHome?.headers()["cache-control"],
          editorValue: restoredValue,
          homeValue: await home.locator("#home-works-heading").textContent(),
        }),
        contentType: "application/json",
      });
      expect(restoredValue).toBe(messages.pages.home.sections.works);
      await expect(
        home.getByRole("heading", {
          name: messages.pages.home.sections.works,
          exact: true,
          level: 2,
        }),
      ).toBeVisible();
    } finally {
      await stale.close();
      await home.close();
    }
  });
  for (const width of [1440, 1024, 390])
    test(`${locale}: Site content at ${width}px is accessible and fits`, async ({
      page,
      context,
    }, info) => {
      test.skip(
        (width === 390) !== (info.project.name === "auth-mobile"),
        "The matching viewport project runs this check.",
      );
      await page.setViewportSize({ width, height: 1000 });
      await signInInContext(context, SEEDED.admin);
      await page.goto(`/${locale}/admin/site-content`);
      if (width >= 1024)
        await expect(
          page.getByRole("complementary", { name: t.preview }),
        ).toBeVisible();
      else await expect(page.locator("[data-admin-narrow]")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      await page.screenshot({
        path: info.outputPath(`site-content-${locale}-${width}.png`),
        fullPage: true,
      });
    });
}
