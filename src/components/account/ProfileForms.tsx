"use client";

import { useTranslations } from "next-intl";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

import { Button } from "@/components/buttons/Button";
import { TextField } from "@/components/forms/TextField";
import type { ChangePasswordErrorCode } from "@/features/account/results";
import { changePassword, updateProfileName } from "@/server/account/actions";

import { CARD, CARD_TITLE } from "./parts";

/*
 * Profile screen (Figma Account / Profile 742:16191, card "Personal details" 742:16300): Name, Email and the
 * Edit profile outline button. Figma draws the read-only state and a Phone row; there is no phone in the data
 * model, so the row is not drawn. Edit profile turns the Name row into a field (Save / Cancel); the email is
 * read-only. The "Password" card is not in Figma: it is built from the same card, the light TextField and the
 * Graphite button, and is listed for owner approval in the Task 4 report.
 */

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="type-catalog-meta text-stone-catalog-secondary">{label}</p>
      <p className="type-catalog-field-value text-stone-catalog-ink wrap-anywhere">
        {value}
      </p>
    </div>
  );
}

const DIVIDER = <div className="bg-stone-catalog-line h-px w-full" />;

export function ProfileDetails({
  name,
  email,
}: {
  /** The stored name; empty when the user never set one. */
  name: string;
  email: string;
}) {
  const t = useTranslations("account.profile");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(name);
  const [error, setError] = useState<string | undefined>();
  const [notice, setNotice] = useState(false);
  const [pending, startTransition] = useTransition();
  const section = useRef<HTMLElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    const lostInputFocus =
      !pending && editing && document.activeElement === document.body;
    if (!restoreFocus.current && !lostInputFocus) return;
    section.current
      ?.querySelector<HTMLElement>(editing ? 'input[name="name"]' : "button")
      ?.focus();
    restoreFocus.current = false;
  }, [editing, pending]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("name") ?? "");
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await updateProfileName(value);
        if (result.ok) {
          setSaved(result.name);
          restoreFocus.current = true;
          setEditing(false);
          setNotice(true);
        } else {
          setError(
            result.code === "invalid"
              ? t("errors.nameInvalid")
              : t("errors.generic"),
          );
        }
      } catch {
        setError(t("errors.generic"));
      }
    });
  }

  return (
    <section
      ref={section}
      aria-label={t("details")}
      className={`${CARD} flex flex-col gap-4 p-(--layout-panel-pad)`}
    >
      <h2 className={CARD_TITLE}>{t("details")}</h2>

      {editing ? (
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-4"
          data-testid="profile-name-form"
        >
          <TextField
            tone="light"
            label={t("name")}
            name="name"
            defaultValue={saved}
            autoComplete="name"
            error={error}
            disabled={pending}
            required
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="graphite-solid" loading={pending}>
              {t("save")}
            </Button>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() => {
                restoreFocus.current = true;
                setEditing(false);
                setError(undefined);
              }}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      ) : (
        <Field label={t("name")} value={saved || t("nameEmpty")} />
      )}

      {DIVIDER}
      <Field label={t("email")} value={email} />
      {DIVIDER}

      {notice && !editing ? (
        <p
          role="status"
          className="type-catalog-meta text-stone-catalog-secondary"
        >
          {t("saved")}
        </p>
      ) : null}
      {editing ? null : (
        <div>
          <Button
            variant="outline"
            onClick={() => {
              restoreFocus.current = true;
              setNotice(false);
              setEditing(true);
            }}
          >
            {t("edit")}
          </Button>
        </div>
      )}
    </section>
  );
}

const PASSWORD_ERRORS: readonly ChangePasswordErrorCode[] = [
  "invalidCurrent",
  "weakPassword",
  "tooManyAttempts",
  "unavailable",
  "generic",
];

/** Change password: the current password is required (no email service, so no reset link). */
export function PasswordCard() {
  const t = useTranslations("account.profile.password");
  const [error, setError] = useState<ChangePasswordErrorCode | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const current = String(data.get("current") ?? "");
    const next = String(data.get("next") ?? "");
    setError(null);
    setDone(false);
    startTransition(async () => {
      try {
        const result = await changePassword(current, next);
        if (result.ok) {
          form.reset();
          setDone(true);
        } else {
          setError(result.code);
        }
      } catch {
        setError("generic");
      }
    });
  }

  const code = error === "invalid" || error === null ? "generic" : error;
  const message =
    error && PASSWORD_ERRORS.includes(code) ? t(`errors.${code}`) : undefined;
  // The wrong current password belongs to its field, the rest to the new password / the form.
  const currentError = error === "invalidCurrent" ? message : undefined;
  const nextError = error === "weakPassword" ? message : undefined;
  const formError = error && !currentError && !nextError ? message : undefined;

  return (
    <section
      aria-label={t("title")}
      className={`${CARD} flex flex-col gap-4 p-(--layout-panel-pad)`}
    >
      <h2 className={CARD_TITLE}>{t("title")}</h2>
      <form
        onSubmit={onSubmit}
        noValidate
        className="flex max-w-[480px] flex-col gap-4"
        data-testid="password-form"
      >
        <TextField
          tone="light"
          label={t("current")}
          name="current"
          type="password"
          autoComplete="current-password"
          error={currentError}
          required
        />
        <TextField
          tone="light"
          label={t("next")}
          name="next"
          type="password"
          autoComplete="new-password"
          error={nextError}
          required
        />
        {formError ? (
          <p role="alert" className="type-catalog-meta text-[#a3362d]">
            {formError}
          </p>
        ) : null}
        {done ? (
          <p
            role="status"
            className="type-catalog-meta text-stone-catalog-secondary"
          >
            {t("success")}
          </p>
        ) : null}
        <div>
          <Button type="submit" variant="graphite-solid" loading={pending}>
            {t("submit")}
          </Button>
        </div>
      </form>
    </section>
  );
}
