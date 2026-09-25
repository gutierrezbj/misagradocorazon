import { useState } from "react";
import { View, Text } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

import { fonts, makeStyles, spacing } from "@/src/theme";
import { api } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { AdminShell, AdminCard, AdminField } from "@/src/components/admin";
import { AppButton, useToast } from "@/src/components/ui";

export default function AdminMasses() {
  const styles = useStyles();
  const toast = useToast();

  const { data } = useQuery({ queryKey: ["admin", "masses"], queryFn: () => api("/masses", { auth: false }) });
  const masses = data?.masses ?? [];

  const [form, setForm] = useState({
    titleEs: "Misa Dominical",
    titleEn: "Sunday Mass",
    youtube: "",
    date: new Date().toISOString().slice(0, 10),
    time: "16:00",
    special: false,
  });
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: () =>
      api("/admin/masses", {
        method: "POST",
        body: {
          title: { es: form.titleEs, en: form.titleEn },
          youtube_url: form.youtube,
          scheduled_at: new Date(`${form.date}T${form.time}:00Z`).toISOString(),
          is_special: form.special,
          status: "scheduled",
        },
      }),
    onSuccess: () => {
      toast("Misa programada", "success");
      queryClient.invalidateQueries({ queryKey: ["admin", "masses"] });
      queryClient.invalidateQueries({ queryKey: ["mass", "next"] });
    },
  });

  return (
    <AdminShell title="Misas en vivo">
      <Text style={styles.section}>Programar misa</Text>
      <AdminField label="Título (ES)" value={form.titleEs} onChangeText={(v: string) => set("titleEs", v)} />
      <AdminField label="Título (EN)" value={form.titleEn} onChangeText={(v: string) => set("titleEn", v)} />
      <AdminField label="URL de YouTube Live" value={form.youtube} onChangeText={(v: string) => set("youtube", v)} placeholder="https://youtube.com/watch?v=..." />
      <AdminField label="Fecha (YYYY-MM-DD)" value={form.date} onChangeText={(v: string) => set("date", v)} />
      <AdminField label="Hora UTC (HH:MM)" value={form.time} onChangeText={(v: string) => set("time", v)} />
      <AppButton testID="create-mass-button" label="Programar" onPress={() => createMut.mutate()} loading={createMut.isPending} icon="calendar" />

      <Text style={styles.section}>Misas programadas</Text>
      {masses.map((m: any) => (
        <AdminCard key={m.id}>
          <Text style={styles.title}>{m.title?.es}</Text>
          <Text style={styles.meta}>{new Date(m.scheduled_at).toLocaleString()}</Text>
          <Text style={styles.url}>{m.youtube_url}</Text>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  title: { fontFamily: fonts.displaySemibold, fontSize: 17, color: c.onSurface },
  meta: { fontFamily: fonts.body, fontSize: 13, color: c.muted, marginTop: 2 },
  url: { fontFamily: fonts.body, fontSize: 12, color: c.brand, marginTop: 4 },
}));
