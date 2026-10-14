import { useTranslations } from "next-intl";

import { Button } from "@/components/buttons/Button";
import { LanguageSwitch } from "@/components/navigation/LanguageSwitch";

import { Example, Group, PhotoFrame, Section } from "../parts";

const ITEMS = [
  "motion",
  "states",
  "primaryFocus",
  "focusRings",
  "mobileMenu",
  "headerBreakpoint",
  "tabBar",
  "footer",
  "ruDraft",
] as const;

export function Approval() {
  const t = useTranslations("styleguide");
  const a = useTranslations("styleguide.approval");

  return (
    <Section id="approval" title={t("sections.approval")} intro={a("intro")}>
      <div className="flex flex-col gap-12">
        <Group title={a("fonts")} stack>
          <Example data-qa="approval-fonts" caption={a("fontsHint")} wide>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-1">
                <p className="type-catalog-meta text-secondary">
                  {a("fontLatin")}
                </p>
                <p lang="en" className="type-catalog-page-title text-primary">
                  {a("sampleLatin")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="type-catalog-meta text-secondary">
                  {a("fontCyrillic")}
                </p>
                <p lang="ru" className="type-catalog-page-title text-primary">
                  {a("sampleCyrillic")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <p className="type-catalog-meta text-secondary">
                  {a("fontMixed")}
                </p>
                <p lang="ru" className="type-catalog-page-title text-primary">
                  {a("sampleMixed")}
                </p>
              </div>
            </div>
          </Example>
        </Group>

        <Group title={a("languageSwitch")}>
          <Example
            data-qa="approval-language-switch"
            caption={a("languageSwitchHint")}
          >
            <LanguageSwitch />
          </Example>
        </Group>

        <Group title={a("loading")}>
          <Example
            data-qa="approval-loading-button"
            caption={a("loadingHint")}
            tone="light"
          >
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="primary" type="submit" loading>
                {t("buttons.label")}
              </Button>
              <Button variant="outline" type="submit" loading>
                {t("buttons.label")}
              </Button>
            </div>
          </Example>
        </Group>

        <Group title={a("glass")} stack>
          <Example data-qa="approval-glass" caption={a("glassHint")} wide>
            <PhotoFrame
              scene="images/hero/scene-1440"
              className="flex min-h-72 items-center justify-center p-6"
            >
              <div className="glass-panel bg-surface-panel max-w-sm rounded-2xl p-6">
                <p className="type-card-title text-primary">
                  {a("glassTitle")}
                </p>
                <p className="type-body-m text-secondary mt-2">
                  {a("glassBody")}
                </p>
              </div>
            </PhotoFrame>
          </Example>
        </Group>

        <Group title={a("checklist")} stack>
          <Example
            data-qa="approval-checklist"
            caption={a("checklistHint")}
            wide
          >
            <ol className="flex list-decimal flex-col gap-3 pl-6">
              {ITEMS.map((item) => (
                <li key={item} className="type-body-m text-primary pl-1">
                  {a(`items.${item}`)}
                </li>
              ))}
            </ol>
          </Example>
        </Group>
      </div>
    </Section>
  );
}
