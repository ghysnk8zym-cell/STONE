import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";

import en from "../../messages/en.json";
import ru from "../../messages/ru.json";

const messages = { en, ru } as const;

type Locale = keyof typeof messages;

/**
 * Shared Testing Library helper: renders `ui` inside NextIntlClientProvider with the
 * real messages so components that call useTranslations behave as in the app.
 * Component test files must start with `// @vitest-environment jsdom`.
 */
export function renderWithIntl(ui: ReactElement, locale: Locale = "en") {
  return render(
    <NextIntlClientProvider locale={locale} messages={messages[locale]}>
      {ui}
    </NextIntlClientProvider>,
  );
}
