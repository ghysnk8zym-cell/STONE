import "server-only";

type AuthEvent =
  | "auth_unavailable"
  | "handler_failed"
  | "session_read_failed"
  | "session_revoke_failed"
  | "api_failed"
  | "auth_error";

const ERROR_NAMES = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "APIError",
  "DrizzleQueryError",
  "DatabaseError",
]);
const ERROR_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "08000",
  "08003",
  "08006",
  "28P01",
  "42P01",
  "42703",
  "53300",
  "57P01",
  "23505",
]);

/** Fixed categories only. Even error names/codes can contain untrusted data. */
export function logAuthFailure(event: AuthEvent, error: unknown): void {
  const outer = error instanceof Error ? error.name : "unknown";
  const kind = ERROR_NAMES.has(outer) ? outer : "unknown";
  let code: string | undefined;
  let current = error;
  // Drizzle wraps driver errors in `cause`; bounded traversal also handles cycles.
  for (
    let depth = 0;
    depth < 3 && current && typeof current === "object";
    depth++
  ) {
    const candidate = current as { code?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && ERROR_CODES.has(candidate.code)) {
      code = candidate.code;
      break;
    }
    current = candidate.cause;
  }
  console.error("[auth]", { event, kind, ...(code ? { code } : {}) });
}

/** Better Auth's message and extra arguments may contain SQL, tokens and user data. */
export function logBetterAuthError(
  level: "debug" | "info" | "warn" | "error",
  message: string,
  ...args: unknown[]
): void {
  if (level !== "error") return;
  const event =
    message === "INTERNAL_SERVER_ERROR" ||
    message === "Failed to read session from database"
      ? "session_read_failed"
      : message === "Failed to delete session from database"
        ? "session_revoke_failed"
        : "auth_error";
  logAuthFailure(
    event,
    args.find((arg) => arg instanceof Error),
  );
}
