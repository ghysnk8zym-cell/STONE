"use client";

import {
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import { Button } from "@/components/buttons/Button";
import { SearchField } from "@/components/forms/SearchField";
import { Select } from "@/components/forms/Select";
import { Icon } from "@/components/icons/Icon";
import { useRouter } from "@/i18n/navigation";

export type FilterField = {
  name: "material" | "color" | "finish" | "sort";
  label: string;
  options: { value: string; label: string }[];
  value: string;
};

const subscribeNothing = () => () => {};

const PARAMS = ["q", "material", "color", "finish", "sort", "sale"] as const;

/** The catalog URL for the form's values: empty values and the default sort are left out. */
function catalogHref(data: FormData, override: Record<string, string> = {}) {
  const params = new URLSearchParams();
  for (const name of PARAMS) {
    const raw = override[name] ?? data.get(name);
    const value = typeof raw === "string" ? raw.trim() : "";
    if (!value || (name === "sort" && value === "name-asc")) continue;
    params.set(name, value);
  }
  const query = params.toString();
  return query ? `/catalog?${query}` : "/catalog";
}

/*
 * Field box of the Catalog screens (Field / Material 922:25505): same look as the Select trigger, kept
 * in step with it. Used only until the page hydrates (see CatalogFilters).
 */
const NATIVE_BOX =
  "block h-13 w-full appearance-none rounded-[12px] border border-stone-catalog-line bg-stone-catalog-card pr-10 pl-4 text-stone-catalog-ink outline-0 type-catalog-field-value focus-visible:border-ink-primary focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-ink-primary";

/** Server-rendered stand-in of the Select: a native <select>, so the form works without JavaScript. */
function NativeSelect({ field }: { field: FilterField }) {
  const id = useId();
  return (
    <div className="flex w-full flex-col gap-2">
      <label htmlFor={id} className="text-stone-catalog-ink type-catalog-meta">
        {field.label}
      </label>
      <div className="relative">
        <select
          id={id}
          name={field.name}
          defaultValue={field.value}
          className={NATIVE_BOX}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevron"
          size={16}
          className="text-stone-catalog-ink pointer-events-none absolute top-1/2 right-3 -translate-y-1/2"
        />
      </div>
    </div>
  );
}

/*
 * Catalog form (Figma "Title + search" 922:25498 + "Toolbar" 922:25503, "Results" 922:25509).
 * It is a plain `<form method="get">`: the server reads the query string, so a filter is a shareable URL
 * and works without JavaScript. Before hydration the selects are native and the Apply button is shown;
 * once hydrated, the custom Selects replace them, the button is removed and a change navigates with
 * `router.push`, so Back restores the previous filter. The Apply button floats over the gap around the
 * results row, so it never moves the layout.
 */
export function CatalogFilters({
  title,
  results,
  fields,
  q,
  sale,
  searchLabel,
  searchPlaceholder,
  applyLabel,
}: {
  /** The page `<h1>` (server-rendered). */
  title: ReactNode;
  /** "Showing N of 12" and the placeholder-price line (server-rendered). */
  results: ReactNode;
  fields: FilterField[];
  q: string;
  sale: boolean;
  searchLabel: string;
  searchPlaceholder: string;
  applyLabel: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  // false in the server HTML and while hydrating, true afterwards
  const hydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  // The URL changed under the form (Back / Forward): show the query the server rendered.
  useEffect(() => {
    const input = formRef.current?.elements.namedItem("q");
    if (input instanceof HTMLInputElement && input.value.trim() !== q) {
      input.value = q;
    }
  }, [q]);

  const go = (override?: Record<string, string>) => {
    if (formRef.current) {
      router.push(catalogHref(new FormData(formRef.current), override), {
        scroll: false,
      });
    }
  };

  const field = (name: FilterField["name"], className: string) => {
    const f = fields.find((candidate) => candidate.name === name)!;
    return (
      <div className={className}>
        {hydrated ? (
          <Select
            label={f.label}
            name={f.name}
            options={f.options}
            defaultValue={f.value}
            onChange={(value) => go({ [f.name]: value })}
          />
        ) : (
          <NativeSelect field={f} />
        )}
      </div>
    );
  };

  // Figma: 240 / 220 wide at 1440, 200 at 1024; four equal columns at 768 and two at 390.
  const WIDTH = "lg:w-[200px] min-[90rem]:w-[240px]";
  const SORT_WIDTH = "lg:w-[200px] min-[90rem]:w-[220px]";

  return (
    <form
      ref={formRef}
      method="get"
      className="grid grid-cols-1 gap-y-4 md:grid-cols-[1fr_480px] md:items-center"
      onSubmit={(event) => {
        if (!hydrated) return;
        event.preventDefault();
        go();
      }}
    >
      {title}

      {/* Only the fields are the search landmark (the h1 and the counter are outside it). */}
      <div role="search" aria-label={searchLabel} className="contents">
        <SearchField
          name="q"
          placeholder={searchPlaceholder}
          label={searchLabel}
          defaultValue={q}
        />

        {sale ? <input type="hidden" name="sale" value="1" /> : null}

        {/* 16 row gap + 12 = Figma's 28 between the blocks */}
        <div className="mt-3 grid grid-cols-2 gap-3 md:col-span-2 md:grid-cols-4 md:gap-4 lg:flex lg:items-end lg:justify-between">
          <div className="contents lg:flex lg:gap-4">
            {field("material", WIDTH)}
            {field("color", WIDTH)}
            {field("finish", WIDTH)}
          </div>
          {field("sort", SORT_WIDTH)}
        </div>
      </div>

      <div className="relative mt-3 md:col-span-2">
        {results}
        {hydrated ? null : (
          <Button
            type="submit"
            variant="outline"
            className="absolute top-1/2 right-0 -translate-y-1/2"
          >
            {applyLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
