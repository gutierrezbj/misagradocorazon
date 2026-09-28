// Transparencia (SDD-02, ADR-015): el 20 % y las transferencias salen del libro de movimientos,
// que es de solo inserción. Aquí solo se consulta; las transferencias se registran en Causas.
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api, formatUsd } from "../api.ts";
import { useI18n, type I18nKey } from "../i18n.tsx";
import type { LedgerPage, LedgerType, Transparency as TransparencyData } from "../types.ts";

const TYPES: (LedgerType | "all")[] = ["all", "purchase", "impact_allocation", "transfer"];

function Tile({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div className={`card tile${highlight ? " highlight" : ""}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  );
}

function Movements({ month }: { month: string }) {
  const { t, lang } = useI18n();
  const [type, setType] = useState<LedgerType | "all">("all");
  const q = useInfiniteQuery({
    queryKey: ["ledger", month, type],
    queryFn: ({ pageParam }) =>
      api<LedgerPage>(`/admin/ledger?month=${month}${type === "all" ? "" : `&type=${type}`}${pageParam ? `&cursor=${pageParam}` : ""}`),
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const entries = q.data?.pages.flatMap((p) => p.entries) ?? [];
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  return (
    <section className="card" style={{ marginTop: 20 }}>
      <div className="card-head">
        <h2>{t("transpMovements", { month: monthLabel(month, lang) })}</h2>
        <div className="segmented" role="group" aria-label={t("colType")}>
          {TYPES.map((k) => (
            <button key={k} type="button" aria-pressed={type === k} onClick={() => setType(k)}>
              {k === "all" ? t("ledgerAll") : t(`ledger_${k}` as I18nKey)}
            </button>
          ))}
        </div>
      </div>
      {q.isLoading && <p className="muted">{t("loading")}</p>}
      {q.isError && <p className="error">{t("genericError")}</p>}
      <table className="table">
        <thead>
          <tr>
            <th>{t("colDate")}</th>
            <th>{t("colType")}</th>
            <th>{t("colDetail")}</th>
            <th className="num">{t("colAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{fmt(e.createdAt)}</td>
              <td>{t(`ledger_${e.type}` as I18nKey)}</td>
              <td className="muted">
                {e.candleType ? t(`type_${e.candleType}` as I18nKey) : ""}
                {e.cause ? e.cause[lang] : ""}
                {e.note ? ` · ${e.note}` : ""}
              </td>
              <td className="num">{formatUsd(e.amountCents, lang)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {q.hasNextPage && (
        <button className="btn" type="button" style={{ marginTop: 12 }} disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
          {t("loadMore")}
        </button>
      )}
    </section>
  );
}

function monthLabel(month: string, lang: string) {
  const label = new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function Transparency() {
  const { t, lang } = useI18n();
  const [month, setMonth] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ["admin-transparency"], queryFn: () => api<TransparencyData>("/admin/transparency") });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("transpTitle")}</h1>
          <div className="page-sub">{t("transpSub")}</div>
        </div>
      </div>
      {isLoading && <p className="muted">{t("loading")}</p>}
      {error && <p className="error">{t("genericError")}</p>}
      {data && (
        <>
          <div className="grid tiles">
            <Tile label={t("kpiRevenue")} value={formatUsd(data.totals.revenueCents, lang)} hint={t("kpiSimulated")} />
            <Tile label={t("transpImpact")} value={formatUsd(data.totals.impactCents, lang)} hint={t("kpiSimulated")} />
            <Tile label={t("transpTransferred")} value={formatUsd(data.totals.transferredCents, lang)} />
            <Tile label={t("transpPending")} value={formatUsd(data.pendingCents, lang)} highlight={data.pendingCents > 0} />
          </div>

          <section className="card" style={{ marginTop: 20 }}>
            <div className="card-head">
              <h2>{t("transpByMonth")}</h2>
            </div>
            {data.months.length === 0 ? (
              <p className="muted">{t("transpEmpty")}</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("transpMonth")}</th>
                    <th>{t("transpCause")}</th>
                    <th className="num">{t("kpiRevenue")}</th>
                    <th className="num">{t("transpImpact")}</th>
                    <th className="num">{t("transpTransferred")}</th>
                    <th className="num">{t("transpPending")}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {data.months.map((m) => (
                    <tr key={m.month} aria-selected={month === m.month}>
                      <td>{monthLabel(m.month, lang)}</td>
                      <td>
                        {m.cause ? (
                          <>
                            {m.cause.name[lang]} <span className={`badge ${m.cause.status}`}>{t(`status_${m.cause.status}` as I18nKey)}</span>
                          </>
                        ) : (
                          <span className="muted">{t("transpNoCause")}</span>
                        )}
                      </td>
                      <td className="num">{formatUsd(m.revenueCents, lang)}</td>
                      <td className="num">{formatUsd(m.impactCents, lang)}</td>
                      <td className="num">{formatUsd(m.transferredCents, lang)}</td>
                      <td className="num">{formatUsd(m.pendingCents, lang)}</td>
                      <td className="num">
                        <button className="btn btn-quiet" type="button" onClick={() => setMonth(m.month)}>
                          {t("transpSeeMovements")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
          {month && <Movements key={month} month={month} />}
        </>
      )}
    </>
  );
}
