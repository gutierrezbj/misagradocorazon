// Registro de auditoría (SDD-02, panel): quién hizo cada cambio y cuándo. Solo superadmin, solo lectura.
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "../api.ts";
import { useI18n, type I18nKey } from "../i18n.tsx";
import type { AuditPage } from "../types.ts";

const ENTITIES = ["cause", "mass", "saint", "daily_content", "intention", "chat_message", "moderation_word", "push_campaign", "user"] as const;

// Detalle compacto: "campo: valor" con los valores anidados en una línea.
function detail(data: Record<string, unknown> | null) {
  if (!data) return "";
  return Object.entries(data)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export function Audit() {
  const { t, lang } = useI18n();
  const [entity, setEntity] = useState<(typeof ENTITIES)[number] | "">("");
  const q = useInfiniteQuery({
    queryKey: ["audit", entity],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams();
      if (entity) params.set("entity", entity);
      if (pageParam) params.set("cursor", pageParam);
      const qs = params.toString();
      return api<AuditPage>(`/admin/audit${qs ? `?${qs}` : ""}`);
    },
    initialPageParam: "",
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
  const entries = q.data?.pages.flatMap((p) => p.entries) ?? [];
  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  const actionLabel = (a: string) => {
    const key = `audit_${a}` as I18nKey;
    try {
      return t(key);
    } catch {
      return a; // acción nueva sin traducir: se muestra tal cual
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("auditTitle")}</h1>
          <div className="page-sub">{t("auditSub")}</div>
        </div>
        <select
          aria-label={t("colType")}
          value={entity}
          onChange={(e) => setEntity(e.target.value as typeof entity)}
          style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "9px 11px", background: "#fff", fontSize: 15 }}
        >
          <option value="">{t("auditAllEntities")}</option>
          {ENTITIES.map((en) => (
            <option key={en} value={en}>
              {t(`entity_${en}` as I18nKey)}
            </option>
          ))}
        </select>
      </div>
      <section className="card">
        {q.isLoading && <p className="muted">{t("loading")}</p>}
        {q.isError && <p className="error">{t("genericError")}</p>}
        {q.isSuccess && entries.length === 0 && <p className="muted">{t("auditEmpty")}</p>}
        {entries.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>{t("colDate")}</th>
                <th>{t("auditWho")}</th>
                <th>{t("auditWhat")}</th>
                <th>{t("colDetail")}</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmt(e.createdAt)}</td>
                  <td>
                    {e.actor.deleted ? (
                      <span className="muted">{t("auditDeletedAccount")}</span>
                    ) : (
                      <>
                        {e.actor.name}
                        <div className="muted">{e.actor.role ? t(`role_${e.actor.role}` as I18nKey) : ""}</div>
                      </>
                    )}
                  </td>
                  <td>
                    {actionLabel(e.action)}
                    <div className="muted" style={{ wordBreak: "break-all" }}>{e.entityId}</div>
                  </td>
                  <td className="muted" style={{ wordBreak: "break-word" }}>{detail(e.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {q.hasNextPage && (
          <button className="btn" type="button" style={{ marginTop: 12 }} disabled={q.isFetchingNextPage} onClick={() => void q.fetchNextPage()}>
            {t("loadMore")}
          </button>
        )}
      </section>
    </>
  );
}
