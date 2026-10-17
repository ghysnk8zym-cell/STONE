import { NotFoundView } from "./NotFoundView";

/*
 * Boundary for `notFound()` inside the site shell. Unknown paths normally never get here: the
 * middleware route gate (src/lib/route-gate.ts) rewrites them to `404/page.tsx`, which is
 * server-rendered. A thrown `notFound()` only yields Next's empty error shell plus this content
 * via client rendering, so it stays as the fallback (paths the middleware matcher skips).
 */
export default function SiteNotFound() {
  return <NotFoundView />;
}
