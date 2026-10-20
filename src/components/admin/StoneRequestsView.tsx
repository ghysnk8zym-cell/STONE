import { useTranslations } from "next-intl";
import { STONE_REQUEST_STATUSES } from "@/features/admin/stone-requests";
import { Link } from "@/i18n/navigation";
import type { AdminStoneRequests } from "@/server/admin/stone-request-queries";
import { cn } from "../cn";
import { ProductImage } from "../account/parts";
import { ReferencePhoto } from "../stone-requests/ReferencePhoto";
import { AdminSearch, AdminSelect } from "./fields";
import { FilterForm } from "./FilterForm";
import {
  ADMIN_BUTTON_SECONDARY,
  ADMIN_CARD,
  ADMIN_CARD_TITLE,
  ADMIN_MUTED,
} from "./parts";
import { StoneRequestEditor } from "./StoneRequestEditor";
import { StoneRequestStatus } from "./StoneRequestStatus";

/** Figma 1077:52818 / 1077:55928: list beside the detail at 1440, stacked at 1024. */
export function StoneRequestsView({ data }: { data: AdminStoneRequests }) {
  const t = useTranslations("admin.createYourStone");
  const query = (page: number, request?: string) => ({
    ...(data.q ? { q: data.q } : {}),
    ...(data.status !== "all" ? { status: data.status } : {}),
    ...(page > 1 ? { page } : {}),
    ...(request ? { request } : {}),
  });
  return (
    <div
      className={cn(
        ADMIN_CARD,
        "flex min-w-0 flex-col overflow-hidden p-0! min-[90rem]:flex-row",
      )}
    >
      <section
        aria-labelledby="stone-requests-list-title"
        className="border-stone-catalog-line flex min-w-0 flex-col gap-4 border-b p-6 min-[90rem]:w-[340px] min-[90rem]:shrink-0 min-[90rem]:border-r min-[90rem]:border-b-0"
      >
        <h2 id="stone-requests-list-title" className={ADMIN_CARD_TITLE}>
          {t("requests")}
        </h2>
        <FilterForm className="flex-col items-stretch">
          <AdminSearch
            name="q"
            label={t("searchLabel")}
            defaultValue={data.q}
            placeholder={t("searchPlaceholder")}
          />
          <AdminSelect
            name="status"
            label={t("filterStatus")}
            value={data.status}
            hideLabel
            options={[
              { value: "all", label: t("all") },
              ...STONE_REQUEST_STATUSES.map((value) => ({
                value,
                label: t(`statuses.${value}`),
              })),
            ]}
          />
        </FilterForm>
        {data.requests.length ? (
          <ul className="flex list-none flex-col">
            {data.requests.map((request) => (
              <li key={request.id}>
                <Link
                  href={{
                    pathname: "/admin/create-your-stone",
                    query: query(data.page, request.id),
                  }}
                  aria-current={
                    data.selected?.id === request.id ? "true" : undefined
                  }
                  className={cn(
                    "border-stone-catalog-line focusv:outline-2 focusv:-outline-offset-2 focusv:outline-ink-primary relative flex items-start gap-3.5 border-b px-4 py-5 outline-0",
                    data.selected?.id === request.id
                      ? "bg-stone-catalog-photo rounded-xl"
                      : "hov:bg-overlay-tint-10",
                  )}
                >
                  {data.selected?.id === request.id && (
                    <span
                      aria-hidden="true"
                      className="bg-stone-catalog-ink absolute top-7 left-0 h-12 w-[3px] rounded-sm"
                    />
                  )}
                  {request.hasPhoto ? (
                    <ReferencePhoto
                      src={`/api/stone-requests/${request.id}/photo`}
                      alt=""
                      className="size-14 shrink-0 rounded-lg"
                    />
                  ) : (
                    request.referenceImage && (
                      <ProductImage
                        image={request.referenceImage}
                        fit="contain"
                        className="size-14 shrink-0 rounded-lg"
                        sizes="56px"
                      />
                    )
                  )}
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="type-catalog-product-name-sm text-stone-catalog-ink">
                      {request.number}
                    </span>
                    <span className="type-catalog-meta text-stone-catalog-ink wrap-anywhere">
                      {request.customer.name}
                    </span>
                    <span className={ADMIN_MUTED}>
                      {t("listDetails", {
                        name: request.name,
                        count: request.quantity,
                      })}
                    </span>
                    <StoneRequestStatus status={request.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className={ADMIN_MUTED}>{t("none")}</p>
        )}
        <p className={ADMIN_MUTED}>{t("count", { count: data.total })}</p>
        {data.pages > 1 && (
          <nav aria-label={t("pagination")} className="flex flex-wrap gap-3">
            {data.page > 1 && (
              <Link
                className={ADMIN_BUTTON_SECONDARY}
                href={{
                  pathname: "/admin/create-your-stone",
                  query: query(data.page - 1),
                }}
              >
                {t("previous")}
              </Link>
            )}
            {data.page < data.pages && (
              <Link
                className={ADMIN_BUTTON_SECONDARY}
                href={{
                  pathname: "/admin/create-your-stone",
                  query: query(data.page + 1),
                }}
              >
                {t("next")}
              </Link>
            )}
            <span className={ADMIN_MUTED}>
              {t("page", { page: data.page, pages: data.pages })}
            </span>
          </nav>
        )}
      </section>
      {data.selected ? (
        <div className="min-w-0 flex-1">
          {!data.requests.some(
            (request) => request.id === data.selected!.id,
          ) && (
            <p className={`${ADMIN_MUTED} px-6 pt-6 min-[90rem]:px-9`}>
              {t("outsideFilter")}
            </p>
          )}
          <StoneRequestEditor key={data.selected.id} request={data.selected} />
        </div>
      ) : (
        <section className="p-9">
          <h2 className={ADMIN_CARD_TITLE}>{t("selectRequest")}</h2>
        </section>
      )}
    </div>
  );
}
