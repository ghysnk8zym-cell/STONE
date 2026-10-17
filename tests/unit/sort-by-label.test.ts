import { describe, expect, it } from "vitest";

import { sortByLabel } from "@/lib/sort-by-label";
import en from "../../messages/en.json";
import ru from "../../messages/ru.json";
import { MATERIALS } from "@/server/catalog/types";

// The catalog Material filter lists its options by the localised label (facets come sorted by key).
describe("sortByLabel", () => {
  const options = (labels: Record<string, string>) =>
    MATERIALS.map((m) => ({ value: m, label: labels[m]! }));

  it("orders the ru materials alphabetically", () => {
    expect(
      sortByLabel(options(ru.catalog.material), "ru").map((o) => o.label),
    ).toEqual([
      "Бетон",
      "Известняк",
      "Кварцит",
      "Мрамор",
      "Песчаник",
      "Сланец",
    ]);
  });

  it("orders the en materials alphabetically", () => {
    expect(
      sortByLabel(options(en.catalog.material), "en").map((o) => o.label),
    ).toEqual([
      "Concrete",
      "Limestone",
      "Marble",
      "Quartzite",
      "Sandstone",
      "Slate",
    ]);
  });

  it("is locale-aware (ё sorts with е in ru) and does not mutate its input", () => {
    const input = [
      { value: "b", label: "ёж" },
      { value: "a", label: "жук" },
      { value: "c", label: "еда" },
    ];
    expect(sortByLabel(input, "ru").map((o) => o.value)).toEqual([
      "c",
      "b",
      "a",
    ]);
    expect(input.map((o) => o.value)).toEqual(["b", "a", "c"]);
  });
});
