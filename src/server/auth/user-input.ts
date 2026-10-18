import { hasHiddenCharacters, USER_NAME_MAX } from "../../lib/plain-text";

/*
 * What Better Auth may be given as `name` and `image` (sign-up and update-user). The app's own forms and actions
 * already validate names (src/server/account/actions.ts), and no HTTP route to Better Auth exists, so this is the
 * second line: the hook in auth.ts runs it before Better Auth stores anything, whoever the caller is (a future
 * route, a script, a library upgrade that adds an endpoint).
 *
 * - `name`: plain text, trimmed, at most USER_NAME_MAX characters, no control or invisible formatting characters.
 *   Sign-up may send an empty name (the app does: it means "show the email's local part"); update-user may not.
 * - `image`: never accepted. The app has no avatar; a user-chosen URL would be rendered by other users' browsers.
 */

/** Paths of the Better Auth endpoints that take a user's name or image. */
export const USER_FIELD_PATHS = ["/sign-up/email", "/update-user"] as const;

/** The refusal (a short, non-localised message) for these fields, or null when they are acceptable. */
export function userFieldsProblem(path: string, body: unknown): string | null {
  if (!(USER_FIELD_PATHS as readonly string[]).includes(path)) return null;
  const fields = (body && typeof body === "object" ? body : {}) as Record<
    string,
    unknown
  >;

  if (fields.image !== undefined && fields.image !== null) {
    return "image is not accepted";
  }
  if (fields.name === undefined) return null;
  if (typeof fields.name !== "string") return "name must be text";
  const name = fields.name;
  if (name === "" && path === "/sign-up/email") return null;
  if (name !== name.trim() || name.length === 0) {
    return "name must be trimmed and not empty";
  }
  if (name.length > USER_NAME_MAX) return "name is too long";
  if (hasHiddenCharacters(name)) return "name has invisible characters";
  return null;
}
