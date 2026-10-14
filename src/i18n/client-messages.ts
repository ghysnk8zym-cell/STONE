/**
 * Messages the locale layout hands to NextIntlClientProvider (and so to the browser on every page).
 * The `styleguide` namespace is internal (it holds the owner-approval checklist and is read by server
 * components only, through src/i18n/request.ts), so it must never ship in production pages.
 */
export function clientMessages<T extends Record<string, unknown>>(
  messages: T,
): Omit<T, "styleguide"> {
  const rest: Record<string, unknown> = { ...messages };
  delete rest.styleguide;
  return rest as Omit<T, "styleguide">;
}
