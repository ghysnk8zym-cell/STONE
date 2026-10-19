"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/buttons/Button";
import { useRouter } from "@/i18n/navigation";
import { LIMITS } from "@/lib/calculator";

import { cart } from "./cart-store";

/**
 * Product page "Buy now" / "Add to cart" (Figma Product 782:11526: the graphite-solid and outline pills under the
 * calculator). Both add the calculator's ORDER area (surface + 10 %) to the cart; "Buy now" then opens the cart.
 * Disabled while the calculator input is invalid (`areaHundredths` null). The polite status line confirms an add.
 */
export function CartButtons({
  slug,
  areaHundredths,
}: {
  slug: string;
  areaHundredths: number | null;
}) {
  const t = useTranslations("pages.product");
  const c = useTranslations("cart");
  const format = useFormatter();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const disabled = areaHundredths === null;

  const add = (): boolean => {
    if (areaHundredths === null) return false;
    const result = cart.add({ slug, areaHundredths });
    if (result !== "added") {
      setMessage(
        result === "full"
          ? c("full")
          : c("tooLarge", { max: format.number(LIMITS.area[1]) }),
      );
      return false;
    }
    setMessage(
      c("added", {
        area: format.number(areaHundredths / 100, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
      }),
    );
    return true;
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="graphite-solid"
        className="w-full"
        disabled={disabled}
        onClick={() => {
          if (add()) router.push("/cart");
        }}
      >
        {t("buyNow")}
      </Button>
      <Button
        variant="outline"
        className="w-full"
        disabled={disabled}
        onClick={add}
      >
        {t("addToCart")}
      </Button>
      <p
        role="status"
        className="type-catalog-meta text-stone-catalog-secondary min-h-5"
      >
        {message}
      </p>
    </div>
  );
}
