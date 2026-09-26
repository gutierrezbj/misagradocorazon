import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import { api } from "../api.ts";
import { useI18n } from "../i18n.tsx";
import type { Queue } from "../types.ts";

function Decision({ onDecide }: { onDecide: (action: "approve" | "hide", reason?: string) => void }) {
  const { t } = useI18n();
  const [reason, setReason] = useState("");
  return (
    <div className="row">
      <input aria-label={t("reason")} placeholder={t("reason")} value={reason} onChange={(e) => setReason(e.target.value)} className="field" style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "7px 10px", minWidth: 200 }} />
      <button className="btn btn-primary" type="button" onClick={() => onDecide("approve", reason || undefined)}>
        {t("approve")}
      </button>
      <button className="btn" type="button" onClick={() => onDecide("hide", reason || undefined)}>
        {t("hide")}
      </button>
    </div>
  );
}

export function Moderation() {
  const { t, lang } = useI18n();
  const when = (iso: string) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const qc = useQueryClient();
  const queue = useQuery({ queryKey: ["mod-queue"], queryFn: () => api<Queue>("/admin/moderation/queue"), refetchInterval: 15_000 });
  const words = useQuery({ queryKey: ["mod-words"], queryFn: () => api<string[]>("/admin/moderation/words") });
  const [newWord, setNewWord] = useState("");

  const decide = useMutation({
    mutationFn: (v: { kind: "intentions" | "chat"; id: string; action: "approve" | "hide"; reason?: string }) =>
      api(`/admin/moderation/${v.kind}/${v.id}`, { method: "POST", body: { action: v.action, reason: v.reason } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mod-queue"] }),
  });
  const addWord = useMutation({
    mutationFn: (word: string) => api("/admin/moderation/words", { method: "POST", body: { word } }),
    onSuccess: () => {
      setNewWord("");
      void qc.invalidateQueries({ queryKey: ["mod-words"] });
    },
  });
  const removeWord = useMutation({
    mutationFn: (word: string) => api(`/admin/moderation/words/${encodeURIComponent(word)}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mod-words"] }),
  });

  const empty = queue.data && queue.data.intentions.length === 0 && queue.data.chat.length === 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("modTitle")}</h1>
          <div className="page-sub">{t("modSub")}</div>
        </div>
      </div>
      <div className="grid two-col">
        <div className="stack" style={{ gap: 16 }}>
          {queue.isLoading && <p className="muted">{t("loading")}</p>}
          {empty && <div className="notice">{t("modEmpty")}</div>}
          {queue.data && queue.data.intentions.length > 0 && (
            <section className="card stack">
              <h2>{t("modIntentions")}</h2>
              {queue.data.intentions.map((i) => (
                <div key={i.id} className="stack" style={{ gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--surface-3)" }}>
                  <div className="muted">
                    {i.author} · {when(i.createdAt)}
                  </div>
                  <div className="quote">{i.text}</div>
                  <Decision onDecide={(action, reason) => decide.mutate({ kind: "intentions", id: i.id, action, reason })} />
                </div>
              ))}
            </section>
          )}
          {queue.data && queue.data.chat.length > 0 && (
            <section className="card stack">
              <h2>{t("modChat")}</h2>
              {queue.data.chat.map((m) => (
                <div key={m.id} className="stack" style={{ gap: 8, paddingBottom: 12, borderBottom: "1px solid var(--surface-3)" }}>
                  <div className="muted">
                    {m.author} · {when(m.createdAt)}
                  </div>
                  <div className="quote">{m.text}</div>
                  <Decision onDecide={(action, reason) => decide.mutate({ kind: "chat", id: m.id, action, reason })} />
                </div>
              ))}
            </section>
          )}
          {decide.isError && <p className="error">{t("genericError")}</p>}
        </div>
        <section className="card stack">
          <h2>{t("words")}</h2>
          <p className="muted">{t("wordsHint")}</p>
          <form
            className="row"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              if (newWord.trim()) addWord.mutate(newWord.trim());
            }}
          >
            <input aria-label={t("newWord")} placeholder={t("newWord")} value={newWord} onChange={(e) => setNewWord(e.target.value)} style={{ flex: 1, border: "1px solid var(--border)", borderRadius: 6, padding: "8px 10px" }} />
            <button className="btn btn-primary" type="submit" disabled={addWord.isPending}>
              {t("addWord")}
            </button>
          </form>
          <table className="table">
            <tbody>
              {words.data?.map((w) => (
                <tr key={w}>
                  <td>{w}</td>
                  <td className="num">
                    <button className="btn btn-quiet" type="button" onClick={() => removeWord.mutate(w)}>
                      {t("remove")}
                    </button>
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
