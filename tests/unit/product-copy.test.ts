import { describe, expect, it } from "vitest";

import { productDescription, productName } from "@/lib/product-copy";

// A stand-in for the `catalog` translator of next-intl: only the keys it holds exist.
function messages(entries: Record<string, string>) {
  const translator = Object.assign((key: string) => entries[key] ?? key, {
    has: (key: string) => key in entries,
  });
  return translator as never;
}

const c = messages({
  "products.black-marble.name": "Black Marble (messages)",
  "products.black-marble.description": "From the messages.",
});

describe("product copy", () => {
  it("prefers the stored translation of the page locale (what an admin edited)", () => {
    const product = {
      slug: "black-marble",
      copy: {
        ru: { name: "Чёрный мрамор", description: "Из базы." },
        en: { name: "Black Marble (edited)", description: "Edited." },
      },
    };
    expect(productName(product, "ru", c)).toBe("Чёрный мрамор");
    expect(productName(product, "en", c)).toBe("Black Marble (edited)");
    expect(productDescription(product, "en", c)).toBe("Edited.");
  });

  it("falls back to the messages for a product or a language without a stored row", () => {
    expect(productName({ slug: "black-marble" }, "en", c)).toBe(
      "Black Marble (messages)",
    );
    expect(
      productName(
        {
          slug: "black-marble",
          copy: { ru: { name: "Мрамор", description: "" } },
        },
        "en",
        c,
      ),
    ).toBe("Black Marble (messages)");
    // a stored but empty description falls through to the messages as well
    expect(
      productDescription(
        { slug: "black-marble", copy: { en: { name: "x", description: " " } } },
        "en",
        c,
      ),
    ).toBe("From the messages.");
  });

  it("ends at the slug (name) or an empty text (description), never at a missing-message key", () => {
    expect(productName({ slug: "database-only" }, "ru", c)).toBe(
      "database-only",
    );
    expect(productDescription({ slug: "database-only" }, "ru", c)).toBe("");
  });
});
