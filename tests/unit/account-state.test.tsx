// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ProductCard } from "@/components/cards/ProductCard";
import { AccountStateProvider } from "@/features/account/AccountStateProvider";
import {
  FavoriteHeart,
  FavoriteSaveButton,
} from "@/features/account/FavoriteControls";
import {
  displayNameOf,
  firstNameOf,
  initialsOf,
} from "@/features/account/display";
import type { AccountState } from "@/features/account/results";

import en from "../../messages/en.json";
import { renderWithIntl } from "./render";

// The real next-intl navigation and the Next router cannot run under Vitest: Link and the router are mocked.
const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  pathname: { current: "/ru/catalog" },
  toggle: vi.fn(),
}));
vi.mock("@/i18n/navigation", () => ({
  Link: (props: ComponentProps<"a">) => <a {...props} />,
  usePathname: () => mocks.pathname.current,
  useRouter: () => ({ replace: vi.fn() }),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname.current,
  useRouter: () => ({ push: mocks.push }),
}));
vi.mock("@/server/account/actions", () => ({
  toggleFavorite: (...args: unknown[]) => mocks.toggle(...args),
}));

function answerWith(state: AccountState | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      state === null
        ? new Response("nope", { status: 500 })
        : Response.json(state),
    ),
  );
}

const SIGNED_IN: AccountState = {
  signedIn: true,
  name: "Alex",
  favorites: ["black-marble"],
};

function renderHearts() {
  return renderWithIntl(
    <AccountStateProvider>
      <FavoriteHeart slug="black-marble" label="Heart black" />
      <FavoriteHeart slug="golden-rock" label="Heart golden" />
      <FavoriteSaveButton slug="golden-rock" label="Save" />
    </AccountStateProvider>,
  );
}

const state = () => document.documentElement.dataset.accountState;

beforeEach(() => {
  mocks.push.mockReset();
  mocks.toggle.mockReset();
  mocks.pathname.current = "/ru/catalog";
  window.history.replaceState({}, "", "/en/catalog?material=marble");
  sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete document.documentElement.dataset.accountState;
});

