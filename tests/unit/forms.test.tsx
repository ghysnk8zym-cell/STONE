// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Badge } from "@/components/forms/Badge";
import { SearchField } from "@/components/forms/SearchField";
import { Select } from "@/components/forms/Select";
import { TextField } from "@/components/forms/TextField";

import en from "../../messages/en.json";

import { renderWithIntl } from "./render";

afterEach(cleanup);

describe("TextField", () => {
  it("links label and input", () => {
    renderWithIntl(<TextField label="Email" name="email" type="email" />);
    const input = screen.getByLabelText("Email");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveProperty("type", "email");
    expect(input).toHaveProperty("name", "email");
  });

  it("gives every field its own id, so two fields never share a label", () => {
    renderWithIntl(
      <>
        <TextField label="First" name="a" />
        <TextField label="Second" name="b" />
      </>,
    );
    expect(screen.getByLabelText("First").id).not.toBe(
      screen.getByLabelText("Second").id,
    );
  });

  it("without an error there is no aria-invalid and no description", () => {
    renderWithIntl(<TextField label="Email" name="email" />);
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBeNull();
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("error sets aria-invalid and describedby", () => {
    renderWithIntl(
      <TextField label="Email" name="email" error="Enter a valid email" />,
    );
    const input = screen.getByLabelText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    const target = document.getElementById(describedBy!);
    expect(target).not.toBeNull();
    expect(target!.textContent).toBe("Enter a valid email");
    expect(target!.getAttribute("role")).toBe("alert");
  });

  // cn() is not twMerge: two border-colour classes on one element are resolved by CSS order, so the
  // error state must select ONE border colour (and keep it on hover / focus), not add to the base one.
  it.each([
    {
      tone: "dark" as const,
      error: "#f0a8a0",
      base: [
        "border-[rgba(255,255,255,0.4)]",
        "hov:border-[rgba(255,255,255,0.6)]",
      ],
      focus: [
        "focusv:border-[rgba(255,255,255,0.9)]",
        "focusv:outline-[rgba(255,255,255,0.9)]",
      ],
    },
    {
      tone: "light" as const,
      error: "#a3362d",
      base: ["border-stone-catalog-line", "hov:border-stone-catalog-secondary"],
      focus: ["focusv:border-ink-primary", "focusv:outline-ink-primary"],
    },
  ])(
    "$tone error state uses one red border colour and keeps it on hover and focus",
    ({ tone, error, base, focus }) => {
      const classesOf = (message?: string) => {
        const { unmount } = renderWithIntl(
          <TextField label="Email" name="email" tone={tone} error={message} />,
        );
        const box = screen.getByLabelText("Email").parentElement!;
        const list = box.className.split(/\s+/);
        unmount();
        return list;
      };
      const ok = classesOf();
      const bad = classesOf("Enter a valid email");

      // Sanity: the normal state has the base / hover / focus colours and no error colour.
      for (const cls of [...base, ...focus]) expect(ok).toContain(cls);
      expect(ok.some((cls) => cls.includes(error))).toBe(false);

      // Error state: error border + error hover + error focus border and ring.
      expect(bad).toContain(`border-[${error}]`);
      expect(bad).toContain(`hov:border-[${error}]`);
      expect(bad).toContain(`focusv:border-[${error}]`);
      expect(bad).toContain(`focusv:outline-[${error}]`);
      expect(bad).toContain(`has-[input:focus-visible]:border-[${error}]`);
      expect(bad).toContain(`has-[input:focus-visible]:outline-[${error}]`);

      // ...and none of the base / hover / focus colours, which would compete with it.
      for (const cls of [...base, ...focus]) expect(bad).not.toContain(cls);
      const borderColours = bad.filter((cls) => /^border-(?!l|1)/.test(cls));
      expect(borderColours).toEqual([`border-[${error}]`]);
    },
  );

  it("the unit joins the description and the error stays first", () => {
    renderWithIntl(
      <TextField
        label="Surface area"
        name="area"
        tone="light"
        unit="m²"
        error="Too small"
      />,
    );
    const input = screen.getByLabelText("Surface area");
    const ids = input.getAttribute("aria-describedby")!.split(" ");
    expect(ids).toHaveLength(2);
    expect(document.getElementById(ids[0])!.textContent).toBe("Too small");
    expect(document.getElementById(ids[1])!.textContent).toBe("m²");
  });

  it("passes value, placeholder, required and autocomplete to the input", () => {
    renderWithIntl(
      <TextField
        label="Email"
        name="email"
        defaultValue="a@b.co"
        placeholder="you@example.com"
        required
        autoComplete="email"
      />,
    );
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.value).toBe("a@b.co");
    expect(input.placeholder).toBe("you@example.com");
    expect(input.required).toBe(true);
    expect(input.autocomplete).toBe("email");
  });

  it("disabled disables the input", () => {
    renderWithIntl(<TextField label="Email" name="email" disabled />);
    expect(screen.getByLabelText("Email")).toHaveProperty("disabled", true);
  });

  it("state focus freezes the focus look through data-state", () => {
    const { container } = renderWithIntl(
      <TextField label="Email" name="email" state="focus" />,
    );
    expect(container.querySelector("[data-state='focus']")).not.toBeNull();
  });

  it("renders both tones", () => {
    for (const tone of ["dark", "light"] as const) {
      const { unmount } = renderWithIntl(
        <TextField label={tone} name={tone} tone={tone} />,
      );
      expect(screen.getByLabelText(tone)).toBeTruthy();
      unmount();
    }
  });

  it("renders a trailing control inside the field box, after the input, outside the label", () => {
    renderWithIntl(
      <TextField
        label="Password"
        name="password"
        type="password"
        trailing={<button type="button">Show</button>}
      />,
    );
    const input = screen.getByLabelText("Password");
    const button = screen.getByRole("button", { name: "Show" });
    expect(input.parentElement).toBe(button.closest("div"));
    expect(
      input.compareDocumentPosition(button) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // The input keeps its own right padding class apart from the default one.
    expect(input.className).toContain("pr-3");
    expect(input.className).not.toContain("pr-6");
  });

  it("the screen scale (sign-in / sign-up) is 52 px high below lg and uses the screen label", () => {
    const { container } = renderWithIntl(
      <TextField label="Email" name="email" scale="screen" />,
    );
    const box = container.querySelector("input")!.parentElement!;
    expect(box.className).toContain("h-13");
    expect(box.className).toContain("lg:h-15");
    expect(screen.getByText("Email").className).toContain("text-ink-on-dark");
    // The default scale is unchanged: 60 px, the Phase 2 label.
    const plain = renderWithIntl(<TextField label="Plain" name="plain" />);
    expect(
      plain.container.querySelector("input")!.parentElement!.className,
    ).toContain("h-15");
    expect(screen.getByText("Plain").className).toContain("text-label");
  });
});

describe("SearchField", () => {
  it("has searchbox role", () => {
    renderWithIntl(<SearchField name="q" placeholder="Search materials" />);
    const field = screen.getByRole("searchbox");
    expect(field).toHaveProperty("name", "q");
    expect(field.getAttribute("placeholder")).toBe("Search materials");
  });

  it("is named by its placeholder unless a label is given", () => {
    const { unmount } = renderWithIntl(
      <SearchField name="q" placeholder="Search materials" />,
    );
    expect(
      screen.getByRole("searchbox", { name: "Search materials" }),
    ).toBeTruthy();
    unmount();
    renderWithIntl(
      <SearchField name="q" placeholder="Search…" label="Search the catalog" />,
    );
    expect(
      screen.getByRole("searchbox", { name: "Search the catalog" }),
    ).toBeTruthy();
  });

  it("renders a decorative search icon", () => {
    const { container } = renderWithIntl(
      <SearchField name="q" placeholder="Search" />,
    );
    const icon = container.querySelector("span[aria-hidden='true']");
    expect(icon?.getAttribute("style")).toContain("/icons/search.svg");
  });

  it("renders the graphite tone and can be disabled", () => {
    renderWithIntl(
      <SearchField name="q" placeholder="Search" tone="graphite" disabled />,
    );
    expect(screen.getByRole("searchbox")).toHaveProperty("disabled", true);
  });

  it("uses the localised placeholder passed by the page", () => {
    renderWithIntl(
      <SearchField name="q" placeholder="Поиск материалов" />,
      "ru",
    );
    expect(screen.getByRole("searchbox").getAttribute("placeholder")).toBe(
      "Поиск материалов",
    );
  });
});

describe("Badge", () => {
  it("renders its content", () => {
    renderWithIntl(<Badge>−15%</Badge>);
    expect(screen.getByText("−15%")).toBeTruthy();
  });
});

const MATERIALS = [
  { value: "all", label: "All materials" },
  { value: "concrete", label: "Concrete" },
  { value: "limestone", label: "Limestone" },
  { value: "marble", label: "Marble" },
];

function trigger() {
  return screen.getByRole("button", { name: /Material/ });
}

describe("Select", () => {
  it("follows a changed defaultValue (URL navigation such as Back)", () => {
    const view = renderWithIntl(
      <Select
        label="Material"
        name="material"
        options={MATERIALS}
        defaultValue="marble"
      />,
    );
    expect(trigger().textContent).toBe("Marble");
    view.rerender(
      <NextIntlClientProvider locale="en" messages={en}>
        <Select
          label="Material"
          name="material"
          options={MATERIALS}
          defaultValue="all"
        />
      </NextIntlClientProvider>,
    );
    expect(trigger().textContent).toBe("All materials");
    const hidden = document.querySelector(
      "input[type='hidden'][name='material']",
    ) as HTMLInputElement;
    expect(hidden.value).toBe("all");
  });

  it("renders a labelled listbox button showing the first option", () => {
    renderWithIntl(
      <Select label="Material" name="material" options={MATERIALS} />,
    );
    const button = trigger();
    expect(button.getAttribute("aria-haspopup")).toBe("listbox");
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.getAttribute("aria-controls")).toBeNull();
    expect(button.textContent).toBe("All materials");
    // The accessible name is "<label> <value>".
    expect(screen.getByRole("button", { name: "Material All materials" })).toBe(
      button,
    );
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("opens with Enter, moves with ArrowDown, selects with Enter and closes with Escape", () => {
    renderWithIntl(
      <Select label="Material" name="material" options={MATERIALS} />,
    );
    const button = trigger();

    fireEvent.keyDown(button, { key: "Enter" });
    const listbox = screen.getByRole("listbox", { name: "Material" });
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe(listbox.id);
    expect(screen.getAllByRole("option")).toHaveLength(4);

    // Focus moves into the listbox; the active option is exposed with aria-activedescendant.
    expect(document.activeElement).toBe(listbox);
    const options = screen.getAllByRole("option");
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[0].id);

    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[1].id);

    fireEvent.keyDown(listbox, { key: "Enter" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(button.textContent).toBe("Concrete");
    expect(document.activeElement).toBe(button);

    fireEvent.keyDown(button, { key: "Enter" });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(button);
    expect(button.textContent).toBe("Concrete");
  });

  it("exposes the selected option through aria-selected and a check", () => {
    renderWithIntl(
      <Select
        label="Material"
        name="material"
        options={MATERIALS}
        defaultValue="limestone"
      />,
    );
    fireEvent.click(trigger());
    const options = screen.getAllByRole("option");
    expect(options.map((o) => o.getAttribute("aria-selected"))).toEqual([
      "false",
      "false",
      "true",
      "false",
    ]);
    // The active option starts on the selected one.
    expect(
      screen.getByRole("listbox").getAttribute("aria-activedescendant"),
    ).toBe(options[2].id);
    // Only the selected row shows the decorative check icon.
    expect(options[2].querySelector("span[aria-hidden='true']")).not.toBeNull();
    expect(options[0].querySelector("span[aria-hidden='true']")).toBeNull();
  });

  it("opens with Space and ArrowDown, selects with Space", () => {
    renderWithIntl(
      <Select label="Material" name="material" options={MATERIALS} />,
    );
    const button = trigger();
    fireEvent.keyDown(button, { key: " " });
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowDown" });
    fireEvent.keyDown(screen.getByRole("listbox"), { key: " " });
    expect(button.textContent).toBe("Concrete");

    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("opens with ArrowUp", () => {
    renderWithIntl(
      <Select label="Material" name="material" options={MATERIALS} />,
    );
    fireEvent.keyDown(trigger(), { key: "ArrowUp" });
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("Home and End jump to the ends and the arrows stop there", () => {
    renderWithIntl(
      <Select label="Material" name="material" options={MATERIALS} />,
    );
    fireEvent.click(trigger());
    const listbox = screen.getByRole("listbox");
    const options = screen.getAllByRole("option");
    fireEvent.keyDown(listbox, { key: "End" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[3].id);
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[3].id);
    fireEvent.keyDown(listbox, { key: "Home" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[0].id);
    fireEvent.keyDown(listbox, { key: "ArrowUp" });
    expect(listbox.getAttribute("aria-activedescendant")).toBe(options[0].id);
  });

  it("clicking the button toggles, clicking an option selects it", () => {
    const onChange = vi.fn();
    renderWithIntl(
      <Select
        label="Material"
        name="material"
        options={MATERIALS}
        onChange={onChange}
      />,
    );
    const button = trigger();
    fireEvent.click(button);
    expect(screen.getByRole("listbox")).toBeTruthy();
    fireEvent.click(button);
    expect(screen.queryByRole("listbox")).toBeNull();

    fireEvent.click(button);
    fireEvent.click(screen.getByRole("option", { name: "Marble" }));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(button.textContent).toBe("Marble");
    expect(document.activeElement).toBe(button);
    expect(onChange).toHaveBeenCalledWith("marble");
  });

  it("Escape and outside clicks close without changing the value", () => {
    const onChange = vi.fn();
    renderWithIntl(
      <>
        <p>outside</p>
        <Select
          label="Material"
          name="material"
          options={MATERIALS}
          onChange={onChange}
        />
      </>,
    );
    const button = trigger();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "ArrowDown" });
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(button.textContent).toBe("All materials");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("a click inside the open panel does not count as outside", () => {
    renderWithIntl(
      <Select label="Material" name="material" options={MATERIALS} />,
    );
    fireEvent.click(trigger());
    fireEvent.pointerDown(screen.getByRole("option", { name: "Concrete" }));
    expect(screen.getByRole("listbox")).toBeTruthy();
  });

  it("Tab closes the list and leaves focus on the button", () => {
    renderWithIntl(
      <Select label="Material" name="material" options={MATERIALS} />,
    );
    const button = trigger();
    fireEvent.click(button);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Tab" });
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it("submits the chosen value via hidden input", () => {
    let submitted: FormData | undefined;
    renderWithIntl(
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submitted = new FormData(event.currentTarget);
        }}
      >
        <Select label="Material" name="material" options={MATERIALS} />
        <button type="submit">Go</button>
      </form>,
    );
    const hidden = document.querySelector(
      "input[type='hidden'][name='material']",
    ) as HTMLInputElement;
    expect(hidden.value).toBe("all");

    fireEvent.click(trigger());
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "End" });
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: "Go" }));
    expect(submitted?.get("material")).toBe("marble");
  });

  it("with no options the button is disabled, says so and submits an empty value", () => {
    renderWithIntl(<Select label="Material" name="material" options={[]} />);
    const button = trigger();
    expect(button).toHaveProperty("disabled", true);
    expect(button.textContent).toBe("No options");
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Enter" });
    expect(screen.queryByRole("listbox")).toBeNull();
    const hidden = document.querySelector(
      "input[type='hidden'][name='material']",
    ) as HTMLInputElement;
    expect(hidden.value).toBe("");
  });

  it("the empty text follows the locale", () => {
    renderWithIntl(<Select label="Материал" name="m" options={[]} />, "ru");
    expect(screen.getByRole("button").textContent).toBe("Нет вариантов");
  });

  it("a defaultValue that is not an option falls back to the first option", () => {
    renderWithIntl(
      <Select
        label="Material"
        name="material"
        options={MATERIALS}
        defaultValue="granite"
      />,
    );
    expect(trigger().textContent).toBe("All materials");
    const hidden = document.querySelector(
      "input[type='hidden'][name='material']",
    ) as HTMLInputElement;
    expect(hidden.value).toBe("all");
  });

  it("disabled select does not open and does not submit", () => {
    renderWithIntl(
      <Select label="Material" name="material" options={MATERIALS} disabled />,
    );
    const button = trigger();
    expect(button).toHaveProperty("disabled", true);
    fireEvent.click(button);
    fireEvent.keyDown(button, { key: "Enter" });
    expect(screen.queryByRole("listbox")).toBeNull();
    const hidden = document.querySelector(
      "input[type='hidden'][name='material']",
    ) as HTMLInputElement;
    expect(hidden.disabled).toBe(true);
  });

  it("long labels truncate in the button and wrap in the list instead of overflowing", () => {
    const long = "A very long material name that is much longer than the field";
    renderWithIntl(
      <Select
        label="Material"
        name="material"
        options={[{ value: "x", label: long }, ...MATERIALS]}
      />,
    );
    const button = trigger();
    const value = button.querySelector("span.truncate");
    expect(value?.textContent).toBe(long);
    expect(value?.className).toContain("min-w-0");
    fireEvent.click(button);
    const option = screen.getByRole("option", { name: long });
    expect(option.className).toContain("min-h-10");
    expect(option.className).not.toContain("whitespace-nowrap");
  });

  it("state open renders the list open without stealing focus", () => {
    renderWithIntl(
      <Select
        label="Material"
        name="material"
        options={MATERIALS}
        state="open"
      />,
    );
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(document.body);
  });

  it("a list frozen open ignores presses elsewhere (no focus steal) until the user closes it", () => {
    renderWithIntl(
      <>
        <p>outside</p>
        <Select
          label="Material"
          name="material"
          options={MATERIALS}
          state="open"
        />
      </>,
    );
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(screen.getByRole("listbox")).toBeTruthy();
    expect(document.activeElement).toBe(document.body);

    // Once the user closes it, it behaves like any other select again.
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    expect(screen.queryByRole("listbox")).toBeNull();
    fireEvent.click(trigger());
    fireEvent.pointerDown(screen.getByText("outside"));
    expect(screen.queryByRole("listbox")).toBeNull();
  });

  it("state hover and focus set data-state on the button", () => {
    for (const state of ["hover", "focus"] as const) {
      const { unmount } = renderWithIntl(
        <Select
          label="Material"
          name="material"
          options={MATERIALS}
          state={state}
        />,
      );
      expect(trigger().getAttribute("data-state")).toBe(state);
      unmount();
    }
  });

  it("two selects never share ids", () => {
    renderWithIntl(
      <>
        <Select label="Material" name="a" options={MATERIALS} />
        <Select label="Color" name="b" options={MATERIALS} />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Material/ }));
    fireEvent.click(screen.getByRole("button", { name: /Color/ }));
    const ids = screen.getAllByRole("option").map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
