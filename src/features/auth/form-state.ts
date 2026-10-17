/*
 * The data contract between the auth server actions and the sign-in / sign-up forms. Client-safe and
 * dependency-free: the forms (client components) take the state types and the initial state from here.
 * Only codes travel to the browser, never a message and never anything from Better Auth's response (the
 * session token is stripped by `toClientResult`, ADR-002); the form turns a code into localised copy
 * (`auth.errors.*`). The parsing and the error mapping live in ./credentials.ts (server side).
 */

export type AuthMode = "sign-in" | "sign-up";

export type AuthErrorCode =
  | "invalidEmail"
  | "weakPassword"
  | "emailTaken"
  | "invalidCredentials"
  | "tooManyAttempts"
  | "unavailable"
  | "generic";

export type AuthFormState = {
  error: AuthErrorCode | null;
  /** What was typed, so the field survives a failed submit (never the password). */
  email: string;
};

export const initialAuthFormState: AuthFormState = { error: null, email: "" };