describe("account state provider", () => {
  it("draws the hearts from the favourites of the signed-in visitor", async () => {
    answerWith(SIGNED_IN);
    renderHearts();
    await waitFor(() => expect(state()).toBe("signed-in"));
    expect(
      screen
        .getByRole("button", { name: "Heart black" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Heart golden" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
    // Save follows the same state; its label does not change, the pressed state does.
    expect(
      screen.getByRole("button", { name: "Save" }).getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("asks /api/me without caching", async () => {
    answerWith(SIGNED_IN);
    renderHearts();
    await waitFor(() => expect(state()).toBe("signed-in"));
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock.mock.calls[0]![0]).toBe("/api/me");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ cache: "no-store" });
  });

  it("toggles optimistically, tells the server the wanted state and keeps the answer", async () => {
    answerWith(SIGNED_IN);
    let resolve!: (value: unknown) => void;
    mocks.toggle.mockReturnValue(new Promise((r) => (resolve = r)));
    renderHearts();
    await waitFor(() => expect(state()).toBe("signed-in"));

    const heart = screen.getByRole("button", { name: "Heart golden" });
    fireEvent.click(heart);
    // Optimistic: pressed before the server answered.
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    expect(mocks.toggle).toHaveBeenCalledWith("golden-rock", true);
    resolve({ ok: true, favorited: true });
    await waitFor(() =>
      expect(heart.getAttribute("aria-pressed")).toBe("true"),
    );

    // Removing asks for `false`, not for a flip.
    mocks.toggle.mockResolvedValue({ ok: true, favorited: false });
    fireEvent.click(screen.getByRole("button", { name: "Heart black" }));
    expect(mocks.toggle).toHaveBeenLastCalledWith("black-marble", false);
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Heart black" })
          .getAttribute("aria-pressed"),
      ).toBe("false"),
    );
  });

  it("rolls the heart back when the server refuses or fails", async () => {
    answerWith(SIGNED_IN);
    renderHearts();
    await waitFor(() => expect(state()).toBe("signed-in"));
    const heart = screen.getByRole("button", { name: "Heart golden" });

    mocks.toggle.mockResolvedValueOnce({ ok: false, code: "not-found" });
    fireEvent.click(heart);
    expect(heart.getAttribute("aria-pressed")).toBe("true");
    await waitFor(() =>
      expect(heart.getAttribute("aria-pressed")).toBe("false"),
    );

    mocks.toggle.mockRejectedValueOnce(new Error("network"));
    fireEvent.click(heart);
    await waitFor(() =>
      expect(heart.getAttribute("aria-pressed")).toBe("false"),
    );
    expect(mocks.toggle).toHaveBeenCalledTimes(2);
  });

  it("sends a Guest to sign-in with the page and its query as next, and does not call the server", async () => {
    answerWith({ signedIn: false, name: null, favorites: [] });
    renderHearts();
    await waitFor(() => expect(state()).toBe("guest"));
    fireEvent.click(screen.getByRole("button", { name: "Heart golden" }));
    expect(mocks.push).toHaveBeenCalledWith(
      "/en/sign-in?next=%2Fen%2Fcatalog%3Fmaterial%3Dmarble",
    );
    expect(mocks.toggle).not.toHaveBeenCalled();
    expect(
      JSON.parse(sessionStorage.getItem("stone.pending-favorite")!),
    ).toMatchObject({
      slug: "golden-rock",
    });
  });

  /** A fetch whose answer the test releases by hand. */
  function slowAnswer() {
    let release!: (state: AccountState) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            release = (value) => resolve(Response.json(value));
          }),
      ),
    );
    return (value: AccountState) => release(value);
  }

  it("queues a click made before the state is known and applies it for a signed-in visitor", async () => {
    const release = slowAnswer();
    mocks.toggle.mockResolvedValue({ ok: true, favorited: true });
    renderHearts();
    expect(state()).toBe("loading");
    fireEvent.click(screen.getByRole("button", { name: "Heart golden" }));
    // Nothing happens yet: not a guess, not a loss.
    expect(mocks.push).not.toHaveBeenCalled();
    expect(mocks.toggle).not.toHaveBeenCalled();

    release(SIGNED_IN);
    await waitFor(() =>
      expect(mocks.toggle).toHaveBeenCalledWith("golden-rock", true),
    );
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Heart golden" })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("sends a Guest who clicked before the state was known to sign-in", async () => {
    const release = slowAnswer();
    renderHearts();
    fireEvent.click(screen.getByRole("button", { name: "Heart golden" }));
    release({ signedIn: false, name: null, favorites: [] });
    await waitFor(() => expect(mocks.push).toHaveBeenCalledTimes(1));
    expect(mocks.push.mock.calls[0]![0]).toContain("/en/sign-in?next=");
    expect(mocks.toggle).not.toHaveBeenCalled();
  });

  it("an early click on a product that turns out to be saved already changes nothing", async () => {
    const release = slowAnswer();
    renderHearts();
    const heart = screen.getByRole("button", { name: "Heart black" });
    fireEvent.click(heart); // while loading the heart reads unsaved, so the click means "save"
    fireEvent.click(heart);
    release(SIGNED_IN); // black-marble is already a favourite: nothing to send
    await waitFor(() => expect(state()).toBe("signed-in"));
    expect(mocks.toggle).not.toHaveBeenCalled();
  });

  describe("when the state is read", () => {
    const calls = () => vi.mocked(fetch).mock.calls.length;
    // A re-render of the same provider (what a navigation does) needs the same Intl wrapper.
    const tree = () => (
      <NextIntlClientProvider locale="en" messages={en}>
        <AccountStateProvider>
          <FavoriteHeart slug="black-marble" label="Heart black" />
        </AccountStateProvider>
      </NextIntlClientProvider>
    );

    it("not again on a plain navigation", async () => {
      answerWith(SIGNED_IN);
      const view = renderHearts();
      await waitFor(() => expect(state()).toBe("signed-in"));
      expect(calls()).toBe(1);

      mocks.pathname.current = "/en/catalog/black-marble";
      view.rerender(tree());
      mocks.pathname.current = "/en/account";
      view.rerender(tree());
      expect(calls()).toBe(1);
      expect(state()).toBe("signed-in");
    });

    it("again when the sign-out confirmation is left", async () => {
      answerWith(SIGNED_IN);
      mocks.pathname.current = "/en/sign-out";
      const view = renderHearts();
      await waitFor(() => expect(state()).toBe("signed-in"));
      expect(calls()).toBe(1);

      answerWith({ signedIn: false, name: null, favorites: [] });
      mocks.pathname.current = "/en";
      view.rerender(tree());
      await waitFor(() => expect(state()).toBe("guest"));
    });

    it("clears the cart once the server confirms the sign-out (shared devices), not on Stay signed in", async () => {
      const line = JSON.stringify([
        { slug: "black-marble", areaHundredths: 220 },
      ]);
      localStorage.setItem("stone.cart.v1", line);
      answerWith(SIGNED_IN);
      mocks.pathname.current = "/en/sign-out";
      const view = renderHearts();
      await waitFor(() => expect(state()).toBe("signed-in"));
      // Stay signed in: still signed in, the cart stays
      mocks.pathname.current = "/en/account";
      view.rerender(tree());
      await waitFor(() => expect(calls()).toBe(2));
      await waitFor(() => expect(state()).toBe("signed-in"));
      expect(localStorage.getItem("stone.cart.v1")).toBe(line);
      // Sign out confirmed
      mocks.pathname.current = "/en/sign-out";
      view.rerender(tree());
      answerWith({ signedIn: false, name: null, favorites: [] });
      mocks.pathname.current = "/en";
      view.rerender(tree());
      await waitFor(() => expect(state()).toBe("guest"));
      expect(JSON.parse(localStorage.getItem("stone.cart.v1") ?? "[]")).toEqual(
        [],
      );
    });

    it("again when the tab becomes visible", async () => {
      answerWith(SIGNED_IN);
      renderHearts();
      await waitFor(() => expect(state()).toBe("signed-in"));
      Object.defineProperty(document, "visibilityState", {
        value: "visible",
        configurable: true,
      });
      answerWith({ signedIn: false, name: null, favorites: [] });
      document.dispatchEvent(new Event("visibilitychange"));
      await waitFor(() => expect(state()).toBe("guest"));
    });
  });

  it("adds the product a Guest clicked once they are signed in again, only once", async () => {
    sessionStorage.setItem(
      "stone.pending-favorite",
      JSON.stringify({ slug: "golden-rock", at: Date.now() }),
    );
    answerWith(SIGNED_IN);
    mocks.toggle.mockResolvedValue({ ok: true, favorited: true });
    renderHearts();
    await waitFor(() =>
      expect(mocks.toggle).toHaveBeenCalledWith("golden-rock", true),
    );
    expect(sessionStorage.getItem("stone.pending-favorite")).toBeNull();
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "Heart golden" })
          .getAttribute("aria-pressed"),
      ).toBe("true"),
    );
    expect(mocks.toggle).toHaveBeenCalledTimes(1);
  });

  it("drops a stale pending favourite", async () => {
    sessionStorage.setItem(
      "stone.pending-favorite",
      JSON.stringify({ slug: "golden-rock", at: Date.now() - 31 * 60 * 1000 }),
    );
    answerWith(SIGNED_IN);
    renderHearts();
    await waitFor(() => expect(state()).toBe("signed-in"));
    expect(mocks.toggle).not.toHaveBeenCalled();
  });

  it("treats an unreadable answer as a Guest instead of breaking the page", async () => {
    answerWith(null);
    renderHearts();
    await waitFor(() => expect(state()).toBe("guest"));
  });

  it("the ProductCard heart is live when it gets a slug and inert otherwise", async () => {
    answerWith(SIGNED_IN);
    renderWithIntl(
      <AccountStateProvider>
        <ProductCard
          href="/catalog/black-marble"
          name="Black Marble"
          meta="Marble"
          price={{ amount: 240, currency: "USD", isPlaceholder: true }}
          favoriteSlug="black-marble"
        />
        <ProductCard
          href="/catalog/x"
          name="Other"
          meta="Marble"
          price={{ amount: 1, currency: "USD", isPlaceholder: true }}
          favoriteInert
        />
      </AccountStateProvider>,
    );
    await waitFor(() => expect(state()).toBe("signed-in"));
    const live = screen.getByRole("button", {
      name: "Save Black Marble to favorites",
    });
    expect(live.getAttribute("aria-pressed")).toBe("true");
    const inert = screen.getByRole("button", {
      name: "Save Other to favorites",
    });
    expect(inert.getAttribute("aria-disabled")).toBe("true");
  });
});

describe("account display helpers", () => {
  it("falls back to the local part of the email when no name is set", () => {
    expect(displayNameOf({ name: "", email: "alex.morgan@example.test" })).toBe(
      "alex.morgan",
    );
    expect(displayNameOf({ name: "  ", email: "a@b.test" })).toBe("a");
    expect(displayNameOf({ name: "Alex Morgan", email: "a@b.test" })).toBe(
      "Alex Morgan",
    );
  });

  it("takes the first word for the greeting and two letters for the avatar", () => {
    const alex = { name: "Alex Morgan", email: "a@b.test" };
    expect(firstNameOf(alex)).toBe("Alex");
    expect(initialsOf(alex)).toBe("AM");
    expect(initialsOf({ name: "Ёлка", email: "a@b.test" })).toBe("Ё");
    expect(initialsOf({ name: "", email: "e2e-client@b.test" })).toBe("EC");
    expect(initialsOf({ name: "", email: "@b.test" })).toBe("?");
  });
});
