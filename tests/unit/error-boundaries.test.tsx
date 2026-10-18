// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { renderWithIntl } from "./render";

/*
 * Final review I1: a failure while a request runs (a database timeout, a 5xx) must end in a localised page with a
 * retry, not Next's raw "Application error". One boundary for the public site (inside its shell) and one for the admin.
 */
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ push: vi.fn() }),
}));

afterEach(cleanup);

const boundaries = [
  ["the site", () => import("@/app/[locale]/(site)/error")],
  ["the admin", () => import("@/app/[locale]/admin/error")],
] as const;

describe("localised error boundaries", () => {
  for (const [name, load] of boundaries) {
    for (const [locale, messages] of [
      ["en", en],
      ["ru", ru],
    ] as const) {
      it(`${name} (${locale}): shows the message and Try again calls reset`, async () => {
        const { default: ErrorBoundary } = await load();
        const reset = vi.fn();
        const error = Object.assign(new Error("secret db detail"), {
          digest: "abc",
        });
        renderWithIntl(<ErrorBoundary error={error} reset={reset} />, locale);
        const t = messages.pages.error;
        expect(
          screen.getByRole("heading", { level: 1, name: t.title }),
        ).toBeTruthy();
        expect(screen.getByText(t.body)).toBeTruthy();
        // the error's own message is never shown to the visitor
        expect(screen.queryByText(/secret db detail/)).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: t.retry }));
        expect(reset).toHaveBeenCalledTimes(1);
      });
    }
  }
});
