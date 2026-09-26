import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api, ApiError } from "../api.ts";
import { MediaField } from "../components/MediaField.tsx";
import { useI18n } from "../i18n.tsx";
import type { AdminSaint } from "../types.ts";

type Form = {
  name: string;
  feastDate: string;
  imageUrl: string;
  audioUrlEs: string;
  audioUrlEn: string;
  historyEs: string;
  historyEn: string;
  patronagesEs: string;
  patronagesEn: string;
  prayerEs: string;
  prayerEn: string;
  isPatronCatalog: boolean;
  sortOrder: string;
};

const EMPTY: Form = {
  name: "",
  feastDate: "",
  imageUrl: "",
  audioUrlEs: "",
  audioUrlEn: "",
  historyEs: "",
  historyEn: "",
  patronagesEs: "",
  patronagesEn: "",
  prayerEs: "",
  prayerEn: "",
  isPatronCatalog: false,
  sortOrder: "100",
};

const toForm = (s: AdminSaint): Form => ({
  name: s.name,
  feastDate: s.feastDate,
  imageUrl: s.imageUrl,
  audioUrlEs: s.audioUrlEs ?? "",
  audioUrlEn: s.audioUrlEn ?? "",
  historyEs: s.historyEs,
  historyEn: s.historyEn,
  patronagesEs: s.patronagesEs,
  patronagesEn: s.patronagesEn,
  prayerEs: s.prayerEs,
  prayerEn: s.prayerEn,
  isPatronCatalog: s.isPatronCatalog,
  sortOrder: String(s.sortOrder),
});

function SaintForm({ saint, onDone }: { saint: AdminSaint | null; onDone: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState<Form>(saint ? toForm(saint) : EMPTY);
  const set = (k: keyof Form) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = useMutation({
    mutationFn: () => {
      const body = { ...f, audioUrlEs: f.audioUrlEs || null, audioUrlEn: f.audioUrlEn || null, sortOrder: Number(f.sortOrder) };
      return saint ? api(`/admin/saints/${saint.id}`, { method: "PATCH", body }) : api("/admin/saints", { method: "POST", body });
    },
    onSuccess: onDone,
  });

  return (
    <form
      className="card"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <h2 style={{ marginBottom: 14 }}>{saint ? saint.name : t("newSaint")}</h2>
      <div className="form-grid">
        <label className="field">{t("saintName")}<input required value={f.name} onChange={set("name")} /></label>
        <label className="field">{t("feastDate")}<input required pattern="(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])" placeholder="12-12" value={f.feastDate} onChange={set("feastDate")} /></label>
        <label className="field">{t("sortOrder")}<input type="number" min="0" max="10000" value={f.sortOrder} onChange={set("sortOrder")} /></label>
        <label className="row" style={{ fontSize: 15, alignSelf: "end" }}>
          <input type="checkbox" checked={f.isPatronCatalog} onChange={(e) => setF({ ...f, isPatronCatalog: e.target.checked })} /> {t("patronCatalog")}
        </label>
      </div>
      <div className="form-grid" style={{ marginTop: 14 }}>
        <MediaField label={t("image")} kind="image" required value={f.imageUrl} onChange={(v) => setF({ ...f, imageUrl: v })} testId="saint-image" />
        <MediaField label={t("audioEs")} kind="audio" value={f.audioUrlEs} onChange={(v) => setF({ ...f, audioUrlEs: v })} testId="saint-audio-es" />
        <MediaField label={t("audioEn")} kind="audio" value={f.audioUrlEn} onChange={(v) => setF({ ...f, audioUrlEn: v })} testId="saint-audio-en" />
      </div>
      <div className="form-grid" style={{ marginTop: 14 }}>
        <label className="field">{t("historyEs")}<textarea required value={f.historyEs} onChange={set("historyEs")} /></label>
        <label className="field">{t("historyEn")}<textarea required value={f.historyEn} onChange={set("historyEn")} /></label>
        <label className="field">{t("patronagesEs")}<textarea value={f.patronagesEs} onChange={set("patronagesEs")} /></label>
        <label className="field">{t("patronagesEn")}<textarea value={f.patronagesEn} onChange={set("patronagesEn")} /></label>
        <label className="field">{t("saintPrayerEs")}<textarea value={f.prayerEs} onChange={set("prayerEs")} /></label>
        <label className="field">{t("saintPrayerEn")}<textarea value={f.prayerEn} onChange={set("prayerEn")} /></label>
      </div>
      {save.isError && <p className="error">{t("genericError")}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={save.isPending}>{t("save")}</button>
        <button className="btn" type="button" onClick={onDone}>{t("cancel")}</button>
      </div>
    </form>
  );
}

export function Saints() {
  const { t } = useI18n();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<AdminSaint | "new" | null>(null);
  const [inUse, setInUse] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ["admin-saints"], queryFn: () => api<AdminSaint[]>("/admin/saints") });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin-saints"] });

  const toggle = useMutation({
    mutationFn: (s: AdminSaint) =>
      s.deletedAt ? api(`/admin/saints/${s.id}/restore`, { method: "POST" }) : api(`/admin/saints/${s.id}`, { method: "DELETE" }),
    onSuccess: () => {
      setInUse(null);
      refresh();
    },
    onError: (e, s) => setInUse(e instanceof ApiError && e.code === "saint_in_use" ? s.name : null),
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("saintsTitle")}</h1>
          <div className="page-sub">{t("saintsSub")}</div>
        </div>
        {!editing && (
          <button className="btn btn-primary" type="button" onClick={() => setEditing("new")}>{t("newSaint")}</button>
        )}
      </div>
      {editing && (
        <div style={{ marginBottom: 20 }}>
          <SaintForm
            key={editing === "new" ? "new" : editing.id}
            saint={editing === "new" ? null : editing}
            onDone={() => {
              setEditing(null);
              refresh();
            }}
          />
        </div>
      )}
      {inUse && <div className="notice" style={{ marginBottom: 14 }}>{t("saintInUse", { name: inUse })}</div>}
      <section className="card">
        {isLoading && <p className="muted">{t("loading")}</p>}
        {data && (
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>{t("saintName")}</th>
                <th>{t("feastDate")}</th>
                <th>{t("audio")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.map((s) => (
                <tr key={s.id} style={s.deletedAt ? { opacity: 0.55 } : undefined}>
                  <td><img className="thumb" src={s.imageUrl} alt="" /></td>
                  <td>
                    <strong>{s.name}</strong>
                    <div className="muted">
                      {s.isPatronCatalog ? t("patronCatalog") : t("santoralOnly")}
                      {s.deletedAt ? ` · ${t("hidden")}` : ""}
                    </div>
                  </td>
                  <td>{s.feastDate}</td>
                  <td>
                    <span className={`pill ${s.audioUrlEs ? "on" : ""}`}>ES</span>
                    <span className={`pill ${s.audioUrlEn ? "on" : ""}`}>EN</span>
                  </td>
                  <td className="num">
                    <div className="row" style={{ justifyContent: "flex-end" }}>
                      <button className="btn" type="button" onClick={() => setEditing(s)}>{t("edit")}</button>
                      <button className="btn" type="button" disabled={toggle.isPending} onClick={() => toggle.mutate(s)}>
                        {s.deletedAt ? t("restore") : t("hide")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
