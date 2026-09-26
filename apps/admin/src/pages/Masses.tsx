import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api } from "../api.ts";
import { useI18n, type I18nKey } from "../i18n.tsx";
import type { Mass } from "../types.ts";

export function Masses() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState({ titleEs: "Misa dominical", titleEn: "Sunday Mass", youtubeUrl: "", scheduledAt: "", durationMin: "120", isSpecial: false });
  const { data, isLoading } = useQuery({ queryKey: ["masses"], queryFn: () => api<Mass[]>("/admin/masses") });
  const create = useMutation({
    mutationFn: () =>
      api("/admin/masses", {
        method: "POST",
        body: {
          titleEs: f.titleEs,
          titleEn: f.titleEn,
          youtubeUrl: f.youtubeUrl,
          // El input datetime-local está en la zona horaria del navegador: se envía en ISO con desfase.
          scheduledAt: new Date(f.scheduledAt).toISOString(),
          durationMin: Number(f.durationMin),
          isSpecial: f.isSpecial,
        },
      }),
    onSuccess: () => {
      setF({ ...f, youtubeUrl: "", scheduledAt: "" });
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
          {data && data.length > 0 && (
            <table className="table">
              <tbody>
                {data.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <strong>{m.title[lang]}</strong>
                      <div className="muted">{fmt(m.scheduledAt)}</div>
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
        <form
          className="card stack"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <h2>{t("newMass")}</h2>
          <label className="field">{t("titleEs")}<input required value={f.titleEs} onChange={(e) => setF({ ...f, titleEs: e.target.value })} /></label>
          <label className="field">{t("titleEn")}<input required value={f.titleEn} onChange={(e) => setF({ ...f, titleEn: e.target.value })} /></label>
          <label className="field">{t("youtubeUrl")}<input type="url" required value={f.youtubeUrl} onChange={(e) => setF({ ...f, youtubeUrl: e.target.value })} /></label>
          <label className="field">{t("scheduledAt")}<input type="datetime-local" required value={f.scheduledAt} onChange={(e) => setF({ ...f, scheduledAt: e.target.value })} /></label>
          <label className="field">{t("duration")}<input type="number" min="15" max="480" required value={f.durationMin} onChange={(e) => setF({ ...f, durationMin: e.target.value })} /></label>
          <label className="row" style={{ fontSize: 15 }}>
            <input type="checkbox" checked={f.isSpecial} onChange={(e) => setF({ ...f, isSpecial: e.target.checked })} /> {t("special")}
          </label>
          {create.isError && <p className="error">{t("genericError")}</p>}
          <div>
            <button className="btn btn-primary" type="submit" disabled={create.isPending}>{t("save")}</button>
          </div>
        </form>
      </div>
    </>
  );
}
