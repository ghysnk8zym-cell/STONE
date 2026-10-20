import { useTranslations } from "next-intl";
import type { StoneRequestStatus as Status } from "@/features/admin/stone-requests";
import { cn } from "../cn";

export function StoneRequestStatus({ status }: { status: Status }) {
  // Figma brown #8a735a with white is 4.49:1. Two RGB steps darker yields 4.62:1 at 14px.
  // Use an explicit white value: the default Tailwind palette is disabled in globals.css.
  const t = useTranslations("admin.createYourStone.statuses");
  return (
    <span
      className={cn(
        "type-catalog-meta inline-flex w-fit shrink-0 rounded-full px-3 py-1",
        status === "new"
          ? "text-stone-catalog-ink bg-[#dcd2c3]"
          : status === "draft_quote"
            ? "bg-accent-focus text-stone-catalog-ink"
            : "bg-[#887158] text-[#ffffff]",
      )}
    >
      {t(status)}
    </span>
  );
}
