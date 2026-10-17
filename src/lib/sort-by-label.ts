/** Returns a copy of `items` ordered by their visible label, locale-aware (Intl.Collator). */
export function sortByLabel<T extends { label: string }>(
  items: readonly T[],
  locale: string,
): T[] {
  const collator = new Intl.Collator(locale);
  return [...items].sort((a, b) => collator.compare(a.label, b.label));
}
