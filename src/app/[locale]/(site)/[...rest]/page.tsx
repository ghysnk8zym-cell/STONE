import { notFound } from "next/navigation";

// Unknown paths under a locale render [locale]/not-found.tsx (localized) instead of
// the English root not-found page.
export default function CatchAllPage() {
  notFound();
}
