import { useTranslations } from "next-intl";

import { Badge } from "@/components/forms/Badge";
import { SearchField } from "@/components/forms/SearchField";
import { Select } from "@/components/forms/Select";
import { TextField } from "@/components/forms/TextField";

import { Example, Group, Section } from "../parts";

/** Width of a field column: Figma fields fill their parent, so the example fixes one. */
const FIELD = "w-72 max-w-full";

export function Forms() {
  const t = useTranslations("styleguide");
  const f = useTranslations("styleguide.forms");
  const search = useTranslations("components.search");
  const states = {
    default: t("states.default"),
    hover: t("states.hover"),
    focus: t("states.focus"),
    disabled: t("states.disabled"),
    error: t("states.error"),
    open: t("states.open"),
    closed: t("states.closed"),
  };
  const options = [
    { value: "marble", label: f("selectOptions.marble") },
    { value: "limestone", label: f("selectOptions.limestone") },
    { value: "granite", label: f("selectOptions.granite") },
  ];

  return (
    <Section id="forms" title={t("sections.forms")} intro={t("statesNote")}>
      <div className="flex flex-col gap-12">
        <Group title={f("dark")}>
          <Example data-qa="text-field-dark-default" caption={states.default}>
            <div className={FIELD}>
              <TextField
                name="dark-default"
                type="email"
                label={f("fieldEmail")}
                placeholder={f("placeholderEmail")}
              />
            </div>
          </Example>
          <Example data-qa="text-field-dark-focus" caption={states.focus}>
            <div className={FIELD}>
              <TextField
                name="dark-focus"
                type="email"
                label={f("fieldEmail")}
                defaultValue={f("valueEmail")}
                state="focus"
              />
            </div>
          </Example>
          <Example data-qa="text-field-dark-error" caption={states.error}>
            <div className={FIELD}>
              <TextField
                name="dark-error"
                type="email"
                label={f("fieldEmail")}
                defaultValue={f("valueEmail")}
                error={f("errorEmail")}
              />
            </div>
          </Example>
          <Example data-qa="text-field-dark-disabled" caption={states.disabled}>
            <div className={FIELD}>
              <TextField
                name="dark-disabled"
                type="email"
                label={f("fieldEmail")}
                defaultValue={f("valueEmail")}
                disabled
              />
            </div>
          </Example>
        </Group>

        <Group title={f("light")}>
          <Example
            data-qa="text-field-light-default"
            caption={states.default}
            tone="light"
          >
            <div className={FIELD}>
              <TextField
                name="light-default"
                tone="light"
                type="email"
                label={f("fieldEmail")}
                placeholder={f("placeholderEmail")}
              />
            </div>
          </Example>
          <Example
            data-qa="text-field-light-focus"
            caption={states.focus}
            tone="light"
          >
            <div className={FIELD}>
              <TextField
                name="light-focus"
                tone="light"
                type="email"
                label={f("fieldEmail")}
                defaultValue={f("valueEmail")}
                state="focus"
              />
            </div>
          </Example>
          <Example
            data-qa="text-field-light-error"
            caption={states.error}
            tone="light"
          >
            <div className={FIELD}>
              <TextField
                name="light-error"
                tone="light"
                type="email"
                label={f("fieldEmail")}
                defaultValue={f("valueEmail")}
                error={f("errorEmail")}
              />
            </div>
          </Example>
          <Example
            data-qa="text-field-light-disabled"
            caption={states.disabled}
            tone="light"
          >
            <div className={FIELD}>
              <TextField
                name="light-disabled"
                tone="light"
                type="email"
                label={f("fieldEmail")}
                defaultValue={f("valueEmail")}
                disabled
              />
            </div>
          </Example>
          <Example
            data-qa="text-field-light-unit"
            caption={f("fieldArea")}
            tone="light"
          >
            <div className={FIELD}>
              <TextField
                name="light-unit"
                tone="light"
                type="number"
                label={f("fieldArea")}
                defaultValue={f("valueArea")}
                unit={f("unitArea")}
              />
            </div>
          </Example>
        </Group>

        <Group title={f("search")}>
          <Example
            data-qa="search-field-light-default"
            caption={states.default}
            tone="light"
          >
            <div className={FIELD}>
              <SearchField
                name="search-default"
                placeholder={search("placeholder")}
              />
            </div>
          </Example>
          <Example
            data-qa="search-field-light-hover"
            caption={states.hover}
            tone="light"
          >
            <div className={FIELD}>
              <SearchField
                name="search-hover"
                placeholder={search("placeholder")}
                state="hover"
              />
            </div>
          </Example>
          <Example
            data-qa="search-field-light-focus"
            caption={states.focus}
            tone="light"
          >
            <div className={FIELD}>
              <SearchField
                name="search-focus"
                placeholder={search("placeholder")}
                state="focus"
              />
            </div>
          </Example>
          <Example
            data-qa="search-field-light-disabled"
            caption={states.disabled}
            tone="light"
          >
            <div className={FIELD}>
              <SearchField
                name="search-disabled"
                placeholder={search("placeholder")}
                disabled
              />
            </div>
          </Example>
          <Example
            data-qa="search-field-graphite-default"
            caption={f("searchGraphite")}
          >
            <div className={FIELD}>
              <SearchField
                name="search-graphite"
                tone="graphite"
                placeholder={search("placeholder")}
              />
            </div>
          </Example>
        </Group>

        <Group title={f("select")}>
          <Example data-qa="select-closed" caption={states.closed} tone="light">
            <div className={FIELD}>
              <Select
                name="select-closed"
                label={f("selectLabel")}
                options={options}
              />
            </div>
          </Example>
          <Example data-qa="select-hover" caption={states.hover} tone="light">
            <div className={FIELD}>
              <Select
                name="select-hover"
                label={f("selectLabel")}
                options={options}
                state="hover"
              />
            </div>
          </Example>
          <Example data-qa="select-focus" caption={states.focus} tone="light">
            <div className={FIELD}>
              <Select
                name="select-focus"
                label={f("selectLabel")}
                options={options}
                state="focus"
              />
            </div>
          </Example>
          <Example
            data-qa="select-open"
            caption={states.open}
            tone="light"
            stageClassName="min-h-64"
          >
            <div className={FIELD}>
              <Select
                name="select-open"
                label={f("selectLabel")}
                options={options}
                defaultValue="limestone"
                state="open"
              />
            </div>
          </Example>
          <Example
            data-qa="select-disabled"
            caption={states.disabled}
            tone="light"
          >
            <div className={FIELD}>
              <Select
                name="select-disabled"
                label={f("selectLabel")}
                options={options}
                disabled
              />
            </div>
          </Example>
        </Group>

        <Group title={f("badge")}>
          <Example
            data-qa="badge-discount"
            caption={states.default}
            tone="light"
          >
            <Badge>{f("discount")}</Badge>
          </Example>
        </Group>
      </div>
    </Section>
  );
}
