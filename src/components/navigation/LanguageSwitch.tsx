"use client";

import { useLocale, useTranslations } from "next-intl";

import { usePathname, useRouter } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";

import { cn } from "../cn";
import { NavPill } from "./NavPill";

/* Not in Figma, so ours: full white instead of text/secondary (72 %), which was 3.3:1 on the grey glass header
   over the light catalog pages (axe: nav pill over header is #747473, white is 4.7:1) and is higher on the dark header. The current language
   is told apart by its underline. */
const INACTIVE = "text-primary";

type Query = Record<string, string | string[]>;

/** Current query string as the object next-intl wants; repeated keys become arrays. */
function readQuery(search: string): Query {
  const query: Query = {};
  for (const [key, value] of new URLSearchParams(search)) {
    const known = query[key];
    if (known === undefined) query[key] = value;
    else query[key] = Array.isArray(known) ? [...known, value] : [known, value];
  }
  return query;
}

/**
 * Language switch (not in Figma; owner-approved, built from the Nav/Pill look, ADR-004).
 * A button: it switches to the other locale with next-intl's `router.replace`, keeping the
 * path and the query string. next-intl itself writes the NEXT_LOCALE cookie (explicit choice).
 * Visible text is "RU / EN" with the current language emphasised; the accessible name
 * ("RU / EN — switch language to English") contains the visible text (WCAG 2.5.3) and names
 * the language the click switches to.
 *
 * The query is read from `window.location` at click time, not with `useSearchParams()`: that
 * hook forces a Suspense boundary and client-side rendering of every page that has a header.
 */
export function LanguageSwitch({ onSwitch }: { onSwitch?: () => void }) {
  const t = useTranslations("components.languageSwitch");
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();

  const target = routing.locales.find((code) => code !== locale) ?? locale;

  const handleClick = () => {
    const query = readQuery(window.location.search);
    router.replace(
      Object.keys(query).length > 0 ? { pathname, query } : { pathname },
      { locale: target },
    );
    onSwitch?.();
  };

  return (
    <NavPill
      onClick={handleClick}
      aria-label={t("label", { language: t(`languages.${target}`) })}
    >
      <span className="inline-flex items-baseline gap-2">
        {routing.locales.map((code, index) => (
          <span key={code} className="contents">
            {index > 0 ? (
              <span aria-hidden="true" className={INACTIVE}>
                {t("separator")}
              </span>
            ) : null}
            <span
              lang={code}
              className={cn(
                code === locale
                  ? "text-primary underline decoration-1 underline-offset-4"
                  : INACTIVE,
              )}
            >
              {t(`codes.${code}`)}
            </span>
          </span>
        ))}
      </span>
    </NavPill>
  );
}
