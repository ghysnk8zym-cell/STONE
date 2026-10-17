export type SpecRow = { label: string; value: string };

/*
 * Figma "Specs" (782:11542) of Product/Spec row 779:533: a hairline (catalog-line) on top of each 48 px
 * row, label 160 px in text/ink-secondary and value in text/ink (Catalog/Field value 16/22), gap 16;
 * the last row also closes with a hairline. Semantically a description list.
 */
export function SpecRows({ rows }: { rows: SpecRow[] }) {
  return (
    <dl className="type-catalog-field-value border-stone-catalog-line m-0 flex w-full flex-col border-b">
      {rows.map((row) => (
        <div
          key={row.label}
          className="border-stone-catalog-line flex min-h-12 items-center gap-4 border-t py-3"
        >
          <dt className="text-ink-secondary w-40 shrink-0">{row.label}</dt>
          <dd className="text-ink m-0 min-w-0 flex-1">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}
