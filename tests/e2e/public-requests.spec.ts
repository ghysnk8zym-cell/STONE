import AxeBuilder from "@axe-core/playwright";
import { PNG } from "pngjs";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { expect, signInInContext, test } from "./auth-fixtures";
import { ORDERS_CLIENT, SEEDED } from "./test-env";

const sample = {
  name: "synthetic-reference.png",
  mimeType: "image/png",
  buffer: PNG.sync.write({
    width: 32,
    height: 20,
    data: Buffer.alloc(32 * 20 * 4, 170),
  }),
};
for (const locale of ["en", "ru"] as const) {
  const t = { en, ru }[locale].stoneRequest;
  test(`${locale}: private photo request survives reload and appears in admin`, async ({
    page,
    context,
    browser,
    baseURL,
    clientIp,
  }, testInfo) => {
    await page.goto(`/${locale}/create-your-stone`);
    await expect(page.getByRole("link", { name: t.signIn })).toBeVisible();
    await expect(
      page.getByRole("button", { name: t.submit, exact: true }),
    ).toBeDisabled();
    await signInInContext(context, SEEDED.client);
    await page.goto(`/${locale}/create-your-stone`);
    const submit = page.getByRole("button", { name: t.submit, exact: true });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(
      page.getByRole("alert").filter({ hasText: t.errors.invalid }),
    ).toBeFocused();
    await page.locator('input[type="file"]').setInputFiles({
      name: "bad.svg",
      mimeType: "image/svg+xml",
      buffer: Buffer.from('<svg onload="alert(1)"/>'),
    });
    await expect(
      page.getByRole("alert").filter({ hasText: t.errors.photo }),
    ).toBeVisible();
    await page.locator('input[type="file"]').setInputFiles(sample);
    await expect(page.getByText(t.added, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: t.remove, exact: true }).click();
    await expect(page.getByRole("img", { name: t.preview })).toHaveCount(0);
    await page
      .locator('input[type="file"]')
      .setInputFiles({ ...sample, name: "replacement.png" });
    await expect(
      page.getByText("replacement.png", { exact: true }),
    ).toBeVisible();
    await page.getByLabel(t.material, { exact: true }).selectOption("marble");
    for (const [name, value] of Object.entries({
      color: "Grey synthetic",
      texture: "Honed",
      lengthMm: "600",
      widthMm: "400",
      thicknessMm: "20",
      quantity: "4",
      contactName: `Demo ${locale} ${testInfo.project.name}`,
      contactEmail: "reference@example.test",
      contactPhone: "+1 555 010 1234",
    }))
      await page.locator(`[name="${name}"]`).fill(value);
    await page.locator('[name="contactName"]').focus();
    await page.keyboard.press("Tab");
    await expect(page.locator('[name="contactEmail"]')).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.locator('[name="contactPhone"]')).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(submit).toBeFocused();
    if (testInfo.project.name === "auth-desktop") {
      const viewport = page.viewportSize()!;
      await page.emulateMedia({ reducedMotion: "reduce" });
      for (const width of [320, 768, 1024]) {
        await page.setViewportSize({ width, height: 900 });
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        ).toBe(true);
        await expect(submit).toBeEnabled();
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: testInfo.outputPath(`${locale}-form-${width}.png`),
          fullPage: true,
        });
      }
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: "no-preference" });
    }
    const violations = (
      await new AxeBuilder({ page }).analyze()
    ).violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    await testInfo.attach("axe-form", {
      body: JSON.stringify(violations, null, 2),
      contentType: "application/json",
    });
    expect(violations.map((v) => v.id)).toEqual([]);
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      ),
    ).toBeLessThanOrEqual(0);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`${locale}-form.png`),
      fullPage: true,
    });
    // Hold the actual POST to observe pending state and prove controls cannot submit twice.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(`**/${locale}/create-your-stone`, async (route) => {
      if (route.request().method() === "POST") await gate;
      await route.continue();
    });
    await submit.click();
    await expect(page.getByRole("button", { name: t.sending })).toBeDisabled();
    await expect(page.locator('[name="color"]')).toBeDisabled();
    release();
    await expect(page).toHaveURL(/\?request=[0-9a-f-]+$/);
    await expect(
      page.getByRole("heading", { name: t.success, exact: true }),
    ).toBeVisible();
    const id = new URL(page.url()).searchParams.get("request")!;
    const number = (await page.getByRole("main").innerText()).match(
      /Q-\d{9}/,
    )![0];
    await page.reload();
    await expect(page.getByText(`600 ${t.mm}`, { exact: true })).toBeVisible();
    await expect(
      page.getByText(`4 ${t.pieces}`, { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("reference@example.test", { exact: true }),
    ).toBeVisible();
    const photo = await context.request.get(`/api/stone-requests/${id}/photo`);
    expect(photo.status()).toBe(200);
    expect(photo.headers()["cache-control"]).toContain("no-store");
    expect(photo.headers()["content-type"]).toBe("image/png");
    await expect(page.getByRole("img", { name: t.preview })).toBeVisible();
    expect(
      await page
        .getByRole("img", { name: t.preview })
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBe(32);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: testInfo.outputPath(`${locale}-saved.png`),
      fullPage: true,
    });
    const admin = await browser.newContext({
      baseURL,
      viewport: { width: 1440, height: 900 },
      isMobile: false,
      hasTouch: false,
      extraHTTPHeaders: { "x-forwarded-for": clientIp },
    });
    const stranger = await browser.newContext({
      baseURL,
      extraHTTPHeaders: { "x-forwarded-for": clientIp },
    });
    try {
      const guest = await stranger.request.get(
        `/api/stone-requests/${id}/photo`,
        { maxRedirects: 0 },
      );
      expect(guest.status()).toBe(307);
      await signInInContext(stranger, ORDERS_CLIENT);
      expect(
        (
          await stranger.request.get(`/api/stone-requests/${id}/photo`)
        ).status(),
      ).toBe(404);
      expect(
        (
          await stranger.request.get(
            `/${locale}/create-your-stone?request=${id}`,
          )
        ).status(),
      ).toBe(404);
      await signInInContext(admin, SEEDED.admin);
      const editor = await admin.newPage();
      await editor.goto(
        `/${locale}/admin/create-your-stone?q=${number}&request=${id}`,
      );
      await expect(
        editor
          .getByRole("main")
          .getByText("reference@example.test", { exact: true }),
      ).toBeVisible();
      const image = editor.getByRole("img", {
        name: { en, ru }[locale].admin.createYourStone.reference,
      });
      await expect(image).toBeVisible();
      await editor.reload();
      await expect(image).toBeVisible();
      expect(
        await image.evaluate((img: HTMLImageElement) => img.naturalWidth),
      ).toBe(32);
      await editor.screenshot({
        path: testInfo.outputPath(`${locale}-admin.png`),
        fullPage: true,
      });
      expect(
        (await new AxeBuilder({ page: editor }).analyze()).violations
          .filter((v) => v.impact === "serious" || v.impact === "critical")
          .map((v) => v.id),
      ).toEqual([]);
    } finally {
      await admin.close();
      await stranger.close();
    }
  });
}
