import { describe, expect, it } from "vitest";

import { clientMessages } from "@/i18n/client-messages";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

describe("clientMessages", () => {
  it("drops the styleguide namespace and keeps every other one", () => {
    for (const messages of [en, ru]) {
      const result = clientMessages(messages);
      expect(result).not.toHaveProperty("styleguide");
      const rest: Record<string, unknown> = { ...messages };
      delete rest.styleguide;
      expect(result).toEqual(rest);
      expect(Object.keys(result)).toContain("components");
    }
  });

  it("does not mutate its input", () => {
    const input = { common: { a: "x" }, styleguide: { b: "y" } };
    clientMessages(input);
    expect(input).toHaveProperty("styleguide");
  });

  it("leaves no styleguide string in the serialised client payload", () => {
    expect(JSON.stringify(clientMessages(ru))).not.toContain(
      ru.styleguide.sections.approval,
    );
  });
});
