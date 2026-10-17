import { pingDb } from "@/server/db";

// Deployment check: is a database configured and reachable? Reads the environment and the
// database at request time, never at build time. Reveals nothing beyond ok / not ok.
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET(): Promise<Response> {
  try {
    if (!(await pingDb())) {
      return Response.json(
        { ok: false, reason: "database-not-configured" },
        { status: 503, headers },
      );
    }
    return Response.json({ ok: true }, { headers });
  } catch {
    return Response.json(
      { ok: false, reason: "database-unavailable" },
      { status: 503, headers },
    );
  }
}
