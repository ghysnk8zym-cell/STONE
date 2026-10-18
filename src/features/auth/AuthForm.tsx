"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { Button } from "@/components/buttons/Button";
import { TextField } from "@/components/forms/TextField";
import { Link } from "@/i18n/navigation";

import {
  initialAuthFormState,
  type AuthErrorCode,
  type AuthFormState,
  type AuthMode,
} from "./form-state";
import { PasswordField } from "./PasswordField";

type AuthAction = (
  previous: AuthFormState,
  data: FormData,
) => Promise<AuthFormState>;

// Where each error is shown: under the field it is about, or above the button when it is about the
// attempt itself (rate limit, no database, unexpected failure).
const EMAIL_ERRORS: readonly AuthErrorCode[] = ["invalidEmail", "emailTaken"];
const PASSWORD_ERRORS: readonly AuthErrorCode[] = [
  "weakPassword",
  "invalidCredentials",
];

/*
 * The sign-in and sign-up form (Figma Create account 431:3193 and breakpoints): Email, Password with the
 * eye toggle, the light button and the link to the other screen. A real `<form action>` with a server
 * action: it posts and redirects without JavaScript too, and with JavaScript `useActionState` shows the
 * error without a reload. `noValidate`: every message is ours, in the page language, not the browser's.
 * The hidden `locale` and `next` fields are read by the action, which validates both.
 */
export function AuthForm({
  mode,
  locale,
  next,
  action,
}: {
  mode: AuthMode;
  locale: string;
  /** The (sanitised) page to return to; undefined when the page was opened without one. */
  next?: string;
  action: AuthAction;
}) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(
    action,
    initialAuthFormState,
  );

  const signUp = mode === "sign-up";
  const copy = signUp ? "signUp" : "signIn";
  const error = state.error;
  const errorFor = (codes: readonly AuthErrorCode[]) =>
    error && codes.includes(error) ? t(`errors.${error}`) : undefined;
  const formError =
    error && !EMAIL_ERRORS.includes(error) && !PASSWORD_ERRORS.includes(error)
      ? t(`errors.${error}`)
      : undefined;

  const otherPage = signUp ? "/sign-in" : "/sign-up";

  return (
    <form
      action={formAction}
      noValidate
      className="flex w-full flex-col"
      data-testid={`${mode}-form`}
    >
      <input type="hidden" name="locale" value={locale} />
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <TextField
        label={t("email")}
        name="email"
        type="email"
        scale="screen"
        placeholder={t("emailPlaceholder")}
        autoComplete="email"
        defaultValue={state.email}
        error={errorFor(EMAIL_ERRORS)}
        required
      />
      <div className="mt-4 min-[390px]:mt-5 lg:mt-7">
        <PasswordField
          label={t("password")}
          placeholder={t(`${copy}.passwordPlaceholder`)}
          autoComplete={signUp ? "new-password" : "current-password"}
          error={errorFor(PASSWORD_ERRORS)}
        />
      </div>

      {formError ? (
        <p
          role="alert"
          className="type-catalog-field-value mt-5 text-[#f0a8a0] min-[390px]:mt-6 lg:mt-8"
        >
          {formError}
        </p>
      ) : null}

      <div
        className={`w-full ${formError ? "mt-4" : "mt-5 min-[390px]:mt-6 lg:mt-8"}`}
      >
        <Button
          type="submit"
          variant="light"
          loading={pending}
          className="h-14! w-full text-[18px]! lg:h-15! lg:text-[20px]!"
        >
          {t(`${copy}.submit`)}
        </Button>
      </div>

      <p className="type-catalog-field-value text-ink-on-dark/88 mt-4 flex items-center gap-2.5 text-[16px] max-lg:leading-[1.21] min-[390px]:mt-5 lg:mt-7 lg:text-[18px]">
        <span>{t(signUp ? "signUp.haveAccount" : "signIn.noAccount")}</span>
        <Link
          href={
            next
              ? { pathname: otherPage, query: { next } }
              : { pathname: otherPage }
          }
          className="text-ink-on-dark focusv:outline-2 focusv:outline-accent-focus focusv:outline-offset-2 rounded-[10px] px-1.5 py-2.5 underline decoration-from-font outline-0 [text-underline-position:from-font]"
        >
          {t(signUp ? "signUp.signInLink" : "signIn.signUpLink")}
        </Link>
      </p>
    </form>
  );
}
