import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api, ApiError } from "../api.ts";
import { useI18n, type I18nKey } from "../i18n.tsx";
import type { Mass } from "../types.ts";

type Form = { titleEs: string; titleEn: string; youtubeUrl: string; scheduledAt: string; durationMin: string; isSpecial: boolean };

const EMPTY: Form = { titleEs: "Misa dominical", titleEn: "Sunday Mass", youtubeUrl: "", scheduledAt: "", durationMin: "120", isSpecial: false };

// El input datetime-local trabaja en la hora del navegador, sin zona: "AAAA-MM-DDTHH:MM".
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const toForm = (m: Mass): Form => ({
  titleEs: m.title.es,
  titleEn: m.title.en,
  youtubeUrl: m.youtubeUrl,
  scheduledAt: toLocalInput(m.scheduledAt),
  durationMin: String(m.durationMin),
  isSpecial: m.isSpecial,
});

export function Masses() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Mass | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["masses"], queryFn: () => api<Mass[]>("/admin/masses") });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/admin/masses/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setConfirmDelete(null);
      void qc.invalidateQueries({ queryKey: ["masses"] });
    },
  });
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { dateStyle: "full", timeStyle: "short" }).format(new Date(iso));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("massesTitle")}</h1>
          <div className="page-sub">{t("massesSub")}</div>
        </div>
      </div>
      <div className="grid two-col">
        <section className="card">
          {isLoading && <p className="muted">{t("loading")}</p>}
          {data?.length === 0 && <p className="muted">{t("noMasses")}</p>}
          {remove.isError && (
            <p className="error">{remove.error instanceof ApiError && remove.error.code === "mass_started" ? t("massStarted") : t("genericError")}</p>
          )}
          {data && data.length > 0 && (
            <table className="table">
              <tbody>
                {data.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.title[lang]}</strong>
                      <div className="muted">{fmt(m.scheduledAt)}</div>
                      {m.status === "ended" && <RecordingField mass={m} />}
                      {m.status !== "ended" && (
                        <div className="row" style={{ marginTop: 8 }}>
                          <button className="btn" type="button" onClick={() => setEditing(m)}>{t("edit")}</button>
                          {m.status === "scheduled" &&
                            (confirmDelete === m.id ? (
                              <>
                                <span className="error">{t("deleteMassConfirm")}</span>
                                <button className="btn btn-primary" type="button" disabled={remove.isPending} onClick={() => remove.mutate(m.id)}>
                                  {t("deleteMass")}
                                </button>
                                <button className="btn" type="button" onClick={() => setConfirmDelete(null)}>{t("cancel")}</button>
                              </>
                            ) : (
                              <button className="btn btn-quiet" type="button" onClick={() => setConfirmDelete(m.id)}>{t("deleteMass")}</button>
                            ))}
                        </div>
                      )}
                    </td>
                    <td className="num">
                      <span className={`badge ${m.status}`}>{t(`status_${m.status}` as I18nKey)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
        <MassForm key={editing?.id ?? "new"} mass={editing} onDone={() => setEditing(null)} />
      </div>
    </>
  );
}

// Alta y edición. Al editar solo se envían los campos (la API no toca el resto).
function MassForm({ mass, onDone }: { mass: Mass | null; onDone: () => void }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(mass ? toForm(mass) : EMPTY);
  const save = useMutation({
    mutationFn: () => {
      const body = {
        titleEs: f.titleEs,
        titleEn: f.titleEn,
        youtubeUrl: f.youtubeUrl,
        // El input datetime-local está en la zona horaria del navegador: se envía en ISO con desfase.
        scheduledAt: new Date(f.scheduledAt).toISOString(),
        durationMin: Number(f.durationMin),
        isSpecial: f.isSpecial,
      };
      return mass ? api(`/admin/masses/${mass.id}`, { method: "PATCH", body }) : api("/admin/masses", { method: "POST", body });
    },
    onSuccess: () => {
      if (mass) onDone();
      else setF({ ...f, youtubeUrl: "", scheduledAt: "" });
      void qc.invalidateQueries({ queryKey: ["masses"] });
    },
  });

  return (
    <form
      className="card stack"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2>{mass ? t("editMass") : t("newMass")}</h2>
      <label className="field">{t("titleEs")}<input required value={f.titleEs} onChange={(e) => setF({ ...f, titleEs: e.target.value })} /></label>
      <label className="field">{t("titleEn")}<input required value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} /></label>
      <label className="field">{t("youtubeUrl")}<input type="url" required value={f.youtubeUrl} onChange={(e) => setF({ ...f, youtubeUrl: e.target.value })} /></label>
      <label className="field">{t("scheduledAt")}<input type="datetime-local" required value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} /></label>
      <label className="field">{t("duration")}<input type="number" min="15" max="480" required value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} /></label>
      <label className="row" style={{ fontSize: 15 }}>
        <input type="checkbox" checked={f.isSpecial} onChange={(e) => setF({ ...f, isSpecial: e.target.checked })} /> {t("special")}
      </label>
      {save.isError && <p className="error">{t("genericError")}</p>}
      <div className="row">
        <button className="btn btn-primary" type="submit" disabled={save.isPending}>{t("save")}</button>
        {mass && <button className="btn" type="button" onClick={onDone}>{t("cancel")}</button>}
      </div>
    </form>
  );
}

// Grabación para quien no pudo asistir (pilar 2). Solo en misas ya celebradas: la app muestra la
// de la última que la tenga. Vacío = sin grabación.
function RecordingField({ mass }: { mass: Mass }) {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [url, setUrl] = useState(mass.recordingUrl ?? "");
  const save = useMutation({
    mutationFn: () => api(`/admin/masses/${mass.id}`, { method: "PATCH", body: { recordingUrl: url.trim() || null } }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["masses"] }),
  });
  const changed = url.trim() !== (mass.recordingUrl ?? "");
  return (
    <form
      className="row"
      style={{ marginTop: 8 }}
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="field" style={{ flex: 1, minWidth: 220 }}>
        {t("recordingUrl")}
        <input type="url" value={url} placeholder="https://www.youtube.com/watch?v=…" onChange={(e) => setUrl(e.target.value)} />
      </label>
      <button className="btn" type="submit" disabled={!changed || save.isPending} style={{ alignSelf: "flex-end" }}>
        {t("save")}
      </button>
      {save.isSuccess && !changed && <span className="muted" style={{ alignSelf: "flex-end" }}>{t("saved")}</span>}
      {save.isError && <span className="error" style={{ alignSelf: "flex-end" }}>{t("genericError")}</span>}
    </form>
  );
}
