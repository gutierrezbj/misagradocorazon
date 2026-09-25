import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { AdminShell, AdminCard, AdminField } from "@/src/components/admin";
import { AppButton, Icon, useToast } from "@/src/components/ui";

const STATUSES = ["voting", "won", "funded", "archived"];

export default function AdminCauses() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();

  const { data } = useQuery({ queryKey: ["admin", "causes"], queryFn: () => api("/admin/causes") });
  const causes = data?.causes ?? [];

  const [form, setForm] = useState({
    month: new Date().toISOString().slice(0, 7),
    nameEs: "",
    nameEn: "",
    location: "",
    responsible: "",
    budget: "",
    photo: "",
    descEs: "",
    descEn: "",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const createMut = useMutation({
    mutationFn: () =>
      api("/admin/causes", {
        method: "POST",
        body: {
          month: form.month,
          name: { es: form.nameEs, en: form.nameEn },
          location: form.location,
          responsible: form.responsible,
          budget: parseFloat(form.budget) || 0,
          photos: form.photo ? [form.photo] : [],
          description: { es: form.descEs, en: form.descEn },
          status: "voting",
        },
      }),
    onSuccess: () => {
      toast("Causa creada", "success");
      setForm({ ...form, nameEs: "", nameEn: "", location: "", responsible: "", budget: "", photo: "", descEs: "", descEn: "" });
      queryClient.invalidateQueries({ queryKey: ["admin", "causes"] });
    },
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: any) => api(`/admin/causes/${id}/status`, { method: "POST", body: { status } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "causes"] }),
  });

  return (
    <AdminShell title="Causas">
      <Text style={styles.section}>Nueva causa</Text>
      <AdminField label="Mes (YYYY-MM)" value={form.month} onChangeText={(v: string) => set("month", v)} />
      <AdminField label="Nombre (ES)" value={form.nameEs} onChangeText={(v: string) => set("nameEs", v)} />
      <AdminField label="Nombre (EN)" value={form.nameEn} onChangeText={(v: string) => set("nameEn", v)} />
      <AdminField label="Ubicación" value={form.location} onChangeText={(v: string) => set("location", v)} />
      <AdminField label="Responsable" value={form.responsible} onChangeText={(v: string) => set("responsible", v)} />
      <AdminField label="Presupuesto (USD)" value={form.budget} onChangeText={(v: string) => set("budget", v)} />
      <AdminField label="URL de foto" value={form.photo} onChangeText={(v: string) => set("photo", v)} />
      <AdminField label="Descripción (ES)" value={form.descEs} onChangeText={(v: string) => set("descEs", v)} multiline />
      <AdminField label="Descripción (EN)" value={form.descEn} onChangeText={(v: string) => set("descEn", v)} multiline />
      <AppButton testID="create-cause-button" label="Crear causa" onPress={() => createMut.mutate()} loading={createMut.isPending} icon="plus" />

      <Text style={styles.section}>Causas existentes</Text>
      {causes.map((c: any) => (
        <AdminCard key={c.id}>
          <Text style={styles.causeName}>{c.name?.es}</Text>
          <Text style={styles.meta}>{c.month} · {c.votes} votos · {c.status}</Text>
          <View style={styles.statusRow}>
            {STATUSES.map((st) => (
              <Pressable key={st} onPress={() => statusMut.mutate({ id: c.id, status: st })} style={[styles.statusChip, c.status === st && { backgroundColor: colors.brandPrimary }]}>
                <Text style={[styles.statusText, c.status === st && { color: colors.onBrandPrimary }]}>{st}</Text>
              </Pressable>
            ))}
          </View>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  causeName: { fontFamily: fonts.displaySemibold, fontSize: 17, color: c.onSurface },
  meta: { fontFamily: fonts.body, fontSize: 14, color: c.muted, marginTop: 2, marginBottom: spacing.sm },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  statusChip: { backgroundColor: c.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  statusText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onSurfaceSecondary },
}));
