"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/buttons/Button";
import { TextField } from "@/components/forms/TextField";
import { Icon } from "@/components/icons/Icon";
import {
  requestInput,
  type RequestInput,
} from "@/features/stone-requests/input";
import { preparePhoto } from "@/features/stone-requests/prepare-photo";
import { MATERIALS } from "@/server/catalog/types";
import {
  recoverStoneRequest,
  submitStoneRequest,
} from "@/server/stone-requests/actions";
import { ReferencePhoto } from "./ReferencePhoto";

function Step({
  number,
  title,
  hint,
}: {
  number: number;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className="bg-stone-catalog-photo flex size-11 shrink-0 items-center justify-center rounded-full [font-family:var(--font-display)] text-[18px]"
      >
        {number}
      </span>
      <div>
        <h2 className="type-catalog-product-name-lg">{title}</h2>
        {hint && (
          <p className="type-catalog-meta text-stone-catalog-secondary">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}
type Fields = Record<keyof RequestInput, string>;
export function RequestForm({
  user,
  available,
}: {
  user: { id: string; name: string; email: string } | null;
  available: boolean;
}) {
  const t = useTranslations("stoneRequest");
  const catalog = useTranslations("catalog");
  const locale = useLocale();
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({
    material: "",
    color: "",
    texture: "",
    lengthMm: "",
    widthMm: "",
    thicknessMm: "",
    quantity: "1",
    contactName: user?.name ?? "",
    contactEmail: user?.email ?? "",
    contactPhone: "",
  });
  const [photo, setPhoto] = useState<{
    file: File;
    url: string;
    name: string;
  } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [pending, setPending] = useState(false);
  const [recovering, setRecovering] = useState(!!user);
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RequestInput, string>>
  >({});
  const [photoError, setPhotoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const alert = useRef<HTMLParagraphElement>(null);
  const submissionKey = useRef<string | null>(null);
  const busy = useRef(false);
  const storageKey = `stone-request-pending:${user?.id ?? "guest"}`;
  const disabled = !user || !available || preparing || pending || recovering;
  function updateField(name: keyof Fields, value: string) {
    setFields((old) => ({ ...old, [name]: value }));
    setFieldErrors((old) => {
      const next = { ...old };
      delete next[name];
      return next;
    });
    setMessage("");
  }
  const success = (id: string) => {
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Saving itself does not depend on browser storage. */
    }
    router.replace(
      `/${locale}/create-your-stone?request=${encodeURIComponent(id)}`,
    );
  };
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo],
  );
  useEffect(() => {
    if (!user) return;
    let active = true;
    async function recover() {
      try {
        const key = sessionStorage.getItem(storageKey);
        submissionKey.current = key;
        const result = key
          ? await recoverStoneRequest(key)
          : await Promise.resolve(null);
        if (!active) return;
        if (result?.ok) {
          sessionStorage.removeItem(storageKey);
          router.replace(
            `/${locale}/create-your-stone?request=${encodeURIComponent(result.id)}`,
          );
          return;
        }
        if (result && !result.ok) setMessage(t("errors.unavailable"));
      } catch {
        if (active) setMessage(t("errors.storage"));
      }
      if (active) setRecovering(false);
    }
    void recover();
    return () => {
      active = false;
    };
  }, [locale, storageKey, t, user, router]);
  async function choose(file: File | undefined) {
    if (!file || busy.current) return;
    busy.current = true;
    setPreparing(true);
    setPhotoError("");
    try {
      const optimized = await preparePhoto(file);
      setPhoto({
        file: optimized,
        url: URL.createObjectURL(optimized),
        name: file.name.slice(0, 100),
      });
    } catch {
      setPhotoError(t("errors.photo"));
    } finally {
      busy.current = false;
      setPreparing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || busy.current) return;
    const parsed = requestInput.safeParse({
      ...fields,
      lengthMm: Number(fields.lengthMm),
      widthMm: Number(fields.widthMm),
      thicknessMm: Number(fields.thicknessMm),
      quantity: Number(fields.quantity),
    });
    setFieldErrors({});
    setMessage("");
    setPhotoError("");
    if (!parsed.success || !photo) {
      if (!parsed.success)
        setFieldErrors(
          Object.fromEntries(
            parsed.error.issues.map((issue) => [
              issue.path[0],
              t("errors.field"),
            ]),
          ),
        );
      if (!photo) setPhotoError(t("errors.photo"));
      setMessage(t("errors.invalid"));
      requestAnimationFrame(() => alert.current?.focus());
      return;
    }
    busy.current = true;
    setPending(true);
    const key = submissionKey.current ?? crypto.randomUUID();
    submissionKey.current = key;
    try {
      sessionStorage.setItem(storageKey, key);
    } catch {
      setMessage(t("errors.storage"));
    }
    const data = new FormData();
    data.set("key", key);
    data.set("fields", JSON.stringify(parsed.data));
    data.set("photo", photo.file);
    try {
      const result = await submitStoneRequest(data);
      if (result.ok) {
        success(result.id);
        return;
      }
      setMessage(
        result.code === "photo"
          ? t("errors.serverPhoto")
          : t(`errors.${result.code}`),
      );
    } catch {
      setMessage(t("errors.unavailable"));
    } finally {
      busy.current = false;
      setPending(false);
    }
    requestAnimationFrame(() => alert.current?.focus());
  }
  const field = (
    name: keyof Fields,
    options: {
      type?: "text" | "email" | "number";
      unit?: string;
      placeholder?: string;
      autoComplete?: string;
    } = {},
  ) => (
    <TextField
      name={name}
      label={t(name)}
      tone="light"
      value={fields[name]}
      onChange={(value) => updateField(name, value)}
      error={fieldErrors[name]}
      required={name !== "contactPhone"}
      {...options}
    />
  );
  return (
    <>
      {!available ? (
        <p role="status" className="type-catalog-field-value mb-6">
          {t("unavailable")}
        </p>
      ) : !user ? (
        <div className="mb-8 flex flex-col items-start gap-4">
          <p className="type-catalog-field-value">{t("signInHint")}</p>
          <Button
            variant="graphite-solid"
            href={`/sign-in?next=${encodeURIComponent(`/${locale}/create-your-stone`)}`}
          >
            {t("signIn")}
          </Button>
        </div>
      ) : null}
      <form
        onSubmit={submit}
        noValidate
        aria-label={t("title")}
        aria-busy={pending || preparing || recovering}
      >
        <fieldset disabled={disabled} className="min-w-0">
          <legend className="sr-only">{t("title")}</legend>
          <section className="border-stone-catalog-line grid grid-cols-1 gap-6 border-y py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,480px)] lg:gap-10 lg:py-10">
            <div className="flex min-w-0 flex-col gap-4">
              <Step number={1} title={t("reference")} />
              <div className="border-stone-catalog-line bg-stone-catalog-card flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-2xl border-[1.5px] border-dashed px-6 py-8 text-center">
                <Icon name="upload" size={32} />
                <p className="type-catalog-field-value">{t("referenceHint")}</p>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-label={t("choose")}
                  onChange={(event) => void choose(event.target.files?.[0])}
                  className="hidden"
                />
                <Button
                  variant="graphite-solid"
                  onClick={() => fileInput.current?.click()}
                  disabled={disabled}
                >
                  {t("choose")}
                </Button>
              </div>
              {photo && (
                <div className="border-stone-catalog-line bg-stone-catalog-card flex min-w-0 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border px-3 py-3 lg:pr-5">
                  <ReferencePhoto
                    src={photo.url}
                    alt=""
                    className="h-12 w-16 shrink-0 rounded-lg"
                  />
                  <div className="min-w-[160px] flex-1 basis-[180px]">
                    <p className="type-catalog-meta truncate">{photo.name}</p>
                    <p className="type-catalog-meta text-stone-catalog-secondary">
                      {t("added")}
                    </p>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      className="min-h-11 underline underline-offset-4 focus-visible:outline-2"
                    >
                      {t("replace")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPhoto(null);
                        setPhotoError("");
                      }}
                      className="min-h-11 underline underline-offset-4 focus-visible:outline-2"
                    >
                      {t("remove")}
                    </button>
                  </div>
                </div>
              )}
              {photoError && (
                <p role="alert" className="type-catalog-meta text-[#a3362d]">
                  {photoError}
                </p>
              )}
              {preparing && (
                <p role="status" className="type-catalog-meta">
                  {t("preparing")}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <p className="type-catalog-meta">{t("preview")}</p>
              {photo ? (
                <ReferencePhoto
                  src={photo.url}
                  alt={t("preview")}
                  className="aspect-[8/5] w-full rounded-2xl"
                />
              ) : (
                <div className="bg-stone-catalog-photo type-catalog-meta text-stone-catalog-secondary flex aspect-[8/5] items-center justify-center rounded-2xl px-6 text-center">
                  {t("previewEmpty")}
                </div>
              )}
              <p className="type-catalog-meta text-stone-catalog-secondary">
                {t("photoHelp")}
              </p>
            </div>
          </section>
          <section className="border-stone-catalog-line flex flex-col gap-6 border-b py-8 lg:py-10">
            <Step number={2} title={t("details")} hint={t("detailsHint")} />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex flex-col gap-2">
                <label htmlFor="request-material" className="type-catalog-meta">
                  {t("material")}
                </label>
                <div className="relative">
                  <select
                    id="request-material"
                    name="material"
                    value={fields.material}
                    onChange={(event) =>
                      updateField("material", event.target.value)
                    }
                    aria-invalid={!!fieldErrors.material}
                    aria-describedby={
                      fieldErrors.material ? "material-error" : undefined
                    }
                    required
                    className="border-stone-catalog-line bg-stone-catalog-page type-catalog-field-value focus-visible:outline-ink-primary h-13 w-full appearance-none rounded-xl border pr-10 pl-4 focus-visible:outline-2"
                  >
                    <option value="">{t("materialPlaceholder")}</option>
                    {MATERIALS.map((value) => (
                      <option key={value} value={value}>
                        {catalog(`material.${value}`)}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute top-[18px] right-4">
                    <Icon name="chevron" size={16} />
                  </span>
                </div>
                {fieldErrors.material && (
                  <p
                    id="material-error"
                    role="alert"
                    className="type-catalog-meta text-[#a3362d]"
                  >
                    {fieldErrors.material}
                  </p>
                )}
              </div>
              {field("color", { placeholder: t("colorPlaceholder") })}
              {field("texture", { placeholder: t("texturePlaceholder") })}
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
              {(
                ["lengthMm", "widthMm", "thicknessMm", "quantity"] as const
              ).map((name) => (
                <div key={name} className="min-w-0">
                  {field(name, {
                    type: "number",
                    unit: t(name === "quantity" ? "pieces" : "mm"),
                  })}
                </div>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-6 pt-8 lg:pt-10">
            <Step number={3} title={t("contact")} />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {field("contactName", { autoComplete: "name" })}
              {field("contactEmail", { type: "email", autoComplete: "email" })}
              {field("contactPhone", { autoComplete: "tel" })}
            </div>
          </section>
        </fieldset>
        {message && (
          <p
            ref={alert}
            tabIndex={-1}
            role="alert"
            className="type-catalog-meta mt-6 text-[#a3362d]"
          >
            {message}
          </p>
        )}
        {recovering && (
          <p role="status" className="type-catalog-meta mt-6">
            {t("recovering")}
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <Button
            variant="graphite-solid"
            type="submit"
            disabled={disabled}
            loading={pending}
            className="w-full"
          >
            {pending ? t("sending") : t("submit")}
          </Button>
          <p className="type-catalog-meta text-stone-catalog-secondary text-center">
            {t("submitHint")}
          </p>
          <p className="type-catalog-meta text-stone-catalog-secondary text-center">
            {t("demo")}
          </p>
        </div>
      </form>
    </>
  );
}
