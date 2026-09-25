import { useState } from "react";
import { Text } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

import { fonts, makeStyles, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { AdminShell, AdminCard, AdminField } from "@/src/components/admin";
import { AppButton, useToast } from "@/src/components/ui";

export default function AdminTransparency() {
  const styles = useStyles();
  const toast = useToast();

  const { data } = useQuery({ queryKey: ["admin", "transparency"], queryFn: () => api("/admin/transparency") });
  const records = data?.records ?? [];

  const [form, setForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    income: "",
    impact: "",
    transferred: "",
    causeName: "",
    note: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: () =>
      api("/admin/transparency", {
        method: "POST",
        body: {
          month: form.month,
          total_income: parseFloat(form.income) || 0,
          impact_amount: parseFloat(form.impact) || 0,
          transferred: parseFloat(form.transferred) || 0,
          cause_name: form.causeName,
          note: form.note,
          published: true,
        },
      }),
    onSuccess: () => {
      toast("Registro publicado", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "transparency"] });
      queryClient.invalidateQueries({ queryKey: ["transparency"] });
    },
  });

  return (
    <AdminShell title="Transparencia">
      <Text style={styles.section}>Nuevo registro mensual</Text>
      <AdminField label="Mes (YYYY-MM)" value={form.month} onChangeText={(v: string) => set("month", v)} />
      <AdminField label="Ingresos totales (USD)" value={form.income} onChangeText={(v: string) => set("income", v)} />
      <AdminField label="Impacto 20% (USD)" value={form.impact} onChangeText={(v: string) => set("impact", v)} />
      <AdminField label="Transferido (USD)" value={form.transferred} onChangeText={(v: string) => set("transferred", v)} />
      <AdminField label="Nombre de la causa" value={form.causeName} onChangeText={(v: string) => set("causeName", v)} />
      <AdminField label="Nota" value={form.note} onChangeText={(v: string) => set("note", v)} multiline />
      <AppButton testID="save-transparency-button" label="Publicar" onPress={() => saveMut.mutate()} loading={saveMut.isPending} icon="check" />

      <Text style={styles.section}>Registros publicados</Text>
      {records.map((r: any) => (
        <AdminCard key={r.month}>
          <Text style={styles.month}>{r.month} · {r.cause_name}</Text>
          <Text style={styles.amount}>Ingresos ${r.total_income} · Impacto ${r.impact_amount} · Transferido ${r.transferred}</Text>
          <Text style={styles.note}>{r.note}</Text>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  month: { fontFamily: fonts.displaySemibold, fontSize: 16, color: c.onSurface },
  amount: { fontFamily: fonts.body, fontSize: 13, color: c.onSurfaceSecondary, marginTop: 4 },
  note: { fontFamily: fonts.body, fontSize: 13, color: c.muted, marginTop: 4, fontStyle: "italic" },
}));
