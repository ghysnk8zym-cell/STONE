import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Button } from "@/components/buttons/Button";
import type { Locale } from "@/i18n/routing";
import { getSession } from "@/server/auth/session";

import { signOutAction } from "../../(auth)/actions";

// Per-request: the page reads the session, `next` and whether a database is configured, none of which exist at
// build time (a prerendered copy would be served from the route cache to everyone).
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/sign-out">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "auth",
  });
  return { title: t("meta.signOut") };
}

/*
 * Art of the Sign out screen (Figma 803:20474 at 1440, 799:20451 at 1920, 803:20527 at 1024, 803:20571 at
 * 768, 803:20615 at 390): the black and the grey marble renders (the catalog photos, byte-identical to
 * images/catalog/black-marble and grey-marble), each rotated 30 degrees, in a box pinned to the bottom left.
 * Figma scales one composition per layout; `--s` is that scale (1 at 1440; 1.3333, 0.8, 0.88 and 0.6667 at
 * 1920, 1024, 768, 390). Sizes and offsets are the 1440 values times `--s`: the black render is 900x600 with its
 * centre at (75, 322.5) inside the 1050x756 box, the grey one 1350x900 centred at (253.5, 710.25).
 */
const ART_SCALE =
  "[--s:0.6667] md:[--s:0.88] lg:[--s:0.8] min-[90rem]:[--s:1] min-[120rem]:[--s:1.3333]";
const ART_SIZES =
  "(min-width: 1440px) 1440px, (min-width: 1024px) 1024px, 768px";

function Art() {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-clip ${ART_SCALE}`}
    >
      <div className="absolute bottom-0 left-0 h-[calc(756px*var(--s))] w-[calc(1050px*var(--s))]">
        <Image
          src="images/catalog/black-marble"
          alt=""
          width={1536}
          height={1024}
          sizes={ART_SIZES}
          className="absolute top-[calc(22.5px*var(--s))] left-[calc(-375px*var(--s))] h-[calc(600px*var(--s))] w-[calc(900px*var(--s))] max-w-none rotate-30 object-cover"
        />
        <Image
          src="images/catalog/grey-marble"
          alt=""
          width={1536}
          height={1024}
          sizes={ART_SIZES}
          className="absolute top-[calc(260.25px*var(--s))] left-[calc(-421.5px*var(--s))] h-[calc(900px*var(--s))] w-[calc(1350px*var(--s))] max-w-none rotate-30 object-cover"
        />
      </div>
    </div>
  );
}

/*
 * Sign-out confirmation (Phase 4a Task 3): "Sign out" ends the session on the server and goes home,
 * "Stay signed in" goes back to the account. Inside the site shell (Figma draws the header). A Guest has
 * nothing to confirm and is sent home. Public on purpose: it only ever ends the caller's own session.
 */
export default async function SignOutPage({
  params,
}: PageProps<"/[locale]/sign-out">) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "auth.signOutPage",
  });

  let signedIn = false;
  try {
    signedIn = (await getSession()) !== null;
  } catch (error) {
    console.error(
      `[auth] sign-out page: session lookup failed (${error instanceof Error ? error.name : "error"})`,
    );
  }
  if (!signedIn) redirect(`/${locale}`);

  return (
    <section
      data-page-surface="catalog"
      className="bg-stone-catalog-page relative flex min-h-[calc(100dvh-72px)] flex-1 flex-col overflow-clip px-4 pt-12 md:px-8 md:pt-16 lg:px-10 lg:pt-30 min-[90rem]:px-20 min-[90rem]:pt-40 min-[120rem]:pt-[200px]"
    >
      <Art />
      <div className="relative flex w-full lg:mx-auto lg:max-w-[1286px] lg:justify-end">
        <div className="flex w-full flex-col items-start gap-6 md:w-[456px] md:gap-8 lg:w-[360px] min-[90rem]:w-[400px] min-[90rem]:gap-10 min-[120rem]:w-[416px]">
          <h1 className="type-sign-out-title text-ink">{t("title")}</h1>
          <div className="flex w-full flex-col gap-4">
            <form action={signOutAction} className="w-full">
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="graphite-solid" className="w-full">
                {t("confirm")}
              </Button>
            </form>
            <Button variant="outline" href="/account" className="w-full">
              {t("stay")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
