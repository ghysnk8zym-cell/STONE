// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { HomeContentEditor } from "@/components/admin/HomeContentEditor";
import { HOME_TEXT_KEYS, type HomeText } from "@/features/content/home-fields";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";

const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("@/server/admin/content-actions", () => ({
  saveHomeText: (...args: unknown[]) => mocks.save(...args),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));
vi.mock("next/image", () => ({ default: () => null }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const defaults = Object.fromEntries(
  HOME_TEXT_KEYS.map((key) => [key, "Default"]),
) as HomeText["values"];
const data = {
  values: defaults,
  defaults,
  stored: Object.fromEntries(
    HOME_TEXT_KEYS.map((key) => [key, null]),
  ) as HomeText["stored"],
};

describe("Home content editor", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["ru", ru],
  ] as const) {
    const t = messages.admin.siteContent;
    it(`${locale}: locks the English brand slogan`, () => {
      renderWithIntl(
        <HomeContentEditor
          data={{ en: data, ru: data }}
          initialLocale={locale}
        />,
        locale,
      );
      fireEvent.change(screen.getByLabelText(t.field), {
        target: { value: "hero.line1" },
      });
      expect(
        (screen.getByLabelText(t.fields.line1) as HTMLInputElement).disabled,
      ).toBe(true);
      expect(
        (screen.getByRole("button", { name: t.save }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      expect(screen.getByText(t.brandLocked)).toBeTruthy();
      expect(mocks.save).not.toHaveBeenCalled();
    });
    it(`${locale}: retains two field drafts and their original baseline across sections and refreshed props`, async () => {
      mocks.save.mockResolvedValue({ ok: false, code: "conflict" });
      const view = renderWithIntl(
        <HomeContentEditor
          data={{ en: data, ru: data }}
          initialLocale={locale}
        />,
        locale,
      );
      fireEvent.change(screen.getByLabelText(t.fields.searchButton), {
        target: { value: "Draft one" },
      });
      fireEvent.change(screen.getByLabelText(t.field), {
        target: { value: "hero.searchLabel" },
      });
      fireEvent.change(screen.getByLabelText(t.fields.searchLabel), {
        target: { value: "Draft two" },
      });
      fireEvent.click(screen.getByRole("button", { name: t.sections.catalog }));
      fireEvent.click(screen.getByRole("button", { name: t.sections.hero }));
      expect(
        (screen.getByLabelText(t.fields.searchButton) as HTMLInputElement)
          .value,
      ).toBe("Draft one");
      const newer = {
        ...data,
        values: { ...data.values, "hero.searchPlaceholder": "Server edit" },
        stored: { ...data.stored, "hero.searchPlaceholder": "Server edit" },
      };
      view.rerender(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <HomeContentEditor
            data={{ en: newer, ru: newer }}
            initialLocale={locale}
          />
        </NextIntlClientProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: t.save }));
      await waitFor(() =>
        expect(mocks.save).toHaveBeenCalledWith(
          locale,
          "hero.searchPlaceholder",
          "Draft one",
          null,
        ),
      );
      await screen.findByRole("alert");
      await waitFor(() =>
        expect(
          screen.getByLabelText(t.field).closest("fieldset")?.disabled,
        ).toBe(false),
      );
      fireEvent.change(screen.getByLabelText(t.field), {
        target: { value: "hero.searchLabel" },
      });
      expect(
        (screen.getByLabelText(t.fields.searchLabel) as HTMLInputElement).value,
      ).toBe("Draft two");
    });
    it(`${locale}: preserves input and expected value on conflict or an exception`, async () => {
      mocks.save
        .mockResolvedValueOnce({ ok: false, code: "conflict" })
        .mockRejectedValueOnce(new Error("private DB detail"));
      renderWithIntl(
        <HomeContentEditor
          data={{ en: data, ru: data }}
          initialLocale={locale}
        />,
        locale,
      );
      const input = screen.getByLabelText(
        t.fields.searchButton,
      ) as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Typed value" } });
      for (const error of [t.errors.conflict, t.errors.generic]) {
        const button = screen.getByRole("button", { name: t.save });
        await waitFor(() =>
          expect(button.closest("fieldset")?.disabled).toBe(false),
        );
        fireEvent.click(button);
        await waitFor(() =>
          expect(screen.getByRole("alert").textContent).toBe(error),
        );
        expect(input.value).toBe("Typed value");
      }
      expect(mocks.save).toHaveBeenLastCalledWith(
        locale,
        "hero.searchPlaceholder",
        "Typed value",
        null,
      );
      expect(mocks.refresh).not.toHaveBeenCalled();
    });
    it(`${locale}: remembers unsaved inputs across fields/languages and advances the baseline only on success`, async () => {
      mocks.save.mockResolvedValue({ ok: true, text: "Saved" });
      renderWithIntl(
        <HomeContentEditor
          data={{ en: data, ru: data }}
          initialLocale={locale}
        />,
        locale,
      );
      fireEvent.change(screen.getByLabelText(t.fields.searchButton), {
        target: { value: "Saved" },
      });
      fireEvent.change(screen.getByLabelText(t.language), {
        target: { value: locale === "en" ? "ru" : "en" },
      });
      expect(
        (screen.getByLabelText(t.fields.searchButton) as HTMLInputElement)
          .value,
      ).toBe("Default");
      fireEvent.change(screen.getByLabelText(t.language), {
        target: { value: locale },
      });
      expect(
        (screen.getByLabelText(t.fields.searchButton) as HTMLInputElement)
          .value,
      ).toBe("Saved");
      fireEvent.click(screen.getByRole("button", { name: t.save }));
      expect((await screen.findByRole("status")).textContent).toBe(t.saved);
      const restore = screen.getByRole("button", { name: t.restore });
      await waitFor(() =>
        expect(restore.closest("fieldset")?.disabled).toBe(false),
      );
      mocks.save.mockResolvedValue({ ok: true, text: null });
      fireEvent.click(restore);
      await waitFor(() =>
        expect(mocks.save).toHaveBeenLastCalledWith(
          locale,
          "hero.searchPlaceholder",
          null,
          "Saved",
        ),
      );
      await waitFor(() =>
        expect(
          (screen.getByLabelText(t.fields.searchButton) as HTMLInputElement)
            .value,
        ).toBe("Default"),
      );
    });
  }
});
