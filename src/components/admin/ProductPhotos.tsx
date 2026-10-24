"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { prepareProductPhoto } from "@/features/admin/prepare-product-photo";
import {
  PRODUCT_PHOTO_ACCEPT,
  ProductPhotoError,
} from "@/features/admin/product-photo-input";
import { parseProductMedia, PRODUCT_PHOTO_LIMIT } from "@/lib/product-media";
import { ProductImage } from "../account/parts";
import { Icon } from "../icons/Icon";
import { ADMIN_BUTTON_SECONDARY } from "./parts";
import { AdminSelect } from "./fields";
import type { ImageOption } from "./ProductForm";

type Props = {
  photos: string[];
  options: ImageOption[];
  disabled: boolean;
  onChange(photos: string[]): void;
  onBusy(busy: boolean): void;
};

export function ProductPhotos({
  photos,
  options,
  disabled,
  onChange,
  onBusy,
}: Props) {
  const t = useTranslations("admin.form.upload");
  const [asset, setAsset] = useState(options[0]?.value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");
  const fit = (image: string) =>
    options.find((option) => option.value === image)?.fit ?? "contain";

  async function upload(files: File[]) {
    setError(null);
    if (photos.length + files.length > PRODUCT_PHOTO_LIMIT) {
      setError(t("limit"));
      return;
    }
    if (!files.length) return;
    setBusy(true);
    onBusy(true);
    const next = [...photos];
    let failed = false;
    for (let index = 0; index < files.length; index++) {
      setProgress(t("preparing", { current: index + 1, total: files.length }));
      try {
        const body = await prepareProductPhoto(files[index]);
        setProgress(t("progress", { current: index + 1, total: files.length }));
        const response = await fetch("/api/admin/product-images", {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body,
        });
        if (!response.ok) {
          setError(
            t(
              response.status === 503
                ? "unavailable"
                : response.status === 404
                  ? "session"
                  : "file",
            ),
          );
          failed = true;
          break;
        }
        const result = await response.json();
        if (
          typeof result.image !== "string" ||
          !parseProductMedia(result.image)
        )
          throw new Error("response");
        next.push(result.image);
        onChange([...next]);
      } catch (error) {
        setError(t(error instanceof ProductPhotoError ? error.code : "retry"));
        failed = true;
        break;
      }
    }
    setProgress(failed ? "" : t("ready"));
    setBusy(false);
    onBusy(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {photos[0] ? (
        <ProductImage
          image={photos[0]}
          fit={fit(photos[0])}
          className="aspect-[411/400] w-full rounded-xl"
          sizes="(min-width: 1440px) 411px, 60vw"
        />
      ) : (
        <div className="bg-stone-catalog-photo text-stone-catalog-secondary flex aspect-[411/400] items-center justify-center rounded-xl p-6 text-center">
          {t("empty")}
        </div>
      )}
      <label className="type-catalog-meta text-stone-catalog-ink flex flex-col gap-2">
        <span>{t("choose")}</span>
        <input
          type="file"
          accept={PRODUCT_PHOTO_ACCEPT}
          multiple
          disabled={disabled || busy || photos.length >= PRODUCT_PHOTO_LIMIT}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            event.target.value = "";
            void upload(files);
          }}
          className="border-stone-catalog-line file:bg-stone-catalog-photo focus-visible:outline-ink-primary w-full min-w-0 rounded-xl border p-3 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:px-3 file:py-2 disabled:opacity-50"
          aria-describedby="product-photo-hint"
        />
      </label>
      <p
        id="product-photo-hint"
        className="type-footer-small text-stone-catalog-secondary"
      >
        {t("hint")}
      </p>
      <p
        role="status"
        aria-live="polite"
        className="type-footer-small text-stone-catalog-secondary"
      >
        {progress}
      </p>
      {error && (
        <p role="alert" className="type-footer-small text-[#9b3d33]">
          {error}
        </p>
      )}
      <ol className="flex flex-col gap-3" aria-label={t("list")}>
        {photos.map((image, index) => (
          <li
            key={image}
            className="border-stone-catalog-line flex items-center gap-3 border-b pb-3"
          >
            <ProductImage
              image={image}
              fit={fit(image)}
              className="size-16 shrink-0"
              sizes="64px"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="type-catalog-meta text-stone-catalog-ink">
                {index === 0 ? t("main") : t("number", { number: index + 1 })}
              </span>
              <div className="flex flex-wrap gap-2">
                {index > 0 && (
                  <button
                    type="button"
                    disabled={disabled || busy}
                    onClick={() =>
                      onChange([
                        image,
                        ...photos.filter((photo) => photo !== image),
                      ])
                    }
                    className="type-footer-small focusv:outline-ink-primary min-h-11 cursor-pointer rounded px-2 underline disabled:opacity-40"
                  >
                    {t("makeMain")}
                  </button>
                )}
                <button
                  type="button"
                  disabled={disabled || busy}
                  aria-label={t("removeLabel", { number: index + 1 })}
                  onClick={() =>
                    onChange(photos.filter((photo) => photo !== image))
                  }
                  className="type-footer-small focusv:outline-ink-primary min-h-11 cursor-pointer rounded px-2 underline disabled:opacity-40"
                >
                  {t("remove")}
                </button>
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              {[-1, 1].map((direction) => (
                <button
                  key={direction}
                  type="button"
                  disabled={
                    disabled ||
                    busy ||
                    index + direction < 0 ||
                    index + direction >= photos.length
                  }
                  aria-label={t(direction < 0 ? "earlier" : "later", {
                    number: index + 1,
                  })}
                  onClick={() => {
                    const next = [...photos];
                    [next[index], next[index + direction]] = [
                      next[index + direction],
                      next[index],
                    ];
                    onChange(next);
                  }}
                  className="focusv:outline-ink-primary flex size-11 cursor-pointer items-center justify-center rounded-lg disabled:cursor-default disabled:opacity-30"
                >
                  <Icon
                    name="arrow"
                    className={
                      direction < 0 ? "size-4 -rotate-90" : "size-4 rotate-90"
                    }
                  />
                </button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-3">
        <AdminSelect
          label={t("existing")}
          name="existing-image"
          value={asset}
          options={options}
          onChange={setAsset}
        />
        <button
          type="button"
          disabled={
            disabled ||
            busy ||
            photos.length >= PRODUCT_PHOTO_LIMIT ||
            photos.includes(asset)
          }
          className={ADMIN_BUTTON_SECONDARY}
          onClick={() => {
            setError(null);
            onChange([...photos, asset]);
          }}
        >
          {t("addExisting")}
        </button>
      </div>
    </div>
  );
}
