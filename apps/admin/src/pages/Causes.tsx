import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api, formatUsd } from "../api.ts";
import { can, useAuth } from "../auth.tsx";
import { useI18n, type I18nKey } from "../i18n.tsx";
import type { Cause } from "../types.ts";

const nextMonth = () => {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  return d.toISOString().slice(0, 7);
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      {label}
      {children}
    </label>
  );
}

function CauseForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [f, setF] = useState({ month: nextMonth(), nameEs: "", nameEn: "", location: "", responsible: "", descriptionEs: "", descriptionEn: "", budgetUsd: "", timeline: "", photos: "" });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const create = useMutation({
    mutationFn: () =>
      api("/admin/causes", {
        method: "POST",
        body: {
          month: f.month,
          nameEs: f.nameEs,
          nameEn: f.nameEn,
          location: f.location,
          responsible: f.responsible,
          descriptionEs: f.descriptionEs,
          descriptionEn: f.descriptionEn,
          budgetCents: Math.round(Number(f.budgetUsd) * 100),
          timeline: f.timeline,
          photos: f.photos.split("\n").map((p) => p.trim()).filter(Boolean),
        },
      }),
    onSuccess: onDone,
  });
  return (
    <form
      className="card"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        create.mutate();
      }}
    >
      <h2 style={{ marginBottom: 14 }}>{t("newCause")}</h2>
      <div className="form-grid">
        <Field label={t("month")}>
          <input type="month" required value={f.month} onChange={set("month")} />
        </Field>
        <Field label={t("nameEs")}>
          <input required value={f.nameEs} onChange={set("nameEs")} />
        </Field>
        <Field label={t("nameEn")}>
          <input required value={f.nameEn} onChange={set("nameEn")} />
        </Field>
        <Field label={t("location")}>
          <input required value={f.location} onChange={set("location")} />
        </Field>
        <Field label={t("responsible")}>
          <input required value={f.responsible} onChange={set("responsible")} />
        </Field>
        <Field label={t("budget")}>
          <input type="number" min="1" step="0.01" required value={f.budgetUsd} onChange={set("budgetUsd")} />
        </Field>
        <Field label={t("timeline")}>
          <input required value={f.timeline} onChange={set("timeline")} />
        </Field>
      </div>
      <div className="form-grid" style={{ marginTop: 14 }}>
        <Field label={t("descEs")}>
          <textarea required value={f.descriptionEs} onChange={set("descriptionEs")} />
        </Field>
        <Field label={t("descEn")}>
          <textarea required value={f.descriptionEn} onChange={set("descriptionEn")} />
        </Field>
        <Field label={t("photos")}>
          <textarea value={f.photos} onChange={set("photos")} />
        </Field>
      </div>
      {create.isError && <p className="error">{t("genericError")}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" type="submit" disabled={create.isPending}>
          {t("save")}
        </button>
        <button className="btn" type="button" onClick={onDone}>
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}

function WinnerActions({ cause }: { cause: Cause }) {
  const { t } = useI18n();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [p, setP] = useState({ textEs: "", textEn: "", photoUrl: "" });
  const [tr, setTr] = useState({ amountUsd: "", note: "" });
  const progress = useMutation({
    mutationFn: () => api(`/admin/causes/${cause.id}/updates`, { method: "POST", body: { textEs: p.textEs, textEn: p.textEn, photoUrl: p.photoUrl || undefined } }),
    onSuccess: () => setP({ textEs: "", textEn: "", photoUrl: "" }),
  });
  const transfer = useMutation({
    mutationFn: () => api(`/admin/causes/${cause.id}/transfers`, { method: "POST", body: { amountCents: Math.round(Number(tr.amountUsd) * 100), note: tr.note || undefined } }),
    onSuccess: () => {
      setTr({ amountUsd: "", note: "" });
      void qc.invalidateQueries({ queryKey: ["causes"] });
    },
  });
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 12 }}>
      <form className="stack" onSubmit={(e) => { e.preventDefault(); progress.mutate(); }}>
        <strong>{t("addProgress")}</strong>
        <Field label={t("progressEs")}><textarea required value={p.textEs} onChange={(e) => setP({ ...p, textEs: e.target.value })} /></Field>
        <Field label={t("progressEn")}><textarea required value={p.textEn} onChange={(e) => setP({ ...p, textEn: e.target.value })} /></Field>
        <Field label={t("photoUrl")}><input type="url" value={p.photoUrl} onChange={(e) => setP({ ...p, photoUrl: e.target.value })} /></Field>
        <div><button className="btn" type="submit" disabled={progress.isPending}>{t("addProgress")}</button> {progress.isSuccess && <span className="muted">{t("saved")}</span>}</div>
      </form>
      {can(me) && (
        <form className="stack" onSubmit={(e) => { e.preventDefault(); transfer.mutate(); }}>
          <strong>{t("registerTransfer")}</strong>
          <p className="muted">{t("transferHint")}</p>
          <Field label={t("amountUsd")}><input type="number" min="0.01" step="0.01" required value={tr.amountUsd} onChange={(e) => setTr({ ...tr, amountUsd: e.target.value })} /></Field>
          <Field label={t("note")}><input value={tr.note} onChange={(e) => setTr({ ...tr, note: e.target.value })} /></Field>
          <div><button className="btn btn-primary" type="submit" disabled={transfer.isPending}>{t("registerTransfer")}</button></div>
          {transfer.isError && <p className="error">{t("genericError")}</p>}
        </form>
      )}
    </div>
  );
}

export function Causes() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const { data, isLoading } = useQuery({ queryKey: ["causes"], queryFn: () => api<Cause[]>("/admin/causes") });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("causesTitle")}</h1>
          <div className="page-sub">{t("causesSub")}</div>
        </div>
        {!creating && (
          <button className="btn btn-primary" type="button" onClick={() => setCreating(true)}>
            {t("newCause")}
          </button>
        )}
      </div>
      {creating && (
        <div style={{ marginBottom: 20 }}>
          <CauseForm
            onDone={() => {
              setCreating(false);
              void qc.invalidateQueries({ queryKey: ["causes"] });
            }}
          />
        </div>
      )}
      {isLoading && <p className="muted">{t("loading")}</p>}
      {data?.length === 0 && <div className="notice">{t("noCauses")}</div>}
      <div className="stack" style={{ gap: 14 }}>
        {data?.map((c) => (
          <article key={c.id} className="card">
            <div className="card-head">
              <div>
                <h2>{c.name[lang]}</h2>
                <div className="muted">
                  {c.month} · {c.location} · {c.responsible} · {formatUsd(c.budgetCents, lang)}
                </div>
              </div>
              <span className={`badge ${c.status}`}>{t(`status_${c.status}` as I18nKey)}</span>
            </div>
            <p style={{ margin: 0 }}>{c.description[lang]}</p>
            {(c.status === "won" || c.status === "funded") && <WinnerActions cause={c} />}
          </article>
        ))}
      </div>
    </>
  );
}
