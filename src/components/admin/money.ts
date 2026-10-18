import { useFormatter } from "next-intl";

/**
 * Integer cents as a USD amount on the admin screens ("$18,750" / "18 750 $"; whole dollars unless the
 * amount has cents). `compact` always drops the cents (chart labels). Works in server and client components.
 */
export function useAdminMoney() {
  const format = useFormatter();
  return (cents: number, options: { compact?: boolean } = {}): string => {
    const whole = options.compact || cents % 100 === 0;
    return format.number(cents / 100, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: whole ? 0 : 2,
    });
  };
}
