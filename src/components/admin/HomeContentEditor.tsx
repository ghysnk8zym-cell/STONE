"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import {
  HOME_FIELDS,
  HOME_SECTIONS,
  HOME_TEXT_KEYS,
  type HomeSection,
  type HomeText,
  type HomeTextKey,
} from "@/features/content/home-fields";
import type { Locale } from "@/i18n/routing";
import { Link, useRouter } from "@/i18n/navigation";
import { saveHomeText } from "@/server/admin/content-actions";
import { cn } from "../cn";
import { Icon } from "../icons/Icon";
import { AdminInput, AdminSelect } from "./fields";
import {
  ADMIN_BUTTON_PRIMARY,
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_CARD_TITLE,
  ADMIN_MUTED,
} from "./parts";

/** Figma Site content 1077:53429 / 1077:56526, limited to the approved Home text fields. */
export function HomeContentEditor({
  data,
  initialLocale,
}: {
  data: Record<Locale, HomeText>;
  initialLocale: Locale;
}) {
  const t = useTranslations("admin.siteContent");
  const router = useRouter();
  const [locale, setLocale] = useState(initialLocale);
  const [section, setSection] = useState<HomeSection>("hero");
  const [key, setKey] = useState<HomeTextKey>("hero.line1");
  const [drafts, setDrafts] = useState({
    ru: data.ru.values,
    en: data.en.values,
  });
  const [expected, setExpected] = useState({
    ru: data.ru.stored,
    en: data.en.stored,
  });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const fields = HOME_TEXT_KEYS.filter(
    (field) => HOME_FIELDS[field].section === section,
  );
  const text = drafts[locale][key];
  const dirty = text !== (expected[locale][key] ?? data[locale].defaults[key]);
  const label = (field: HomeTextKey) => t(`fields.${HOME_FIELDS[field].label}`);

  function save(reset: boolean) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await saveHomeText(
          locale,
          key,
          reset ? null : text,
          expected[locale][key],
        );
        if (!result.ok) {
          setMessage({ ok: false, text: t(`errors.${result.code}`) });
          return;
        }
        setExpected((current) => ({
          ...current,
          [locale]: { ...current[locale], [key]: result.text },
        }));
        setDrafts((current) => ({
          ...current,
          [locale]: {
            ...current[locale],
            [key]: result.text ?? data[locale].defaults[key],
          },
        }));
        setMessage({ ok: true, text: t(reset ? "restored" : "saved") });
        router.refresh();
      } catch {
        setMessage({ ok: false, text: t("errors.generic") });
      }
    });
  }

  return (
    <fieldset
      disabled={pending}
      aria-busy={pending}
      className="border-stone-catalog-line grid min-w-0 grid-cols-[180px_minmax(0,1fr)] items-start gap-y-8 border-t pt-6 min-[90rem]:grid-cols-[200px_400px_minmax(0,1fr)]"
    >
      <legend className="sr-only">{t("editor")}</legend>
      <nav
        aria-label={t("pages")}
        className="border-stone-catalog-line flex min-w-0 flex-col gap-4 self-stretch border-r pr-7"
      >
        <h2 className={ADMIN_CARD_TITLE}>{t("pages")}</h2>
        <p className="type-catalog-field-value text-stone-catalog-ink flex items-center gap-2">
          <Icon name="chevron" size={16} />
          {t("home")}
        </p>
        <div className="border-stone-catalog-line flex flex-col gap-0.5 border-l pl-3">
          {HOME_SECTIONS.map((value) => (
            <button
              key={value}
              type="button"
              aria-current={section === value ? "page" : undefined}
              onClick={() => {
                setSection(value);
                setKey(
                  HOME_TEXT_KEYS.find(
                    (field) => HOME_FIELDS[field].section === value,
                  )!,
                );
                setMessage(null);
              }}
              className={cn(
                "type-catalog-field-value focusv:outline-2 focusv:outline-ink-primary rounded-lg px-3.5 py-2.5 text-left outline-0",
                section === value
                  ? "bg-stone-catalog-photo text-stone-catalog-ink"
                  : "text-stone-catalog-secondary hov:bg-overlay-tint-10",
              )}
            >
              {t(`sections.${value}`)}
            </button>
          ))}
        </div>
      </nav>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save(false);
        }}
        className="border-stone-catalog-line flex min-w-0 flex-col gap-[18px] border-r px-7"
      >
        <p className={ADMIN_MUTED}>
          {t("breadcrumb", { section: t(`sections.${section}`) })}
        </p>
        <h2 className="type-catalog-product-title text-stone-catalog-ink">
          {t("edit", { section: t(`sections.${section}`) })}
        </h2>
        <AdminSelect
          label={t("language")}
          name="contentLocale"
          value={locale}
          options={[
            { value: "ru", label: t("languages.ru") },
            { value: "en", label: t("languages.en") },
          ]}
          onChange={(value) => {
            setLocale(value as Locale);
            setMessage(null);
          }}
        />
        <AdminSelect
          label={t("field")}
          name="contentKey"
          value={key}
          options={fields.map((field) => ({
            value: field,
            label: label(field),
          }))}
          onChange={(value) => {
            setKey(value as HomeTextKey);
            setMessage(null);
          }}
        />
        <AdminInput
          label={label(key)}
          name="contentText"
          value={text}
          maxLength={HOME_FIELDS[key].max}
          required
          hint={t("limit", { count: HOME_FIELDS[key].max })}
          onChange={(value) => {
            setDrafts((current) => ({
              ...current,
              [locale]: { ...current[locale], [key]: value },
            }));
            setMessage(null);
          }}
        />
        <div className="flex flex-col gap-2">
          <p className={ADMIN_MUTED}>{t("defaultText")}</p>
          <p className="type-catalog-field-value text-stone-catalog-ink wrap-anywhere">
            {data[locale].defaults[key]}
          </p>
        </div>
        <p className={ADMIN_MUTED}>{t("saveHint")}</p>
        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={cn(ADMIN_MUTED, !message.ok && "text-[#9b3d33]!")}
          >
            {message.text}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => save(true)}
            className={ADMIN_BUTTON_SECONDARY}
          >
            {t("restore")}
          </button>
          <button type="submit" className={ADMIN_BUTTON_PRIMARY}>
            {t("save")}
          </button>
        </div>
      </form>
      <aside
        aria-label={t("preview")}
        className="col-span-2 flex min-w-0 flex-col gap-4 min-[90rem]:col-span-1 min-[90rem]:pl-8"
      >
        <h2 className="type-catalog-product-title text-stone-catalog-ink">
          {t("preview")}
        </h2>
        <p className={ADMIN_MUTED}>{t("previewHint")}</p>
        <div
          className={cn(ADMIN_CARD, "flex flex-col gap-4 overflow-hidden p-4!")}
        >
          {section === "hero" && (
            <Image
              src="images/hero/scene-1440"
              width={1440}
              height={630}
              sizes="(min-width:1440px) 430px, 740px"
              alt=""
              className="aspect-[1440/630] w-full rounded-xl object-cover"
            />
          )}
          <dl className="flex flex-col gap-4">
            {fields.map((field) => (
              <div key={field} className="flex flex-col gap-1">
                <dt className={ADMIN_MUTED}>{label(field)}</dt>
                <dd className="type-catalog-field-value text-stone-catalog-ink wrap-anywhere">
                  {drafts[locale][field]}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div
          className={cn(
            ADMIN_CARD,
            "flex flex-wrap items-center justify-between gap-3 p-6!",
          )}
        >
          <p className={ADMIN_CARD_TITLE}>{t(dirty ? "unsaved" : "current")}</p>
          <p className={ADMIN_MUTED}>{t("oneField")}</p>
        </div>
        <Link
          href="/"
          locale={locale}
          className={cn(ADMIN_BUTTON_SECONDARY, "self-start")}
        >
          {t("openHome")}
        </Link>
      </aside>
    </fieldset>
  );
}
