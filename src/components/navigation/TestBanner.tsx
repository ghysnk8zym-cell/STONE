import { useTranslations } from "next-intl";

/*
 * Test shop marker (docs/superpowers/specs/2026-10-19-test-shop-cart-checkout-design.md): one thin line above
 * every shell, not dismissible. No Figma frame: tokens only (surface/page fill, text/secondary on it is about
 * 11:1, the 12/16 footer-small type), so it stays calm on the dark and the light catalog pages alike.
 */
export function TestBanner() {
  const t = useTranslations("testBanner");
  return (
    <p
      role="note"
      data-test-banner
      className="bg-surface-page text-secondary type-footer-small border-glass w-full border-b px-4 py-1.5 text-center"
    >
      {t("text")}
    </p>
  );
}
