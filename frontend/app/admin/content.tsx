import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Image } from "expo-image";
import { useQuery, useMutation } from "@tanstack/react-query";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { AdminShell, AdminCard, AdminField } from "@/src/components/admin";
import { AppButton, useToast } from "@/src/components/ui";

export default function AdminContent() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();

  const { data } = useQuery({ queryKey: ["saints", "all"], queryFn: () => api("/saints", { auth: false }) });
  const saints = data?.saints ?? [];

  const [saint, setSaint] = useState({ name: "", feast: "", image: "", histEs: "", histEn: "", prayEs: "", prayEn: "", patron: true });
  const ss = (k: string, v: any) => setSaint((f) => ({ ...f, [k]: v }));

  const [daily, setDaily] = useState({
    date: new Date().toISOString().slice(0, 10),
    saintId: "",
    ref: "",
    gospelEs: "",
    gospelEn: "",
    medEs: "",
    medEn: "",
    mornEs: "",
    mornEn: "",
    nightEs: "",
    nightEn: "",
  });
  const ds = (k: string, v: any) => setDaily((f) => ({ ...f, [k]: v }));

  const saintMut = useMutation({
    mutationFn: () =>
      api("/admin/saints", {
        method: "POST",
        body: {
          name: saint.name,
          feast_date: saint.feast,
          image_url: saint.image,
          history: { es: saint.histEs, en: saint.histEn },
          prayer: { es: saint.prayEs, en: saint.prayEn },
          is_patron_catalog: saint.patron,
          order: 100,
        },
      }),
    onSuccess: () => {
      toast("Santo creado", "success");
      setSaint({ name: "", feast: "", image: "", histEs: "", histEn: "", prayEs: "", prayEn: "", patron: true });
      queryClient.invalidateQueries({ queryKey: ["saints", "all"] });
    },
  });

  const dailyMut = useMutation({
    mutationFn: () =>
      api("/admin/daily", {
        method: "POST",
        body: {
          date: daily.date,
          saint_of_day_id: daily.saintId || null,
          gospel_ref: daily.ref,
          gospel_text: { es: daily.gospelEs, en: daily.gospelEn },
          meditation_text: { es: daily.medEs, en: daily.medEn },
          morning_prayer: { es: daily.mornEs, en: daily.mornEn },
          night_prayer: { es: daily.nightEs, en: daily.nightEn },
        },
      }),
    onSuccess: () => {
      toast("Contenido diario guardado", "success");
      queryClient.invalidateQueries({ queryKey: ["daily"] });
    },
  });

  return (
    <AdminShell title="Santoral y contenido">
      <Text style={styles.section}>Nuevo santo</Text>
      <AdminField label="Nombre" value={saint.name} onChangeText={(v: string) => ss("name", v)} />
      <AdminField label="Fecha litúrgica (MM-DD)" value={saint.feast} onChangeText={(v: string) => ss("feast", v)} />
      <AdminField label="URL de imagen" value={saint.image} onChangeText={(v: string) => ss("image", v)} />
      <AdminField label="Historia (ES)" value={saint.histEs} onChangeText={(v: string) => ss("histEs", v)} multiline />
      <AdminField label="Historia (EN)" value={saint.histEn} onChangeText={(v: string) => ss("histEn", v)} multiline />
      <AdminField label="Oración (ES)" value={saint.prayEs} onChangeText={(v: string) => ss("prayEs", v)} multiline />
      <AdminField label="Oración (EN)" value={saint.prayEn} onChangeText={(v: string) => ss("prayEn", v)} multiline />
      <Pressable onPress={() => ss("patron", !saint.patron)} style={styles.toggle}>
        <View style={[styles.checkbox, saint.patron && { backgroundColor: colors.brandPrimary }]} />
        <Text style={styles.toggleText}>Mostrar en catálogo de santos patronos</Text>
      </Pressable>
      <AppButton testID="create-saint-button" label="Crear santo" onPress={() => saint.name && saintMut.mutate()} loading={saintMut.isPending} icon="plus" />

      <Text style={styles.section}>Santos en catálogo</Text>
      <View style={styles.saintGrid}>
        {saints.map((s: any) => (
          <Pressable key={s.id} onPress={() => ds("saintId", s.id)} style={[styles.saintTile, daily.saintId === s.id && { borderColor: colors.brandSecondary }]}>
            <Image source={{ uri: s.image_url }} style={styles.saintImg} contentFit="cover" />
            <Text style={styles.saintName} numberOfLines={1}>{s.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.section}>Contenido diario</Text>
      <AdminField label="Fecha (YYYY-MM-DD)" value={daily.date} onChangeText={(v: string) => ds("date", v)} />
      <AdminField label="ID santo del día (toca un santo arriba)" value={daily.saintId} onChangeText={(v: string) => ds("saintId", v)} />
      <AdminField label="Cita del Evangelio" value={daily.ref} onChangeText={(v: string) => ds("ref", v)} placeholder="Jn 15, 9-17" />
      <AdminField label="Evangelio (ES)" value={daily.gospelEs} onChangeText={(v: string) => ds("gospelEs", v)} multiline />
      <AdminField label="Evangelio (EN)" value={daily.gospelEn} onChangeText={(v: string) => ds("gospelEn", v)} multiline />
      <AdminField label="Meditación (ES)" value={daily.medEs} onChangeText={(v: string) => ds("medEs", v)} multiline />
      <AdminField label="Meditación (EN)" value={daily.medEn} onChangeText={(v: string) => ds("medEn", v)} multiline />
      <AdminField label="Oración mañana (ES)" value={daily.mornEs} onChangeText={(v: string) => ds("mornEs", v)} multiline />
      <AdminField label="Oración mañana (EN)" value={daily.mornEn} onChangeText={(v: string) => ds("mornEn", v)} multiline />
      <AdminField label="Oración noche (ES)" value={daily.nightEs} onChangeText={(v: string) => ds("nightEs", v)} multiline />
      <AdminField label="Oración noche (EN)" value={daily.nightEn} onChangeText={(v: string) => ds("nightEn", v)} multiline />
      <AppButton testID="save-daily-button" label="Guardar contenido diario" onPress={() => dailyMut.mutate()} loading={dailyMut.isPending} icon="save" />
    </AdminShell>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  toggle: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: c.border },
  toggleText: { fontFamily: fonts.body, fontSize: 14, color: c.onSurface },
  saintGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  saintTile: { width: 88, borderRadius: radius.md, overflow: "hidden", borderWidth: 2, borderColor: "transparent", backgroundColor: c.surfaceSecondary },
  saintImg: { width: "100%", height: 70 },
  saintName: { fontFamily: fonts.body, fontSize: 14, color: c.onSurface, padding: 4, textAlign: "center" },
}));
