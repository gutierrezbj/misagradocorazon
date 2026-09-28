import type { LiturgicalSeason } from "@msc/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api } from "../api.ts";
import { MediaField } from "../components/MediaField.tsx";
import { useI18n, type I18nKey } from "../i18n.tsx";
import type { AdminSaint, DailyDay, DailyRow } from "../types.ts";

const TEXT_FIELDS = [
  "gospelEs",
  "gospelEn",
  "meditationEs",
  "meditationEn",
  "morningPrayerEs",
  "morningPrayerEn",
  "nightPrayerEs",
  "nightPrayerEn",
] as const;
const AUDIO_FIELDS = [
  "morningAudioUrlEs",
  "morningAudioUrlEn",
  "nightAudioUrlEs",
  "nightAudioUrlEn",
  "meditationAudioUrlEs",
  "meditationAudioUrlEn",
] as const;
type Form = Record<(typeof TEXT_FIELDS)[number] | (typeof AUDIO_FIELDS)[number] | "gospelRef" | "saintOfDayId", string>;

const blank = (): Form =>
  Object.fromEntries(["gospelRef", "saintOfDayId", ...TEXT_FIELDS, ...AUDIO_FIELDS].map((k) => [k, ""])) as Form;
const toForm = (row: DailyRow | null): Form => {
  const f = blank();
  if (!row) return f;
  for (const k of Object.keys(f) as (keyof Form)[]) f[k] = (row[k] as string | null) ?? "";
  return f;
};

type DayProps = { date: string; season: LiturgicalSeason; saints: AdminSaint[]; onSaved: () => void };

function DayEditor({ date, season, saints, onSaved }: DayProps) {
  const { t } = useI18n();
  const { data, isLoading } = useQuery({ queryKey: ["daily", date], queryFn: () => api<DailyRow | null>(`/admin/daily/${date}`) });
  if (isLoading) return <p className="muted">{t("loading")}</p>;
  return <DayForm key={date} date={date} season={season} initial={toForm(data ?? null)} saints={saints} onSaved={onSaved} />;
}

