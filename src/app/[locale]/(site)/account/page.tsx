import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { FavoritesBlock, FavoritesStrip } from "@/components/account/Favorites";
import { toFavoriteItems } from "@/components/account/favorite-items";
import {
  AllOrdersRow,
  CurrentOrderCard,
  OrdersBlock,
} from "@/components/account/Orders";
import {
  BellButton,
  OffersBanner,
  ProfileCard,
} from "@/components/account/Overview";
import { PageHead } from "@/components/account/PageHead";
import {
  displayNameOf,
  firstNameOf,
  initialsOf,
} from "@/features/account/display";
import type { Locale } from "@/i18n/routing";
import { getAccountOverview } from "@/server/account/queries";
import { requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "account.meta",
  });
  return { title: t("overview") };
}

/*
 * Overview (Figma Account 1440 736:5318, 1024 736:5449, 768 737:6274, 390 737:6405). From 1024: the title row with
 * the bell, the Selected offers banner, the My orders block (beside the 320 px Profile card at 1440, above
 * it at 1024) and the Favorites block. Below 1024 the sidebar becomes the "Account sections" menu, My orders
 * becomes the Current order card (beside Profile from 768), followed by the All orders row and the Your favorites strip.
 * The page guards itself: the layout guard is not enough (see the layout).
 */
export default async function AccountOverviewPage({
  params,
}: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireUser(locale);
  const t = await getTranslations("account.overview");
  const overview = await getAccountOverview(user.id, locale);
  const current =
    overview.orders.find((order) => order.status === "in_progress") ??
    overview.orders[0];
  const favorites = await toFavoriteItems(overview.favorites);

  return (
    <>
      <PageHead
        title={t("title")}
        subtitle={t("welcome", { name: firstNameOf(user) })}
        trailing={<BellButton />}
      />
      {overview.offers.length > 0 ? (
        <OffersBanner offers={overview.offers} />
      ) : null}
      <div className="flex flex-col gap-(--layout-card-gap) md:flex-row lg:flex-col min-[90rem]:flex-row">
        <OrdersBlock
          orders={overview.orders}
          className="hidden lg:flex min-[90rem]:min-w-0 min-[90rem]:flex-1"
        />
        <CurrentOrderCard order={current} className="md:flex-1 lg:hidden" />
        <ProfileCard
          name={displayNameOf(user)}
          email={user.email}
          initials={initialsOf(user)}
          className="md:flex-1 lg:w-full lg:flex-none min-[90rem]:w-[320px]"
        />
      </div>
      <AllOrdersRow className="lg:hidden" />
      <FavoritesBlock items={favorites} className="hidden lg:flex" />
      <FavoritesStrip items={favorites} className="lg:hidden" />
    </>
  );
}
