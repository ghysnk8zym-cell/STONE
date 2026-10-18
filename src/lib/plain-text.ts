/*
 * What counts as plain text for a name or a description the app stores and shows. Besides the C0/C1 control
 * characters (`\p{Cc}`) it refuses the invisible formatting characters (`\p{Cf}`: bidirectional overrides such as
 * U+202E, zero-width space and joiners, the word joiner, the byte order mark) and the line and paragraph separators
 * (U+2028, U+2029). Those let a name read differently from what it is (a reversed file extension, text that
 * disappears) and are never needed in a person's or a stone's name.
 */
const HIDDEN = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

/** True when `value` has a control, invisible formatting or separator character. */
export function hasHiddenCharacters(value: string): boolean {
  return HIDDEN.test(value);
}

/** A multi-line text: the line feed is allowed, everything else must be plain. */
export function hasHiddenCharactersExceptNewline(value: string): boolean {
  return HIDDEN.test(value.replaceAll("\n", ""));
}

/** The longest display name of a user (profile and sign-up). */
export const USER_NAME_MAX = 80;