function DayForm({ date, season, initial, saints, onSaved }: DayProps & { initial: Form }) {
  const { t } = useI18n();
  const [f, setF] = useState<Form>(initial);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  // Oración propia del día (US-10): sin texto propio se reza la del tiempo, con su audio.
  const own = { morning: !!(f.morningPrayerEs.trim() || f.morningPrayerEn.trim()), night: !!(f.nightPrayerEs.trim() || f.nightPrayerEn.trim()) };
  const save = useMutation({
    mutationFn: () =>
      api(`/admin/daily/${date}`, {
        method: "PUT",
        body: {
          ...f,
          saintOfDayId: f.saintOfDayId || null,
          ...Object.fromEntries(AUDIO_FIELDS.map((k) => [k, f[k] || null])),
          ...(!own.morning && { morningAudioUrlEs: null, morningAudioUrlEn: null }),
          ...(!own.night && { nightAudioUrlEs: null, nightAudioUrlEn: null }),
        },
      }),
    onSuccess: onSaved,
  });
  const audio = (k: (typeof AUDIO_FIELDS)[number], label: I18nKey) => (
    <MediaField label={t(label)} kind="audio" value={f[k]} onChange={(v) => setF({ ...f, [k]: v })} testId={`daily-${k}`} />
  );

  return (
    <form
      className="card"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 style={{ marginBottom: 14 }}>{t("dayOf", { date })}</h2>
      <div className="form-grid">
        <label className="field">
          {t("saintOfDay")}
          <select value={f.saintOfDayId} onChange={set("saintOfDayId")}>
            <option value="">{t("noSaint")}</option>
            {saints.filter((s) => !s.deletedAt).map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="field">{t("gospelRef")}<input required placeholder="Jn 15, 9-17" value={f.gospelRef} onChange={set("gospelRef")} /></label>
      </div>

      <h3 className="section-label">{t("gospel")}</h3>
      <div className="form-grid">
        <label className="field">{t("textEs")}<textarea required value={f.gospelEs} onChange={set("gospelEs")} /></label>
        <label className="field">{t("textEn")}<textarea required value={f.gospelEn} onChange={set("gospelEn")} /></label>
      </div>

      <h3 className="section-label">{t("meditationLabel")}</h3>
      <div className="form-grid">
        <label className="field">{t("textEs")}<textarea required value={f.meditationEs} onChange={set("meditationEs")} /></label>
        <label className="field">{t("textEn")}<textarea required value={f.meditationEn} onChange={set("meditationEn")} /></label>
        {audio("meditationAudioUrlEs", "audioEsOptional")}
        {audio("meditationAudioUrlEn", "audioEnOptional")}
      </div>

      <h3 className="section-label">{t("morningPrayerLabel")}</h3>
      <p className="muted" style={{ marginTop: 0 }}>{t("ownPrayerHint", { season: t(`season_${season}`) })}</p>
      <div className="form-grid">
        <label className="field">{t("textEs")}<textarea required={own.morning} value={f.morningPrayerEs} onChange={set("morningPrayerEs")} /></label>
        <label className="field">{t("textEn")}<textarea required={own.morning} value={f.morningPrayerEn} onChange={set("morningPrayerEn")} /></label>
        {own.morning && audio("morningAudioUrlEs", "audioEs")}
        {own.morning && audio("morningAudioUrlEn", "audioEn")}
      </div>

      <h3 className="section-label">{t("nightPrayerLabel")}</h3>
      <p className="muted" style={{ marginTop: 0 }}>{t("ownPrayerHint", { season: t(`season_${season}`) })}</p>
      <div className="form-grid">
        <label className="field">{t("textEs")}<textarea required={own.night} value={f.nightPrayerEs} onChange={set("nightPrayerEs")} /></label>
        <label className="field">{t("textEn")}<textarea required={own.night} value={f.nightPrayerEn} onChange={set("nightPrayerEn")} /></label>
        {own.night && audio("nightAudioUrlEs", "audioEs")}
        {own.night && audio("nightAudioUrlEn", "audioEn")}
      </div>

      {save.isError && <p className="error">{t("genericError")}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={save.isPending}>{t("save")}</button>
        {save.isSuccess && <span className="muted" style={{ alignSelf: "center" }}>{t("saved")}</span>}
      </div>
    </form>
  );
}

const Pills = ({ v }: { v: { es: boolean; en: boolean } }) => (
  <>
    <span className={`pill ${v.es ? "on" : ""}`}>ES</span>
    <span className={`pill ${v.en ? "on" : ""}`}>EN</span>
  </>
);

// Oración que verá el fiel: la propia del día no se marca; la del tiempo o su ausencia, sí.
function Source({ s }: { s: "day" | "season" | null }) {
  const { t } = useI18n();
  if (s === "day") return null;
  return <span className={s === "season" ? "pill" : "badge missing"}>{s === "season" ? t("prayerFromSeason") : t("prayerMissing")}</span>;
}

export function Daily() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: days, isLoading } = useQuery({ queryKey: ["daily-calendar"], queryFn: () => api<DailyDay[]>("/admin/daily?days=21") });
  const { data: saints } = useQuery({ queryKey: ["admin-saints"], queryFn: () => api<AdminSaint[]>("/admin/saints") });
  const fmt = (d: string) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
  const missing = days?.filter((d) => !d.filled).length ?? 0;
  const selectedDay = days?.find((d) => d.date === selected);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("dailyTitle")}</h1>
          <div className="page-sub">{t("dailySub")}</div>
        </div>
      </div>
      {missing > 0 && <div className="notice" style={{ marginBottom: 14 }}>{t("daysMissing", { n: missing })}</div>}
      <div className="grid two-col">
        <div>{selectedDay && saints ? <DayEditor date={selectedDay.date} season={selectedDay.season} saints={saints} onSaved={() => void qc.invalidateQueries({ queryKey: ["daily-calendar"] })} /> : <div className="card muted">{t("pickDay")}</div>}</div>
        <section className="card">
          <h2>{t("next21")}</h2>
          {isLoading && <p className="muted">{t("loading")}</p>}
          <table className="table">
            <tbody>
              {days?.map((d) => (
                <tr key={d.date} className="day-row" aria-selected={selected === d.date} onClick={() => setSelected(d.date)} data-testid={`day-${d.date}`}>
                  <td>
                    <div className="row" style={{ justifyContent: "space-between" }}>
                      <strong>{fmt(d.date)}</strong>
                      {!d.filled && <span className="badge missing">{t("missing")}</span>}
                    </div>
                    <div className="muted">{t(`season_${d.season}`)}</div>
                    {d.filled && (
                      <>
                        <div className="muted">{`${d.gospelRef}${d.saintOfDay ? ` · ${d.saintOfDay}` : ""}`}</div>
                        {d.audio && d.prayers && (
                          <div className="muted" style={{ marginTop: 4 }}>
                            {t("morningShort")} <Source s={d.prayers.morning} /> <Pills v={d.audio.morning} /> {t("nightShort")} <Source s={d.prayers.night} />{" "}
                            <Pills v={d.audio.night} />
                          </div>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
