import { useTranslations } from "next-intl";

import { ADMIN_CARD, ADMIN_CARD_TITLE, AdminPageHeader } from "./parts";

/**
 * A section of the admin menu that is built in Phase 4b (Create Your Stone, Customers, Promotions, Site content):
 * the Figma header of the screen (title and sub line) and a card that says it arrives in the next update, so the
 * sidebar never links to a dead page. The page that renders it calls `requireRole("admin")`.
 */
export type ComingSoonSection =
  "createYourStone" | "customers" | "promotions" | "siteContent";

export function AdminComingSoon({ section }: { section: ComingSoonSection }) {
  const t = useTranslations("admin");
  return (
    <>
      <AdminPageHeader
        title={t(`${section}.title`)}
        subtitle={t(`${section}.subtitle`)}
      />
      <section
        aria-labelledby="admin-soon-title"
        className={`${ADMIN_CARD} flex flex-col gap-2`}
      >
        <h2 id="admin-soon-title" className={ADMIN_CARD_TITLE}>
          {t("comingSoon.title")}
        </h2>
        <p className="type-catalog-field-value text-stone-catalog-secondary">
          {t("comingSoon.body")}
        </p>
      </section>
    </>
  );
}
