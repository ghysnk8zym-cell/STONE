import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

import { cn } from "../cn";

export type BreadcrumbItem = {
  label: string;
  /** Destination of an ancestor. The last item is the current page and is never a link. */
  href?: string;
};

const SEPARATOR = "/";

/*
 * Figma Product/Breadcrumb 779:529 (screen instances Product / Black Marble 782:11530 at 1440 and
 * 390, 234x20): a row of Inter 14/20 ("Catalog refined/Meta") parts, gap 10, on the light product
 * page. Ancestors are underlined links in text/ink-secondary (underline position from the font),
 * the "/" separators are text/ink-secondary, the current page is text/ink and not underlined. Bound
 * variables (get_variable_defs): text/ink-secondary, text/ink.
 *
 * Figma draws no hover or focus: hover darkens the link to text/ink, focus is a 2 px ink-primary
 * outline (the focus ring the other light-surface components use: accent-focus is too faint on
 * the light page). Long trails wrap instead of overflowing the 358 px column at 390.
 * The separators are real "/" text marked aria-hidden, so they look as drawn and stay out of the
 * accessible tree.
 */
const LINK = cn(
  "rounded-sm text-ink-secondary underline [text-underline-position:from-font] outline-0 motion-hover",
  "hov:text-ink",
  "focusv:outline-2 focusv:outline-offset-2 focusv:outline-ink-primary",
);

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const t = useTranslations("components.breadcrumb");
  const last = items.length - 1;

  return (
    <nav aria-label={t("label")}>
      <ol className="type-catalog-meta flex flex-wrap items-center gap-x-[10px]">
        {items.map((item, index) => (
          <li
            key={`${index}-${item.label}`}
            className="flex items-center gap-[10px]"
          >
            {index > 0 && (
              <span aria-hidden="true" className="text-ink-secondary">
                {SEPARATOR}
              </span>
            )}
            {index === last ? (
              <span aria-current="page" className="text-ink">
                {item.label}
              </span>
            ) : item.href !== undefined ? (
              <Link href={item.href} className={LINK}>
                {item.label}
              </Link>
            ) : (
              <span className="text-ink-secondary">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
