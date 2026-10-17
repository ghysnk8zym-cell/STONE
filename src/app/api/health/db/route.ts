import { pingDb } from "@/server/db";

// Deployment check: is a database configured and reachable? Reads the environment and the
// database at request time, never at build time. Reveals nothing beyond ok / not ok.
//
// The route is public on purpose (a deployment check must work before anyone signs in), but
// each hit runs `select 1`, which wakes a suspended Neon compute and spends free-tier
// CU-hours. Keep it out of uptime monitors with short intervals.
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

/** Error name and code only: messages can contain the connection URL. */
function safeErrorSummary(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const direct = (error as { code?: unknown } | null)?.code;
  const cause = (error as { cause?: { code?: unknown } } | null)?.cause?.code;
  const code = [direct, cause].find((c) => typeof c === "string");
  return code ? `${name} ${code}` : name;
}

export async function GET(): Promise<Response> {
  try {
    if (!(await pingDb())) {
      return Response.json(
        { ok: false, reason: "database-not-configured" },
        { status: 503, headers },
      );
    }
    return Response.json({ ok: true }, { headers });
  } catch (error) {
    console.error(`[health/db] check failed: ${safeErrorSummary(error)}`);
    return Response.json(
      { ok: false, reason: "database-unavailable" },
      { status: 503, headers },
    );
  }
}
