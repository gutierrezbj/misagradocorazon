import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ROLES, type Role } from "@msc/shared";
import { useState } from "react";

import { api } from "../api.ts";
import { useAuth } from "../auth.tsx";
import { useI18n, type I18nKey } from "../i18n.tsx";
import type { AdminUser } from "../types.ts";

export function Users() {
  const { t, lang } = useI18n();
  const { me } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["users", search],
    queryFn: () => api<AdminUser[]>(`/admin/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  });
  const patch = useMutation({
    mutationFn: (v: { id: string; role?: Role; blocked?: boolean }) => api(`/admin/users/${v.id}`, { method: "PATCH", body: { role: v.role, blocked: v.blocked } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { dateStyle: "medium" }).format(new Date(iso));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{t("usersTitle")}</h1>
          <div className="page-sub">{t("usersSub")}</div>
        </div>
        <input aria-label={t("search")} placeholder={t("search")} value={search} onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 280, border: "1px solid var(--border)", borderRadius: 6, padding: "9px 11px" }} />
      </div>
      <section className="card">
        {isLoading && <p className="muted">{t("loading")}</p>}
        {patch.isError && <p className="error">{t("genericError")}</p>}
        <table className="table">
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("email")}</th>
              <th>{t("role")}</th>
              <th>{t("joined")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.map((u) => {
              const self = u.id === me?.id;
              return (
                <tr key={u.id}>
                  <td>
                    {u.name} {self && <span className="muted">({t("you")})</span>} {u.blocked && <span className="badge blocked">{t("blocked")}</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <select aria-label={t("role")} value={u.role} disabled={self || patch.isPending} onChange={(e) => patch.mutate({ id: u.id, role: e.target.value as Role })} style={{ border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", background: "#fff" }}>
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {t(`role_${r}` as I18nKey)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{fmt(u.createdAt)}</td>
                  <td className="num">
                    {!self && (
                      <button className="btn btn-quiet" type="button" onClick={() => patch.mutate({ id: u.id, blocked: !u.blocked })}>
                        {u.blocked ? t("unblock") : t("block")}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}
