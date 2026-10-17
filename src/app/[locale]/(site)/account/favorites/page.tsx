import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FavoritesEmpty, FavoritesGrid } from "@/components/account/Favorites";
import { toFavoriteItems } from "@/components/account/favorite-items";
import { PageHead } from "@/components/account/PageHead";
import type { Locale } from "@/i18n/routing";
import { listFavorites } from "@/server/account/queries";
import { requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/favorites">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "account.meta",
  });
  return { title: t("favorites") };
}

/*
 * Favorites (Figma Account / Favorites 1440 742:11470, 1024 742:11703, 768 742:11927, 390 742:12144): the saved
 * products as cards, 3 per row from 768 and 2 on phones. The heart removes a favourite (owner spec).
 */
export default async function AccountFavoritesPage({
  params,
}: PageProps<"/[locale]/account/favorites">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireUser(locale);
  const t = await getTranslations("account.favorites");
  const items = await toFavoriteItems(await listFavorites(user.id, locale));

  return (
    <>
      <PageHead title={t("title")} subtitle={t("subtitle")} />
      {items.length === 0 ? (
        <FavoritesEmpty />
      ) : (
        <FavoritesGrid items={items} />
      )}
    </>
  );
}
