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

type Item = { conceptEs: string; conceptEn: string; amountUsd: string };
const emptyItem = (): Item => ({ conceptEs: "", conceptEn: "", amountUsd: "" });
const toCents = (usd: string) => Math.round(Number(usd) * 100);

// Alta y edición (solo candidatas: la API bloquea la ficha en cuanto entra en votación).
function CauseForm({ cause, onDone }: { cause: Cause | null; onDone: () => void }) {
  const { t, lang } = useI18n();
  const [f, setF] = useState({
    month: cause?.month ?? nextMonth(),
    nameEs: cause?.name.es ?? "",
    nameEn: cause?.name.en ?? "",
    location: cause?.location ?? "",
    responsible: cause?.responsible ?? "",
    descriptionEs: cause?.description.es ?? "",
    descriptionEn: cause?.description.en ?? "",
    fundsUseEs: cause?.fundsUse?.es ?? "",
    fundsUseEn: cause?.fundsUse?.en ?? "",
    timeline: cause?.timeline ?? "",
    photos: cause?.photos.join("\n") ?? "",
  });
  const [items, setItems] = useState<Item[]>(
    cause?.budgetItems.length
      ? cause.budgetItems.map((i) => ({ conceptEs: i.concept.es, conceptEn: i.concept.en, amountUsd: String(i.amountCents / 100) }))
      : [emptyItem()],
  );
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const setItem = (n: number, k: keyof Item, v: string) => setItems(items.map((it, i) => (i === n ? { ...it, [k]: v } : it)));
  const totalCents = items.reduce((sum, i) => sum + (toCents(i.amountUsd) || 0), 0);
  const save = useMutation({
    mutationFn: () => {
      const body = {
        ...f,
        photos: f.photos
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
        budgetItems: items.map((i) => ({ conceptEs: i.conceptEs, conceptEn: i.conceptEn, amountCents: toCents(i.amountUsd) })),
      };
      return cause ? api(`/admin/causes/${cause.id}`, { method: "PATCH", body }) : api("/admin/causes", { method: "POST", body });
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
      <h2 style={{ marginBottom: 14 }}>{cause ? t("editCause") : t("newCause")}</h2>
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
        <Field label={t("fundsUseEs")}>
          <textarea required value={f.fundsUseEs} onChange={set("fundsUseEs")} />
        </Field>
        <Field label={t("fundsUseEn")}>
          <textarea required value={f.fundsUseEn} onChange={set("fundsUseEn")} />
        </Field>
        <Field label={t("photos")}>
          <textarea value={f.photos} onChange={set("photos")} />
        </Field>
      </div>

      <h3 className="section-label">{t("budgetItems")}</h3>
      <p className="muted" style={{ marginTop: 0 }}>
        {t("budgetItemsHint")}
      </p>
      <div className="stack" data-testid="budget-items">
        {items.map((it, n) => (
          <div key={n} className="budget-row">
            <Field label={t("conceptEs")}>
              <input required value={it.conceptEs} onChange={(e) => setItem(n, "conceptEs", e.target.value)} />
            </Field>
            <Field label={t("conceptEn")}>
              <input required value={it.conceptEn} onChange={(e) => setItem(n, "conceptEn", e.target.value)} />
            </Field>
            <Field label={t("amountUsdShort")}>
              <input type="number" min="0.01" step="0.01" required value={it.amountUsd} onChange={(e) => setItem(n, "amountUsd", e.target.value)} />
            </Field>
            <button
              className="btn btn-quiet"
              type="button"
              aria-label={t("removeBudgetItem")}
              disabled={items.length === 1}
              onClick={() => setItems(items.filter((_, i) => i !== n))}
            >
              {t("remove")}
            </button>
          </div>
        ))}
      </div>
      <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
        <button className="btn" type="button" disabled={items.length >= 20} onClick={() => setItems([...items, emptyItem()])}>
          {t("addBudgetItem")}
        </button>
        <strong data-testid="budget-total">{t("budgetTotal", { total: formatUsd(totalCents, lang) })}</strong>
      </div>

      {save.isError && <p className="error">{t("genericError")}</p>}
      <div className="form-actions">
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

function WinnerActions({ cause }: { cause: Cause }) {
  const { t } = useI18n();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [p, setP] = useState({ textEs: "", textEn: "", photoUrl: "" });
  const [tr, setTr] = useState({ amountUsd: "", note: "" });
  const progress = useMutation({
    mutationFn: () =>
      api(`/admin/causes/${cause.id}/updates`, { method: "POST", body: { textEs: p.textEs, textEn: p.textEn, photoUrl: p.photoUrl || undefined } }),
    onSuccess: () => setP({ textEs: "", textEn: "", photoUrl: "" }),
  });
  const transfer = useMutation({
    mutationFn: () =>
      api(`/admin/causes/${cause.id}/transfers`, { method: "POST", body: { amountCents: Math.round(Number(tr.amountUsd) * 100), note: tr.note || undefined } }),
    onSuccess: () => {
      setTr({ amountUsd: "", note: "" });
      void qc.invalidateQueries({ queryKey: ["causes"] });
    },
  });
  return (
    <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", marginTop: 12 }}>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          progress.mutate();
        }}
      >
        <strong>{t("addProgress")}</strong>
        <Field label={t("progressEs")}>
          <textarea required value={p.textEs} onChange={(e) => setP({ ...p, textEs: e.target.value })} />
        </Field>
        <Field label={t("progressEn")}>
          <textarea required value={p.textEn} onChange={(e) => setP({ ...p, textEn: e.target.value })} />
        </Field>
        <Field label={t("photoUrl")}>
          <input type="url" value={p.photoUrl} onChange={(e) => setP({ ...p, photoUrl: e.target.value })} />
        </Field>
        <div>
          <button className="btn" type="submit" disabled={progress.isPending}>
            {t("addProgress")}
          </button>{" "}
          {progress.isSuccess && <span className="muted">{t("saved")}</span>}
        </div>
      </form>
      {can(me) && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            transfer.mutate();
          }}
        >
          <strong>{t("registerTransfer")}</strong>
          <p className="muted">{t("transferHint")}</p>
          <Field label={t("amountUsd")}>
            <input type="number" min="0.01" step="0.01" required value={tr.amountUsd} onChange={(e) => setTr({ ...tr, amountUsd: e.target.value })} />
          </Field>
          <Field label={t("note")}>
            <input value={tr.note} onChange={(e) => setTr({ ...tr, note: e.target.value })} />
          </Field>
          <div>
            <button className="btn btn-primary" type="submit" disabled={transfer.isPending}>
              {t("registerTransfer")}
            </button>
          </div>
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
  const [editing, setEditing] = useState<Cause | null>(null);
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
            cause={null}
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
        {data?.map((c) =>
          editing?.id === c.id ? (
            <CauseForm
              key={c.id}
              cause={c}
              onDone={() => {
                setEditing(null);
                void qc.invalidateQueries({ queryKey: ["causes"] });
              }}
            />
          ) : (
            <article key={c.id} className="card" data-testid={`admin-cause-${c.id}`}>
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
              {c.fundsUse ? (
                <p style={{ margin: "8px 0 0" }}>
                  <strong>{t("fundsUse")}</strong> {c.fundsUse[lang]}
                </p>
              ) : (
                c.status === "candidate" && (
                  <p className="error" style={{ margin: "8px 0 0" }}>
                    {t("noFundsUse")}
                  </p>
                )
              )}
              {c.budgetItems.length > 0 && (
                <table className="table" style={{ marginTop: 8 }}>
                  <tbody>
                    {c.budgetItems.map((i, n) => (
                      <tr key={n}>
                        <td>{i.concept[lang]}</td>
                        <td className="num">{formatUsd(i.amountCents, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {c.status === "candidate" && (
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn" type="button" onClick={() => setEditing(c)}>
                    {t("edit")}
                  </button>
                </div>
              )}
              {(c.status === "won" || c.status === "funded") && <WinnerActions cause={c} />}
            </article>
          ),
        )}
      </div>
    </>
  );
}
