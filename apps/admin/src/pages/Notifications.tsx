import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api } from "../api.ts";
import { useI18n } from "../i18n.tsx";
import type { PushCampaigns } from "../types.ts";

const EMPTY = { titleEs: "", titleEn: "", bodyEs: "", bodyEn: "" };

// Avisos del equipo a la comunidad. Los recordatorios de oración y el santo del día son automáticos.
export function Notifications() {
  const { t, lang } = useI18n();
  const qc = useQueryClient();
  const [f, setF] = useState(EMPTY);
  const [confirming, setConfirming] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const { data, isLoading } = useQuery({
    queryKey: ["push-campaigns"],
    queryFn: () => api<PushCampaigns>("/admin/push/campaigns"),
    // Mientras haya avisos en cola, refresca para ver cuándo salen.
    refetchInterval: (q) => (q.state.data?.campaigns.some((c) => !c.sentAt) ? 10_000 : false),
  });
  const create = useMutation({
    mutationFn: () => api("/admin/push/campaigns", { method: "POST", body: f }),
    onSuccess: () => {
      setF(EMPTY);
      setConfirming(false);
      void qc.invalidateQueries({ queryKey: ["push-campaigns"] });
    },
  });
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const audience = data?.audience ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("notificationsTitle")}</h1>
          <div className="page-sub">{t("notificationsSub")}</div>
        </div>
      </div>
      <div className="grid two-col">
        <section className="card">
          <h2>{t("sentCampaigns")}</h2>
          {isLoading && <p className="muted">{t("loading")}</p>}
          {data?.campaigns.length === 0 && <p className="muted">{t("noCampaigns")}</p>}
          {data && data.campaigns.length > 0 && (
            <table className="table">
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.title[lang]}</strong>
                      <div>{c.body[lang]}</div>
                      <div className="muted">
                        {fmt(c.createdAt)} · {c.createdBy}
                      </div>
                    </td>
                    <td className="num">
                      {c.sentAt ? (
                        <span className="badge won">{t("campaignSent", { n: c.recipients ?? 0 })}</span>
                      ) : (
                        <span className="badge scheduled">{t("campaignQueued")}</span>
                      )}
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
            if (!confirming) setConfirming(true);
            else create.mutate();
          }}
        >
          <h2>{t("newCampaign")}</h2>
          <p className="muted">{t("campaignHint")}</p>
          <label className="field">{t("titleEs")}<input required maxLength={60} value={f.titleEs} onChange={set("titleEs")} /></label>
          <label className="field">{t("messageEs")}<textarea required maxLength={180} value={f.bodyEs} onChange={set("bodyEs")} /></label>
          <label className="field">{t("titleEn")}<input required maxLength={60} value={f.titleEn} onChange={set("titleEn")} /></label>
          <label className="field">{t("messageEn")}<textarea required maxLength={180} value={f.bodyEn} onChange={set("bodyEn")} /></label>
          {confirming && <p className="error">{t("campaignConfirm", { n: audience })}</p>}
          {create.isError && <p className="error">{t("genericError")}</p>}
          <div className="row">
            <button className="btn btn-primary" type="submit" disabled={create.isPending || audience === 0}>
              {confirming ? t("campaignSendNow", { n: audience }) : t("campaignReview")}
            </button>
            {confirming && (
              <button className="btn" type="button" onClick={() => setConfirming(false)}>
                {t("cancel")}
              </button>
            )}
          </div>
          {audience === 0 && !isLoading && <p className="muted">{t("campaignNoAudience")}</p>}
        </form>
      </div>
    </>
  );
}
