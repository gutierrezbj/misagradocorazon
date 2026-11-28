// US-35: cuántos fieles aceptaron recibir novedades y ayudar a mejorar la app, y la lista en CSV.
// Descargar la lista queda en el registro de cambios (lleva correos).
import { useMutation, useQuery } from "@tanstack/react-query";

import { api } from "../api.ts";
import { downloadCsv, toCsv } from "../csv.ts";
import { useI18n } from "../i18n.tsx";

type Subscriber = { name: string; email: string; language: string; newsConsentAt: string | null };

export function NewsSubscribers() {
  const { t } = useI18n();
  const { data } = useQuery({ queryKey: ["news-subscribers"], queryFn: () => api<{ count: number }>("/admin/news-subscribers") });
  const exportList = useMutation({
    mutationFn: () => api<{ count: number; items: Subscriber[] }>("/admin/news-subscribers/export", { method: "POST" }),
    onSuccess: ({ items }) => {
      const csv = toCsv(
        [t("name"), t("email"), t("language"), t("newsSince")],
        items.map((s) => [s.name, s.email, s.language, s.newsConsentAt]),
      );
      downloadCsv(`novedades-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    },
  });

  return (
    <section className="card" style={{ marginBottom: 20 }}>
      <div className="page-head" style={{ marginBottom: 0 }}>
        <div>
          <h2>{t("newsTitle")}</h2>
          <div className="page-sub">{data ? t("newsCount", { n: data.count }) : t("loading")}</div>
        </div>
        <button className="btn btn-primary" type="button" disabled={!data?.count || exportList.isPending} onClick={() => exportList.mutate()}>
          {t("newsExport")}
        </button>
      </div>
      {exportList.isError && <p className="error">{t("genericError")}</p>}
    </section>
  );
}
