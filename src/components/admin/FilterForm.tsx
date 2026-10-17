"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { cn } from "../cn";

/**
 * The toolbar of an admin list (search box and select filters). A GET form, so it works without JavaScript: Enter
 * in the search box submits it, and a visually hidden button covers the selects. With JavaScript, changing a select
 * submits at once; the page re-renders on the server with the new query.
 */
export function FilterForm({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const t = useTranslations("admin.common");
  return (
    <form
      method="get"
      role="search"
      className={cn("flex items-end gap-4", className)}
      onChange={(event) => {
        if (event.target instanceof HTMLSelectElement) {
          event.currentTarget.requestSubmit();
        }
      }}
    >
      {children}
      <button type="submit" className="sr-only">
        {t("applyFilters")}
      </button>
    </form>
  );
}
