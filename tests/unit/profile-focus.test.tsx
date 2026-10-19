// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProfileDetails } from "@/components/account/ProfileForms";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";

const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/server/account/actions", () => ({
  updateProfileName: (...args: unknown[]) => mocks.save(...args),
  changePassword: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("profile editing keyboard continuity", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["ru", ru],
  ] as const) {
    const t = messages.account.profile;
    it(`${locale}: focuses Name on edit and returns to Edit on cancel`, () => {
      renderWithIntl(
        <ProfileDetails name="Local client" email="local@example.test" />,
        locale,
      );
      const edit = screen.getByRole("button", { name: t.edit });
      edit.focus();
      fireEvent.click(edit);
      expect(document.activeElement).toBe(screen.getByLabelText(t.name));
      fireEvent.click(screen.getByRole("button", { name: t.cancel }));
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: t.edit }),
      );
    });
    it(`${locale}: returns focus after confirmed save and retains feedback`, async () => {
      mocks.save.mockResolvedValue({ ok: true, name: "Updated client" });
      renderWithIntl(
        <ProfileDetails name="Local client" email="local@example.test" />,
        locale,
      );
      fireEvent.click(screen.getByRole("button", { name: t.edit }));
      fireEvent.change(screen.getByLabelText(t.name), {
        target: { value: "Updated client" },
      });
      fireEvent.click(screen.getByRole("button", { name: t.save }));
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("button", { name: t.edit }),
        ),
      );
      expect(screen.getByRole("status").textContent).toBe(t.saved);
    });
  }
});
