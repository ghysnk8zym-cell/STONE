import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StoneRequestsSummary as Summary } from "@/server/admin/stone-request-queries";
import {
  ADMIN_BUTTON_SECONDARY,
  ADMIN_BUTTON_PRIMARY,
  ADMIN_CARD,
  ADMIN_CARD_TITLE,
  ADMIN_MUTED,
} from "./parts";
import { StoneRequestStatus } from "./StoneRequestStatus";

export function StoneRequestsSummary({ summary }: { summary: Summary }) {
  const t = useTranslations("admin.createYourStone");
  return (
    <section
      aria-labelledby="overview-requests-title"
      className={`${ADMIN_CARD} flex min-w-0 flex-col gap-5`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="overview-requests-title" className={ADMIN_CARD_TITLE}>
            {t("title")}
          </h2>
          <p className={ADMIN_MUTED}>
            {t("demoCount", { count: summary.total })}
          </p>
        </div>
        <Link
          className={ADMIN_BUTTON_SECONDARY}
          href="/admin/create-your-stone"
        >
          {t("viewAll")}
        </Link>
      </div>
      {summary.requests.length ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className={`${ADMIN_MUTED} bg-stone-catalog-photo`}>
                {[
                  "requestColumn",
                  "customer",
                  "details",
                  "status",
                  "actions",
                ].map((key) => (
                  <th
                    key={key}
                    scope="col"
                    className="px-3 py-3 font-normal first:rounded-l-lg last:rounded-r-lg"
                  >
                    {t(key as "customer")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summary.requests.map((request) => (
                <tr
                  key={request.id}
                  className="border-stone-catalog-line type-catalog-meta text-stone-catalog-ink border-b last:border-b-0"
                >
                  <th
                    scope="row"
                    className="type-catalog-product-name-sm px-3 py-4 font-normal whitespace-nowrap"
                  >
                    {request.number}
                  </th>
                  <td className="max-w-44 px-3 py-4 wrap-anywhere">
                    {request.customer.name}
                  </td>
                  <td className="px-3 py-4">
                    {request.name}
                    <br />
                    <span className={ADMIN_MUTED}>
                      {t("pieces", { count: request.quantity })}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <StoneRequestStatus status={request.status} />
                  </td>
                  <td className="py-4 pl-3">
                    <Link
                      className={
                        request.status === "new"
                          ? ADMIN_BUTTON_PRIMARY
                          : ADMIN_BUTTON_SECONDARY
                      }
                      href={{
                        pathname: "/admin/create-your-stone",
                        query: { q: request.number, request: request.id },
                      }}
                    >
                      {t(
                        request.status === "new"
                          ? "prepareQuote"
                          : request.status === "draft_quote"
                            ? "reviewDraft"
                            : "viewProposal",
                      )}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={ADMIN_MUTED}>{t("none")}</p>
      )}
      <p className={ADMIN_MUTED}>{t("deliveryUnavailable")}</p>
    </section>
  );
}
