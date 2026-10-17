/*
 * How the account screens name and abbreviate a user. A user created through sign-up has an empty
 * name (the sign-up form asks only for email and password), so every screen falls back to the local
 * part of the email: "alex.morgan@example.com" reads "alex.morgan".
 */

type NamedUser = { name: string; email: string };

/** The full name, or the email's local part when no name is set. */
export function displayNameOf(user: NamedUser): string {
  const name = user.name.trim();
  return name || (user.email.split("@")[0] ?? user.email);
}

/** The first word of the display name ("Welcome, Alex"). */
export function firstNameOf(user: NamedUser): string {
  return displayNameOf(user).split(/\s+/)[0] ?? "";
}

/** Up to two capital letters: "Alex Morgan" is "AM", "alex" is "A". */
export function initialsOf(user: NamedUser): string {
  const words = displayNameOf(user)
    .split(/[\s._-]+/)
    .filter(Boolean);
  const letters = words
    .slice(0, 2)
    .map((word) => Array.from(word)[0] ?? "")
    .join("");
  return (letters || "?").toLocaleUpperCase();
}
