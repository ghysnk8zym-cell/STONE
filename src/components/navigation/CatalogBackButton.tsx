"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { IconButton } from "@/components/buttons/IconButton";
import { readCatalogReturn } from "./PageTransition";

const subscribe = () => () => {};
const serverSnapshot = () => "/catalog";

export function CatalogBackButton({ label }: { label: string }) {
  const locale = useLocale();
  const href = useSyncExternalStore(
    subscribe,
    () => readCatalogReturn(locale).replace(`/${locale}`, ""),
    serverSnapshot,
  );
  return <IconButton icon="back" tone="ink" href={href} label={label} />;
}
