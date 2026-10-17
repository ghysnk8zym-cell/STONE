/**
 * Where a `pglite://` URL points: undefined for the throwaway in-memory database
 * (`pglite://memory`, or no path), otherwise the data directory on disk.
 * Shared by the runtime (client.ts) and drizzle-kit (drizzle.config.ts) so they agree.
 */
export function pgliteLocation(url: string): string | undefined {
  const path = url.slice("pglite://".length);
  return path === "" || path === "memory" ? undefined : path;
}
