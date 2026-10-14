import { useTranslations } from "next-intl";

import { Breadcrumb } from "@/components/navigation/Breadcrumb";
import { LanguageSwitch } from "@/components/navigation/LanguageSwitch";
import { NavPill } from "@/components/navigation/NavPill";
import { SiteFooter } from "@/components/navigation/SiteFooter";
import { SiteHeader } from "@/components/navigation/SiteHeader";
import { TabBar } from "@/components/navigation/TabBar";

import { MobileMenuDemo } from "../MobileMenuDemo";
import { Example, Group, PhotoFrame, Section } from "../parts";

/* Styleguide-only destinations: Figma defines none for the footer links (the real footer renders unknown ones disabled). */
const FOOTER_LINKS = { information: "/", about: "/", reviews: "/" } as const;
const FOOTER_SOCIAL = { TG: "/", VK: "/", IG: "/", WA: "/" } as const;

export function Navigation() {
  const t = useTranslations("styleguide");
  const n = useTranslations("styleguide.navigation");
  const nav = useTranslations("components.nav");
  const crumbs = useTranslations("styleguide.navigation.crumbs");
  const states = {
    default: t("states.default"),
    hover: t("states.hover"),
    focus: t("states.focus"),
    pressed: t("states.pressed"),
    disabled: t("states.disabled"),
    current: t("states.current"),
    none: t("states.none"),
  };

  return (
    <Section
      id="navigation"
      title={t("sections.navigation")}
      intro={t("statesNote")}
    >
      <div className="flex flex-col gap-12">
        <Group title={n("header")} stack>
          {/* The layout switches by viewport width (Tailwind xl), so each one is visible only where it applies. */}
          <div className="hidden xl:block">
            <Example
              data-qa="site-header-desktop"
              caption={n("headerDesktop")}
              bleed
            >
              <PhotoFrame>
                <SiteHeader current="create" />
              </PhotoFrame>
            </Example>
          </div>
          <div className="xl:hidden">
            <Example
              data-qa="site-header-compact"
              caption={n("headerCompact")}
              bleed
            >
              <PhotoFrame>
                <SiteHeader />
              </PhotoFrame>
            </Example>
          </div>
        </Group>

        <Group title={n("mobileMenu")}>
          <Example data-qa="mobile-menu-trigger" caption={n("mobileMenuNote")}>
            <MobileMenuDemo />
          </Example>
        </Group>

        <Group title={n("pill")}>
          <Example data-qa="nav-pill-default" caption={states.default}>
            <NavPill href="/">{nav("cart")}</NavPill>
          </Example>
          <Example data-qa="nav-pill-hover" caption={states.hover}>
            <NavPill href="/" state="hover">
              {nav("cart")}
            </NavPill>
          </Example>
          <Example data-qa="nav-pill-focus" caption={states.focus}>
            <NavPill href="/" state="focus">
              {nav("cart")}
            </NavPill>
          </Example>
          <Example data-qa="nav-pill-pressed" caption={states.pressed}>
            <NavPill href="/" state="pressed">
              {nav("cart")}
            </NavPill>
          </Example>
          <Example data-qa="nav-pill-current" caption={states.current}>
            <NavPill href="/" current>
              {nav("cart")}
            </NavPill>
          </Example>
          <Example data-qa="nav-pill-disabled" caption={states.disabled}>
            <NavPill href="/" disabled>
              {nav("cart")}
            </NavPill>
          </Example>
          <Example data-qa="nav-pill-long-label" caption={n("pillLong")}>
            <NavPill href="/">{nav("createYourStone")}</NavPill>
          </Example>
        </Group>

        <Group title={n("languageSwitch")}>
          <Example data-qa="language-switch" caption={states.default}>
            <LanguageSwitch />
          </Example>
        </Group>

        <Group title={n("tabBar")} stack>
          {/* TabBar is hidden from 768 px (md), so these two exist on phones only. */}
          <div className="md:hidden">
            <Example
              data-qa="tab-bar-current-catalog"
              caption={n("tabBarCurrent")}
              bleed
            >
              <PhotoFrame className="mx-auto h-[100px] max-w-[390px]">
                <TabBar current="catalog" />
              </PhotoFrame>
            </Example>
          </div>
          {/* inert: a visual-only copy, so the page keeps one "Mobile navigation" landmark (and no duplicate tab stops). */}
          <div inert className="md:hidden">
            <Example data-qa="tab-bar-none" caption={states.none} bleed>
              <PhotoFrame className="mx-auto h-[100px] max-w-[390px]">
                <TabBar />
              </PhotoFrame>
            </Example>
          </div>
        </Group>

        <Group title={n("footer")} stack>
          <Example data-qa="site-footer" caption={states.default} bleed>
            <PhotoFrame>
              <SiteFooter
                links={FOOTER_LINKS}
                privacyHref="/"
                social={FOOTER_SOCIAL}
              />
            </PhotoFrame>
          </Example>
        </Group>

        <Group title={n("breadcrumb")}>
          <Example
            data-qa="breadcrumb-default"
            caption={n("breadcrumbDefault")}
            tone="light"
          >
            <Breadcrumb
              items={[
                { label: crumbs("home"), href: "/" },
                { label: crumbs("catalog"), href: "/" },
                { label: crumbs("product") },
              ]}
            />
          </Example>
          <Example
            data-qa="breadcrumb-long"
            caption={n("breadcrumbLong")}
            tone="light"
          >
            {/* inert: visual-only copy, so the page keeps one "Breadcrumb" landmark. */}
            <div inert className="w-[342px] max-w-full">
              <Breadcrumb
                items={[
                  { label: crumbs("home"), href: "/" },
                  { label: crumbs("catalog"), href: "/" },
                  { label: crumbs("collection"), href: "/" },
                  { label: crumbs("finish") },
                ]}
              />
            </div>
          </Example>
        </Group>
      </div>
    </Section>
  );
}
