/** Joins class names, skipping falsy parts. Variants are typed objects + cn(), no extra dependency. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
