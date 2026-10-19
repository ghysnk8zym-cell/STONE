// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { StoneRequestEditor } from "@/components/admin/StoneRequestEditor";
import type { AdminStoneRequest } from "@/server/admin/stone-request-queries";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";
const mocks = vi.hoisted(() => ({
  quote: vi.fn(),
  status: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/server/admin/stone-request-actions", () => ({
  saveStoneRequestQuote: (...args: unknown[]) => mocks.quote(...args),
  setStoneRequestStatus: (...args: unknown[]) => mocks.status(...args),
}));
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
  Link: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));
vi.mock("@/components/account/parts", () => ({ ProductImage: () => null }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
const request: AdminStoneRequest = {
  id: "00000000-0000-4000-8000-000000000001",
  number: "Q-1048",
  name: "Grey Marble",
  customer: { id: "client", name: "Client", email: "client@example.test" },
  material: "marble",
  color: "grey",
  finish: "honed",
  lengthMm: 600,
  widthMm: 400,
  thicknessMm: 20,
  quantity: 12,
  referenceImage: "images/catalog/grey-marble",
  hasPhoto: false,
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  quoteUnitPriceCents: null,
  status: "new",
  revision: 0,
  createdAt: "2026-10-10T12:00:00Z",
};
describe("Request editor preserves an honest draft", () => {
  for (const [locale, messages] of [
    ["en", en],
    ["ru", ru],
  ] as const) {
    const t = messages.admin.createYourStone;
    const render = () =>
      renderWithIntl(<StoneRequestEditor request={request} />, locale);
    it(`${locale}: conflict and unconfirmed exception retain the typed quote and initial revision`, async () => {
      mocks.quote
        .mockResolvedValueOnce({ ok: false, code: "conflict" })
        .mockRejectedValueOnce(new Error("private data"));
      render();
      const price = screen.getByLabelText(t.unitPrice) as HTMLInputElement;
      fireEvent.change(price, { target: { value: "65.50" } });
      for (const message of [t.errors.conflict, t.errors.generic]) {
        // The result message can commit before React finishes the transition.
        // Wait for the resting label and the enclosing fieldset to be enabled.
        const button = await screen.findByRole("button", { name: t.saveDraft });
        await waitFor(() => expect(button.matches(":disabled")).toBe(false));
        fireEvent.click(button);
        await waitFor(() =>
          expect(screen.getByRole("alert").textContent).toBe(message),
        );
        expect(price.value).toBe("65.50");
      }
      expect(mocks.quote).toHaveBeenLastCalledWith({
        id: request.id,
        revision: 0,
        quoteUnitPriceCents: 6550,
      });
      expect(mocks.refresh).not.toHaveBeenCalled();
    });
    it(`${locale}: successful quote and status saves share the advanced revision; zero is a valid quote`, async () => {
      mocks.quote.mockResolvedValue({
        ok: true,
        snapshot: {
          revision: 1,
          status: "draft_quote",
          quoteUnitPriceCents: 0,
        },
      });
      mocks.status.mockResolvedValue({
        ok: true,
        snapshot: {
          revision: 2,
          status: "awaiting_payment",
          quoteUnitPriceCents: 0,
        },
      });
      render();
      fireEvent.change(screen.getByLabelText(t.unitPrice), {
        target: { value: "0" },
      });
      fireEvent.click(screen.getByRole("button", { name: t.saveDraft }));
      await screen.findByText(t.saved);
      expect(mocks.quote).toHaveBeenCalledWith({
        id: request.id,
        revision: 0,
        quoteUnitPriceCents: 0,
      });
      await waitFor(() =>
        expect(screen.getByLabelText(t.status).matches(":disabled")).toBe(
          false,
        ),
      );
      fireEvent.change(screen.getByLabelText(t.status), {
        target: { value: "awaiting_payment" },
      });
      fireEvent.click(screen.getByRole("button", { name: t.saveStatus }));
      await screen.findByText(t.statusSaved);
      expect(mocks.status).toHaveBeenCalledWith({
        id: request.id,
        revision: 1,
        status: "awaiting_payment",
      });
      await waitFor(() =>
        expect(screen.getByLabelText(t.unitPrice).matches(":disabled")).toBe(
          false,
        ),
      );
      fireEvent.change(screen.getByLabelText(t.unitPrice), {
        target: { value: "20" },
      });
      fireEvent.click(screen.getByRole("button", { name: t.saveDraft }));
      await waitFor(() =>
        expect(mocks.quote).toHaveBeenLastCalledWith({
          id: request.id,
          revision: 2,
          quoteUnitPriceCents: 2000,
        }),
      );
    });
    it(`${locale}: refreshed props cannot silently rebase an unsaved price`, async () => {
      mocks.quote.mockResolvedValue({ ok: false, code: "conflict" });
      const rendered = render();
      fireEvent.change(screen.getByLabelText(t.unitPrice), {
        target: { value: "42" },
      });
      rendered.rerender(
        <NextIntlClientProvider locale={locale} messages={messages}>
          <StoneRequestEditor
            request={{
              ...request,
              revision: 9,
              quoteUnitPriceCents: 9000,
              status: "awaiting_payment",
            }}
          />
        </NextIntlClientProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: t.saveDraft }));
      await screen.findByText(t.errors.conflict);
      expect(mocks.quote).toHaveBeenCalledWith({
        id: request.id,
        revision: 0,
        quoteUnitPriceCents: 4200,
      });
      expect(
        (screen.getByLabelText(t.unitPrice) as HTMLInputElement).value,
      ).toBe("42");
    });
    it(`${locale}: rejects bad decimals/overflow and keeps unsupported controls disabled`, async () => {
      render();
      for (const value of ["1.001", "100000.01", "-1"]) {
        fireEvent.change(screen.getByLabelText(t.unitPrice), {
          target: { value },
        });
        fireEvent.click(screen.getByRole("button", { name: t.saveDraft }));
        await screen.findByText(t.errors.price);
      }
      expect(mocks.quote).not.toHaveBeenCalled();
      expect(
        (screen.getByRole("button", { name: t.send }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      expect(
        (screen.getByRole("button", { name: t.contact }) as HTMLButtonElement)
          .disabled,
      ).toBe(true);
      expect(screen.queryByText("private data")).toBeNull();
      expect(screen.getByText(t.deliveryUnavailable)).toBeTruthy();
    });
    it(`${locale}: locks both forms while a write is pending and does not discard a typed price on status save`, async () => {
      let resolve!: (result: unknown) => void;
      mocks.status.mockImplementation(
        () =>
          new Promise((done) => {
            resolve = done;
          }),
      );
      render();
      fireEvent.change(screen.getByLabelText(t.unitPrice), {
        target: { value: "99" },
      });
      fireEvent.click(screen.getByRole("button", { name: t.saveStatus }));
      await waitFor(() =>
        expect(
          (
            screen
              .getByLabelText(t.unitPrice)
              .closest("fieldset") as HTMLFieldSetElement
          ).disabled,
        ).toBe(true),
      );
      expect(
        (
          screen
            .getByLabelText(t.status)
            .closest("fieldset") as HTMLFieldSetElement
        ).disabled,
      ).toBe(true);
      resolve({
        ok: true,
        snapshot: { revision: 1, status: "new", quoteUnitPriceCents: null },
      });
      await screen.findByText(t.statusSaved);
      expect(
        (screen.getByLabelText(t.unitPrice) as HTMLInputElement).value,
      ).toBe("99");
    });
  }
});
