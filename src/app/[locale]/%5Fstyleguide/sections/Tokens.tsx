import { useTranslations } from "next-intl";

import snapshot from "@/styles/tokens/figma-variables.json";

import { Example, Group, PhotoFrame, Section } from "../parts";

type ColorGroup = "surface" | "line" | "text" | "accent" | "catalog";

const GROUP_ORDER: readonly ColorGroup[] = [
  "surface",
  "line",
  "text",
  "accent",
  "catalog",
];

/** Which group a Figma colour variable belongs to, by name prefix. */
function groupOf(name: string): ColorGroup {
  if (name.startsWith("--surface-")) return "surface";
  if (name.startsWith("--stone-catalog-")) return "catalog";
  if (
    name.startsWith("--border-") ||
    name.startsWith("--divider-") ||
    name.startsWith("--overlay-")
  ) {
    return "line";
  }
  if (name.startsWith("--accent-") || name.startsWith("--success-")) {
    return "accent";
  }
  return "text";
}

/* Colour variables only (hex values); sizes and layout variables are not swatches. */
const COLORS = Object.entries(snapshot.variables).flatMap(([name, value]) => {
  const base: unknown = value.base;
  return typeof base === "string" && /^#[0-9a-f]{6,8}$/i.test(base)
    ? [{ name, value: base, group: groupOf(name) }]
    : [];
});

/* Written out in full so Tailwind sees every type-* utility. */
const TYPE_DARK = [
  "type-brand-logo",
  "type-nav-link",
  "type-nav-menu",
  "type-button-label",
  "type-hero-headline",
  "type-section-label",
  "type-card-title",
  "type-body-m",
  "type-footer-link",
  "type-footer-small",
] as const;

const TYPE_LIGHT = [
  "type-catalog-product-name",
  "type-catalog-product-name-lg",
  "type-catalog-product-name-sm",
  "type-catalog-meta",
  "type-catalog-meta-lg",
  "type-catalog-action",
  "type-catalog-button",
  "type-catalog-field-value",
  "type-catalog-page-title",
  "type-catalog-page-title-56",
  "type-catalog-product-title",
  "type-catalog-section",
] as const;

/** Half light, half dark ground, so translucent fills read; the fill itself is the Figma variable. */
const SWATCH_GROUND =
  "linear-gradient(90deg, var(--stone-catalog-page) 50%, var(--surface-page) 50%)";

function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <li className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="border-glass relative size-12 shrink-0 overflow-clip rounded-lg border"
        style={{ background: SWATCH_GROUND }}
      >
        <span
          className="absolute inset-0"
          style={{ backgroundColor: `var(${name})` }}
        />
      </span>
      <span className="flex min-w-0 flex-col">
        <code className="type-catalog-meta text-primary break-all">{name}</code>
        <span className="type-footer-small text-secondary">{value}</span>
      </span>
    </li>
  );
}

function TypeRow({
  name,
  sample,
  ground,
}: {
  name: string;
  sample: string;
  ground: "dark" | "light";
}) {
  return (
    <li className="flex flex-col gap-1">
      <code
        className={
          ground === "dark"
            ? "type-footer-small text-secondary"
            : "type-footer-small text-stone-catalog-secondary"
        }
      >
        {name}
      </code>
      <p
        className={
          ground === "dark"
            ? `${name} text-primary`
            : `${name} text-stone-catalog-ink`
        }
      >
        {sample}
      </p>
    </li>
  );
}

export function Tokens() {
  const t = useTranslations("styleguide");
  const k = useTranslations("styleguide.tokens");

  return (
    <Section id="tokens" title={t("sections.tokens")}>
      <div className="flex flex-col gap-12">
        <Group title={k("colors")} stack>
          <Example data-qa="tokens-colors" caption={k("colorsNote")} wide>
            <div className="flex flex-col gap-8">
              {GROUP_ORDER.map((group) => (
                <div key={group} className="flex flex-col gap-4">
                  <h4 className="type-section-label text-label uppercase">
                    {k(`colorGroups.${group}`)}
                  </h4>
                  <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
                    {COLORS.filter((color) => color.group === group).map(
                      (color) => (
                        <Swatch
                          key={color.name}
                          name={color.name}
                          value={color.value}
                        />
                      ),
                    )}
                  </ul>
                </div>
              ))}
            </div>
          </Example>
        </Group>

        <Group title={k("type")} stack>
          <Example data-qa="tokens-type" caption={k("typeNote")} wide>
            <div className="grid gap-x-10 gap-y-8 xl:grid-cols-2">
              <div className="flex flex-col gap-4 p-4">
                <h4 className="type-section-label text-label uppercase">
                  {k("typeDark")}
                </h4>
                <ul className="flex flex-col gap-5">
                  {TYPE_DARK.map((name) => (
                    <TypeRow
                      key={name}
                      name={name}
                      sample={t("demo.sample")}
                      ground="dark"
                    />
                  ))}
                </ul>
              </div>
              <div className="bg-stone-catalog-page flex flex-col gap-4 p-4">
                <h4 className="type-section-label text-stone-catalog-secondary uppercase">
                  {k("typeLight")}
                </h4>
                <ul className="flex flex-col gap-5">
                  {TYPE_LIGHT.map((name) => (
                    <TypeRow
                      key={name}
                      name={name}
                      sample={t("demo.sample")}
                      ground="light"
                    />
                  ))}
                </ul>
              </div>
            </div>
          </Example>
        </Group>

        <Group title={k("effects")} stack>
          <Example data-qa="tokens-effects" caption={k("effectsNote")} wide>
            <PhotoFrame
              scene="images/hero/scene-1440"
              className="grid gap-6 p-6 md:grid-cols-3"
            >
              <div
                aria-hidden="true"
                className="glass-panel bg-surface-panel min-h-48 rounded-2xl"
              />
              <div
                aria-hidden="true"
                className="glass-card bg-surface-card border-glass min-h-48 rounded-2xl border"
              />
              <div
                aria-hidden="true"
                className="glass-header border-glass min-h-48 rounded-2xl border"
              />
            </PhotoFrame>
            {/* Labels sit on the page ground, not on the glass: white text on the light photo would fail contrast. */}
            <ul className="type-body-m text-primary mt-4 grid gap-2 md:grid-cols-3 md:gap-6 md:px-6">
              <li>{k("effectPanel")}</li>
              <li>{k("effectCard")}</li>
              <li>{k("effectHeader")}</li>
            </ul>
          </Example>
        </Group>
      </div>
    </Section>
  );
}
