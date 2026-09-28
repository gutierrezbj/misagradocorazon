import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api } from "../api.ts";
import { MediaField } from "../components/MediaField.tsx";
import { useI18n } from "../i18n.tsx";
import type { SeasonalPrayer, SeasonRow } from "../types.ts";

type Kind = "morning" | "night";
type Editing = { season: SeasonRow["season"]; kind: Kind } | null;

// Oraciones de mañana y noche por tiempo litúrgico (SDD-05 US-10). Se rezan los días sin oración
// propia; un tiempo sin oración usa la del tiempo ordinario.
export function Seasons() {
  const { t } = useI18n();
  const [editing, setEditing] = useState<Editing>(null);
  const { data, isLoading } = useQuery({ queryKey: ["seasonal-prayers"], queryFn: () => api<SeasonRow[]>("/admin/seasonal-prayers") });
  const ordinary = data?.find((s) => s.season === "ordinary");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("seasonsTitle")}</h1>
          <div className="page-sub">{t("seasonsSub")}</div>
        </div>
      </div>
      {isLoading && <p className="muted">{t("loading")}</p>}
      <div className="stack">
        {data?.map((s) => (
          <section key={s.season} className="card" data-testid={`season-${s.season}`}>
            <div className="card-head">
              <h2>{t(`season_${s.season}`)}</h2>
              {s.current && <span className="badge current">{t("seasonCurrent")}</span>}
            </div>
            <div className="grid two-col">
              {(["morning", "night"] as const).map((kind) =>
                editing?.season === s.season && editing.kind === kind ? (
                  <PrayerForm key={kind} season={s.season} kind={kind} initial={s[kind]} onDone={() => setEditing(null)} />
                ) : (
                  <div key={kind}>
                    <h3 className="section-label">{kind === "morning" ? t("morningPrayerLabel") : t("nightPrayerLabel")}</h3>
                    {s[kind] ? (
                      <>
                        <p className="prayer-preview">{s[kind].textEs}</p>
                        <div className="muted">
                          {t("audioEs")} {s[kind].audioUrlEs ? "✓" : "—"} · {t("audioEn")} {s[kind].audioUrlEn ? "✓" : "—"}
                        </div>
                      </>
                    ) : (
                      <p className="muted">{s.season !== "ordinary" && ordinary?.[kind] ? t("seasonUsesOrdinary") : t("seasonNoPrayer")}</p>
                    )}
                    <button
                      className="btn"
                      type="button"
                      style={{ marginTop: 8 }}
                      onClick={() => setEditing({ season: s.season, kind })}
                      data-testid={`edit-${s.season}-${kind}`}
                    >
                      {s[kind] ? t("editPrayer") : t("addPrayer")}
                    </button>
                  </div>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function PrayerForm({ season, kind, initial, onDone }: { season: SeasonRow["season"]; kind: Kind; initial: SeasonalPrayer | null; onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState({
    textEs: initial?.textEs ?? "",
    textEn: initial?.textEn ?? "",
    audioUrlEs: initial?.audioUrlEs ?? "",
    audioUrlEn: initial?.audioUrlEn ?? "",
  });
  const save = useMutation({
    mutationFn: () =>
      api(`/admin/seasonal-prayers/${season}/${kind}`, {
        method: "PUT",
        body: { ...f, audioUrlEs: f.audioUrlEs || null, audioUrlEn: f.audioUrlEn || null },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["seasonal-prayers"] });
      void qc.invalidateQueries({ queryKey: ["daily-calendar"] });
      onDone();
    },
  });
  return (
    <form
      className="stack"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h3 className="section-label">{kind === "morning" ? t("morningPrayerLabel") : t("nightPrayerLabel")}</h3>
      <label className="field">
        {t("textEs")}
        <textarea required value={f.textEs} onChange={(e) => setF({ ...f, textEs: e.target.value })} />
      </label>
      <label className="field">
        {t("textEn")}
        <textarea required value={f.textEn} onChange={(e) => setF({ ...f, textEn: e.target.value })} />
      </label>
      <MediaField
        label={t("audioEs")}
        kind="audio"
        value={f.audioUrlEs}
        onChange={(v) => setF({ ...f, audioUrlEs: v })}
        testId={`season-${season}-${kind}-es`}
      />
      <MediaField
        label={t("audioEn")}
        kind="audio"
        value={f.audioUrlEn}
        onChange={(v) => setF({ ...f, audioUrlEn: v })}
        testId={`season-${season}-${kind}-en`}
      />
      {save.isError && <p className="error">{t("genericError")}</p>}
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={save.isPending}>
          {t("save")}
        </button>
        <button className="btn" type="button" onClick={onDone}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
