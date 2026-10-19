import AxeBuilder from "@axe-core/playwright";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { expect, signInInContext, test } from "./auth-fixtures";
import { SEEDED } from "./test-env";

for (const locale of ["en", "ru"] as const) {
  const t = { en, ru }[locale].admin.createYourStone;
  test(`${locale}: draft/status updates reject stale editors and remain searchable through Overview with a customer link`, async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "auth-desktop",
      "The desktop project exercises the request editor.",
    );
    await signInInContext(context, SEEDED.admin);
    const number = locale === "en" ? "Q-1048" : "Q-1047";
    const url = `/${locale}/admin/create-your-stone?q=${number}`;
    await page.goto(url);
    const stale = await context.newPage();
    try {
      await stale.goto(url);
      await expect(stale.getByLabel(t.unitPrice)).toBeVisible();
      await page.getByLabel(t.unitPrice).fill("65.50");
      await page.getByRole("button", { name: t.saveDraft }).click();
      await expect(
        page.getByRole("main").getByText(t.saved, { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel(t.status, { exact: true })).toHaveValue(
        "draft_quote",
      );
      const selectedUrl = new URL(page.url());
      selectedUrl.searchParams.set("status", "draft_quote");
      await page.goto(selectedUrl.toString());
      await stale.getByLabel(t.status, { exact: true }).selectOption("new");
      await stale.getByRole("button", { name: t.saveStatus }).click();
      await expect(stale.getByRole("main").getByRole("alert")).toHaveText(
        t.errors.conflict,
      );
      await stale.getByLabel(t.unitPrice).fill("55");
      await stale.getByRole("button", { name: t.saveDraft }).click();
      await expect(stale.getByRole("main").getByRole("alert")).toHaveText(
        t.errors.conflict,
      );
      await expect(stale.getByLabel(t.unitPrice)).toHaveValue("55");
      await page
        .getByLabel(t.status, { exact: true })
        .selectOption("awaiting_payment");
      await page.getByLabel(t.unitPrice).fill("77");
      await page.getByRole("button", { name: t.saveStatus }).click();
      await expect(
        page.getByText(t.statusSaved, { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByText(t.outsideFilter, { exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel(t.unitPrice)).toHaveValue("77");
      await page.reload();
      await expect(page.getByLabel(t.unitPrice)).toHaveValue("65.50");
      await expect(page.getByLabel(t.status, { exact: true })).toHaveValue(
        "awaiting_payment",
      );
      await expect(page.getByRole("button", { name: t.send })).toBeDisabled();
      await expect(
        page.getByRole("button", { name: t.contact }),
      ).toBeDisabled();
      await page.getByRole("link", { name: t.viewCustomer }).click();
      await expect(page).toHaveURL(/\/admin\/customers\?/);
      await expect(page.getByRole("main")).toContainText(SEEDED.client.email);
      await page.goto(`/${locale}/admin`);
      // Overview intentionally lists only the latest three. Other tests may create
      // newer requests; its all-requests link must still reach this saved record.
      await page.getByRole("link", { name: t.viewAll, exact: true }).click();
      await expect(page).toHaveURL(
        new RegExp(`/${locale}/admin/create-your-stone$`),
      );
      await page.getByRole("searchbox", { name: t.searchLabel }).fill(number);
      await page.getByRole("searchbox", { name: t.searchLabel }).press("Enter");
      const row = page
        .getByRole("region", { name: t.requests, exact: true })
        .getByRole("listitem")
        .filter({ hasText: number });
      await expect(row).toContainText(t.statuses.awaiting_payment);
      await row.getByRole("link").click();
      await expect(
        page.getByRole("heading", {
          name: t.request.replace("{number}", number),
          exact: true,
        }),
      ).toBeVisible();
    } finally {
      await stale.close();
    }
  });
  test(`${locale}: request search has an honest empty state`, async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "auth-desktop",
      "The desktop project exercises search.",
    );
    await signInInContext(context, SEEDED.admin);
    await page.goto(`/${locale}/admin/create-your-stone`);
    const search = page.getByRole("searchbox", { name: t.searchLabel });
    await search.fill("no-such-request%_");
    await search.press("Enter");
    await expect(page.getByText(t.none, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: t.selectRequest }),
    ).toBeVisible();
  });
  for (const width of [1440, 1024, 390])
    test(`${locale}: requests and Overview at ${width}px are accessible and fit`, async ({
      page,
      context,
    }, testInfo) => {
      test.skip(
        (width === 390) !== (testInfo.project.name === "auth-mobile"),
        "The matching viewport project runs this check.",
      );
      await page.setViewportSize({ width, height: 1000 });
      await signInInContext(context, SEEDED.admin);
      for (const route of ["/admin/create-your-stone", "/admin"]) {
        await page.goto(`/${locale}${route}`);
        if (width >= 1024) {
          await expect(
            page.getByRole("heading", {
              name: route.endsWith("stone") ? t.requests : t.title,
              exact: true,
            }),
          ).toBeVisible();
        } else await expect(page.locator("[data-admin-narrow]")).toBeVisible();
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
          path: testInfo.outputPath(
            `${route.endsWith("stone") ? "requests" : "overview"}-${locale}-${width}.png`,
          ),
          fullPage: true,
        });
      }
    });
}
