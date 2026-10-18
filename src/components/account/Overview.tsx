import Image from "next/image";
import { useTranslations } from "next-intl";

import { Button } from "@/components/buttons/Button";
import type { AccountProduct } from "@/server/account/queries";

import { cn } from "../cn";
import { Icon } from "../icons/Icon";
import { useAccountLabels } from "./labels";
import { Avatar, CARD, CARD_TITLE, DARK_PANEL } from "./parts";

/*
 * Overview blocks: Banner / Selected offers 736:5340, Card / Profile 736:5366 and the bell
 * (Account/Bell button 818:556). Figma Account 1440 736:5318, 1024 736:5449, 768 737:6274, 390 737:6405.
 */

/**
 * Banner / Selected offers: the discounted products of the catalog. Text on the left (eyebrow, Lusitana 40/48
 * title, the first two names, the View offers pill), up to three slabs on the right (two below 1440, as Figma
 * draws them). Below 768 there are none: the Figma 390 banner is 194 px high with `overflow: clip` (737:6427) and its slab row
 * (737:6433, 84 px) lies below the clip, so the screen shows the text only. Hidden by the page when nothing is discounted.
 */
export function OffersBanner({ offers }: { offers: AccountProduct[] }) {
  const t = useTranslations("account.overview.offers");
  const labels = useAccountLabels();
  return (
    <section
      aria-label={t("title")}
      className={cn(
        DARK_PANEL,
        "flex flex-col gap-6 p-(--layout-panel-pad) md:flex-row md:items-center",
      )}
    >
      <div className="flex shrink-0 flex-col items-start gap-2.5">
        <p className="type-section-label text-label uppercase">{t("label")}</p>
        <h2 className="text-primary type-catalog-product-title">
          {t("title")}
        </h2>
        <p className="type-catalog-field-value text-secondary">
          {offers
            .slice(0, 2)
            .map((offer) => labels.name(offer))
            .join(" · ")}
        </p>
        <Button variant="pill" href="/catalog?sale=1" iconRight="arrow">
          {t("cta")}
        </Button>
      </div>
      <ul className="hidden min-w-0 flex-1 list-none items-center gap-3 md:flex">
        {offers.map((offer, index) => (
          <li
            key={offer.slug}
            className={cn(
              "relative h-[84px] min-w-0 flex-1 overflow-clip rounded-xl bg-[rgba(255,255,255,0.07)] md:h-32",
              index === 2 && "hidden min-[90rem]:block",
            )}
          >
            <Image
              src={offer.image}
              alt=""
              fill
              sizes="(min-width: 1440px) 280px, 200px"
              className={
                offer.imageFit === "contain" ? "object-contain" : "object-cover"
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Card / Profile 736:5366: the title, the name and email (with the Milk avatar from 1024) and the Edit profile
 * outline button, which leads to the Profile screen. 320 px wide beside the orders at 1440.
 */
export function ProfileCard({
  name,
  email,
  initials,
  className,
}: {
  name: string;
  email: string;
  initials: string;
  className?: string;
}) {
  const t = useTranslations("account.overview.profile");
  return (
    <section
      aria-label={t("title")}
      className={cn(
        CARD,
        "flex flex-col items-start gap-4 p-(--layout-panel-pad)",
        className,
      )}
    >
      <h2 className={CARD_TITLE}>{t("title")}</h2>
      <div className="flex w-full items-center gap-4">
        <span className="hidden lg:contents">
          <Avatar initials={initials} tone="milk" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="type-catalog-field-value text-stone-catalog-ink wrap-anywhere">
            {name}
          </p>
          <p className="type-catalog-meta text-stone-catalog-secondary wrap-anywhere">
            {email}
          </p>
        </div>
      </div>
      <Button variant="outline" href="/account/profile">
        {t("edit")}
      </Button>
    </section>
  );
}

/**
 * Account/Bell button 818:556: 44 px circle (stone/catalog-card, 1 px ink at 16 %), the bell glyph and the
 * unread dot. Notifications have no screen (owner decision), so it stays inert.
 */
export function BellButton() {
  const t = useTranslations("account");
  return (
    <span
      role="button"
      aria-disabled="true"
      aria-label={t("notifications")}
      className="border-stone-catalog-ink/16 bg-stone-catalog-card text-ink relative hidden size-11 shrink-0 cursor-default items-center justify-center rounded-full border select-none lg:flex"
    >
      <Icon name="bell" />
      <span
        aria-hidden="true"
        className="border-stone-catalog-card bg-ink absolute top-1 right-1 size-3 rounded-full border-2"
      />
    </span>
  );
}
