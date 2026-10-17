import { handleAuthRequest } from "@/server/auth/next";

// Better Auth endpoints (sign-in, sign-up, sign-out, session). Read at request time, never
// cached; without a database every call answers 503 JSON instead of failing.
export const dynamic = "force-dynamic";

export const GET = handleAuthRequest;
export const POST = handleAuthRequest;
