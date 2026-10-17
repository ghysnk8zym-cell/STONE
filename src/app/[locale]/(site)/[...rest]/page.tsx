import { notFound } from "next/navigation";

// Fallback only: the middleware route gate rewrites unknown paths under a locale to `404/page.tsx`
// (server-rendered). Paths the middleware matcher skips (a dot in the last segment) still land here
// and get the localised (site)/not-found.tsx, rendered on the client.
export default function CatchAllPage() {
  notFound();
}
