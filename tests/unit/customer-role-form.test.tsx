// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CustomerRoleForm } from "@/components/admin/CustomerRoleForm";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";

const mocks = vi.hoisted(() => ({ save: vi.fn(), refresh: vi.fn() }));
vi.mock("@/server/admin/customer-actions", () => ({
  setCustomerRole: (...args: unknown[]) => mocks.save(...args),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("customer role feedback", () => {
  it("keeps feedback when the server refreshes the stored role and follows later server role changes", async () => {
    mocks.save.mockResolvedValue({ ok: true, role: "admin" });
    const view = renderWithIntl(
      <CustomerRoleForm id="customer" role="client" />,
    );
    fireEvent.change(screen.getByLabelText(en.admin.customers.role), {
      target: { value: "admin" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: en.admin.customers.updateRole }),
    );
    await screen.findByRole("status");
    for (const role of ["admin", "client"] as const) {
      view.rerender(
        <NextIntlClientProvider locale="en" messages={en}>
          <CustomerRoleForm id="customer" role={role} />
        </NextIntlClientProvider>,
      );
      expect(
        (screen.getByLabelText(en.admin.customers.role) as HTMLSelectElement)
          .value,
      ).toBe(role);
      expect(screen.getByRole("status").textContent).toBe(
        en.admin.customers.saved,
      );
    }
  });
  for (const [locale, messages] of [
    ["en", en],
    ["ru", ru],
  ] as const) {
    const t = messages.admin.customers;
    it(`${locale}: saves the explicit role and refreshes only on success`, async () => {
      mocks.save.mockResolvedValue({ ok: true, role: "admin" });
      renderWithIntl(<CustomerRoleForm id="customer" role="client" />, locale);
      const button = screen.getByRole("button", {
        name: t.updateRole,
      }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      fireEvent.change(screen.getByLabelText(t.role), {
        target: { value: "admin" },
      });
      fireEvent.click(button);
      expect((await screen.findByRole("status")).textContent).toBe(t.saved);
      expect(mocks.save).toHaveBeenCalledWith("customer", "admin");
      expect(mocks.refresh).toHaveBeenCalledOnce();
    });
    for (const failure of ["throw", "self"] as const) {
      it(`${locale}: ${failure} preserves the chosen role and shows localized feedback`, async () => {
        if (failure === "throw")
          mocks.save.mockRejectedValue(
            new Error("database detail must not reach UI"),
          );
        else mocks.save.mockResolvedValue({ ok: false, code: "self" });
        renderWithIntl(
          <CustomerRoleForm id="customer" role="client" />,
          locale,
        );
        const select = screen.getByLabelText(t.role) as HTMLSelectElement;
        fireEvent.change(select, { target: { value: "admin" } });
        fireEvent.click(screen.getByRole("button", { name: t.updateRole }));
        expect((await screen.findByRole("alert")).textContent).toBe(
          t.errors[failure === "throw" ? "generic" : "self"],
        );
        expect(select.value).toBe("admin");
        expect(mocks.refresh).not.toHaveBeenCalled();
        await waitFor(() =>
          expect(select.disabled || select.closest("fieldset")?.disabled).toBe(
            false,
          ),
        );
      });
    }
  }
});
