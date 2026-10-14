import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

/**
 * Header logo: a 24 px rule (divider/light), 12 px gap, "STONE" in the Figma "Brand/Logo" style
 * (Lusitana, size per breakpoint, tracking 10%). The accessible name contains the visible text.
 * The brand name is not translated (`common.siteName`).
 */
export function Logo({ onClick }: { onClick?: () => void }) {
  const t = useTranslations("components.nav");
  const common = useTranslations("common");
  const name = common("siteName");

  return (
    <Link
      href="/"
      aria-label={t("home", { name })}
      onClick={onClick}
      className="focusv:outline-2 focusv:outline-offset-4 focusv:outline-accent-focus flex items-center gap-3 rounded-sm outline-0"
    >
      <span aria-hidden="true" className="bg-divider-light h-px w-6" />
      <span className="text-primary type-brand-logo whitespace-nowrap">
        {name}
      </span>
    </Link>
  );
}
