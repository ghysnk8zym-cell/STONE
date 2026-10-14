import { Button } from "@/components/buttons/Button";

/*
 * Empty result. Layout from the Catalog frames' "Empty state" (922:26021, hidden state of every
 * breakpoint): centred column, py 64, gap 12, title Catalog/Product name 26/32 in text/ink, guidance
 * Catalog refined/Meta in stone/catalog-secondary, outline pill actions (46 high). The copy and the
 * three recovery actions (clear colour / clear material / reset all) come from `Catalog/Empty`
 * (159:309), which is drawn dark and stale; the light catalog page uses the light variant above.
 */
export function EmptyState({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  /** Locale-free catalog paths. */
  actions: { label: string; href: string }[];
}) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-3 px-2 py-16 text-center"
    >
      <h2 className="type-catalog-product-name-lg text-stone-catalog-ink">
        {title}
      </h2>
      <p className="type-catalog-meta text-stone-catalog-secondary max-w-[36rem]">
        {body}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        {actions.map((action) => (
          <Button key={action.href} variant="outline" href={action.href}>
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
