import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PageHead } from "@/components/account/PageHead";
import {
  PasswordCard,
  ProfileDetails,
} from "@/components/account/ProfileForms";
import type { Locale } from "@/i18n/routing";
import { requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/account/profile">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "account.meta",
  });
  return { title: t("profile") };
}

/*
 * Profile (Figma Account / Profile 1440 742:16191, 1024 742:16320, 768 742:16440, 390 742:16557): the Personal
 * details card (name editable, email read-only) and, below it, the password card (not in Figma).
 */
export default async function AccountProfilePage({
  params,
}: PageProps<"/[locale]/account/profile">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const user = await requireUser(locale);
  const t = await getTranslations("account.profile");

  return (
    <>
      <PageHead title={t("title")} subtitle={t("subtitle")} />
      <ProfileDetails name={user.name} email={user.email} />
      <PasswordCard />
    </>
  );
}
