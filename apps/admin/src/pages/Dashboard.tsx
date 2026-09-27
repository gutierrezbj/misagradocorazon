import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api, formatNumber, formatUsd } from "../api.ts";
import { BarList, ColumnChart, DataTable } from "../components/charts.tsx";
import { useI18n, type I18nKey } from "../i18n.tsx";
import type { Goal, Kpis } from "../types.ts";

const RANGES = [7, 30, 90] as const;

function Tile({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div className={`card tile${highlight ? " highlight" : ""}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {hint && <div className="tile-hint">{hint}</div>}
    </div>
  );
}

const pctText = (v: number | null) => (v === null ? "—" : `${v} %`);

export function Dashboard() {
  const { t, lang } = useI18n();
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const [tableView, setTableView] = useState(false);
  const { data: k, isLoading, error } = useQuery({ queryKey: ["kpis", days], queryFn: () => api<Kpis>(`/admin/kpis?days=${days}`) });

  const shortDay = (iso: string) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("dashTitle")}</h1>
          <div className="page-sub">{t("dashSub")}</div>
        </div>
        <div className="segmented" role="group" aria-label={t("lastDays", { n: days })}>
          {RANGES.map((r) => (
            <button key={r} type="button" aria-pressed={days === r} onClick={() => setDays(r)}>
              {t("lastDays", { n: r })}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="muted">{t("loading")}</p>}
      {error && <p className="error">{t("genericError")}</p>}

      {k && (
        <div className="stack" style={{ gap: 20 }}>
          <div className="grid tiles">
            <Tile label={t("kpiUsers")} value={formatNumber(k.users.total, lang)} hint={t("kpiNew", { n: k.users.new })} />
            <Tile label={t("kpiMau")} value={formatNumber(k.active.mau, lang)} hint={t("kpiDauWau", { d: k.active.dau, w: k.active.wau })} />
            <Tile label={t("kpiD7")} value={pctText(k.retention.d7.rate)} hint={t("kpiCohort", { n: k.retention.d7.cohort })} />
            <Tile label={t("kpiD30")} value={pctText(k.retention.d30.rate)} hint={t("kpiCohort", { n: k.retention.d30.cohort })} />
            <Tile label={t("kpiCandles")} value={formatNumber(k.candles.total, lang)} hint={t("lastDays", { n: k.windowDays })} />
            <Tile label={t("kpiConversion")} value={pctText(k.candles.conversionRate)} hint={t("kpiConversionHint", { n: k.candles.buyers })} />
            <Tile label={t("kpiRevenue")} value={formatUsd(k.money.revenueCents, lang)} hint={k.money.simulated ? t("kpiSimulated") : undefined} />
            <Tile label={t("kpiImpact")} value={formatUsd(k.money.impactCents, lang)} hint={k.money.simulated ? t("kpiSimulated") : undefined} />
            <Tile label={t("kpiVoting")} value={pctText(k.voting.participationRate)} hint={t("kpiVotes", { n: k.voting.votes, m: k.voting.month })} />
            <Tile
              label={t("kpiMass")}
              value={k.mass ? formatNumber(k.mass.attendees, lang) : "—"}
              hint={k.mass ? t("kpiMassHint", { n: k.mass.chatParticipants }) : undefined}
            />
            <Tile label={t("kpiPending")} value={formatNumber(k.moderation.pending, lang)} highlight={k.moderation.pending > 0} />
          </div>

          <Goals goals={k.goals} simulated={k.money.simulated} />

          <div className="grid two-col">
            <section className="card">
              <div className="card-head">
                <h2>{t("chartCandlesByDay")}</h2>
                <button className="btn btn-quiet" type="button" onClick={() => setTableView((v) => !v)}>
                  {tableView ? t("showChart") : t("showTable")}
                </button>
              </div>
              {tableView ? (
                <DataTable
                  columns={[
                    { key: "day", label: t("colDay") },
                    { key: "candles", label: t("colCandles"), num: true },
                    { key: "active", label: t("colActive"), num: true },
                  ]}
                  rows={k.daily.map((d) => ({ day: shortDay(d.day), candles: d.candles, active: d.activeUsers }))}
                />
              ) : (
                <>
                  <ColumnChart
                    ariaLabel={t("chartCandlesByDay")}
                    data={k.daily.map((d) => ({
                      label: shortDay(d.day),
                      value: d.candles,
                      tooltip: `${shortDay(d.day)} · ${d.candles} ${t("colCandles").toLowerCase()}`,
                    }))}
                  />
                  <h2 style={{ margin: "20px 0 10px" }}>{t("chartActiveByDay")}</h2>
                  <ColumnChart
                    ariaLabel={t("chartActiveByDay")}
                    data={k.daily.map((d) => ({
                      label: shortDay(d.day),
                      value: d.activeUsers,
                      tooltip: `${shortDay(d.day)} · ${d.activeUsers} ${t("colActive").toLowerCase()}`,
                    }))}
                  />
                </>
              )}
            </section>
            <div className="stack" style={{ gap: 16 }}>
              <section className="card">
                <div className="card-head">
                  <h2>{t("chartByType")}</h2>
                </div>
                <BarList
                  ariaLabel={t("chartByType")}
                  data={k.candles.byType.map((b) => ({ label: t(`type_${b.type}` as I18nKey), value: b.candles }))}
                />
              </section>
              <section className="card">
                <div className="card-head">
                  <h2>{t("chartBySaint")}</h2>
                </div>
                <BarList ariaLabel={t("chartBySaint")} data={k.candles.bySaint.map((s) => ({ label: s.name, value: s.candles }))} />
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Objetivos del MVP (especificación §10) frente a los últimos 30 días.
function Goals({ goals, simulated }: { goals: Goal[]; simulated: boolean }) {
  const { t, lang } = useI18n();
  const fmt = (v: number, unit: Goal["unit"]) =>
    unit === "pct" ? `${v} %` : unit === "usdCents" ? formatUsd(v, lang) : formatNumber(v, lang);
  return (
    <section className="card">
      <div className="card-head">
        <div>
          <h2>{t("goalsTitle")}</h2>
          <div className="muted">{t("goalsSub")}</div>
        </div>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>{t("colMetric")}</th>
            <th className="num">{t("colLast30")}</th>
            <th className="num">{t("colTarget3")}</th>
            <th className="num">{t("colTarget6")}</th>
            <th>{t("colProgress")}</th>
          </tr>
        </thead>
        <tbody>
          {goals.map((g) => {
            const progress = g.value === null ? null : Math.min(100, Math.round((g.value / g.target.m3) * 100));
            return (
              <tr key={g.key}>
                <td>
                  {t(`goal_${g.key}` as I18nKey)}
                  {g.unit === "usdCents" && simulated && <div className="muted">{t("kpiSimulated")}</div>}
                  {g.key === "downloads" && <div className="muted">{t("goalInStoresHint")}</div>}
                </td>
                <td className="num">{g.value === null ? (g.key === "downloads" ? t("goalInStores") : "—") : fmt(g.value, g.unit)}</td>
                <td className="num">{fmt(g.target.m3, g.unit)}</td>
                <td className="num">{fmt(g.target.m6, g.unit)}</td>
                <td style={{ minWidth: 160 }}>
                  {progress !== null && (
                    <div className="hbar-row" style={{ gridTemplateColumns: "1fr auto", padding: 0 }}>
                      <div className="hbar-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                        <div className="hbar-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="hbar-value">{progress} %</span>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
