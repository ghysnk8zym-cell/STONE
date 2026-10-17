"use client";

import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/icons/Icon";
import { TextField } from "@/components/forms/TextField";

const subscribeNever = () => () => {};

/**
 * Password input with the Figma "Show password" toggle (Input/Dark Icon=true 430:504: a 44 px
 * button with the 24 px eye). The toggle only works with JavaScript, so it stays hidden until the page
 * has hydrated: without JavaScript the field is a plain password input. Figma draws one state of the eye,
 * so the pressed state is announced (`aria-pressed`) and the field shows the text, nothing else changes.
 */
export function PasswordField({
  label,
  placeholder,
  error,
  autoComplete,
}: {
  label: string;
  placeholder: string;
  error?: string;
  autoComplete: "current-password" | "new-password";
}) {
  const t = useTranslations("auth");
  const [shown, setShown] = useState(false);
  const hydrated = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );

  return (
    <TextField
      label={label}
      name="password"
      type={shown ? "text" : "password"}
      scale="screen"
      placeholder={placeholder}
      autoComplete={autoComplete}
      error={error}
      required
      trailing={
        <button
          type="button"
          aria-pressed={shown}
          aria-label={t("showPassword")}
          hidden={!hydrated}
          onClick={() => setShown((value) => !value)}
          className="text-ink-on-dark focusv:outline-2 focusv:outline-accent-focus motion-hover hov:bg-surface-card-hover focusv:-outline-offset-2 flex size-11 cursor-pointer items-center justify-center rounded-[10px] outline-0"
        >
          <Icon name="eye" />
        </button>
      }
    />
  );
}
