import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { AdminShell, AdminCard, AdminField } from "@/src/components/admin";
import { AppButton, useToast } from "@/src/components/ui";

const LANGS = ["all", "es", "en"];

export default function AdminPush() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();

  const { data } = useQuery({ queryKey: ["admin", "push"], queryFn: () => api("/admin/push") });
  const items = data?.notifications ?? [];

  const [form, setForm] = useState({ title: "", body: "", language: "all" });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const sendMut = useMutation({
    mutationFn: () => api("/admin/push", { method: "POST", body: { title: form.title, body: form.body, language: form.language } }),
    onSuccess: () => {
      toast("Notificación registrada", "success");
      setForm({ title: "", body: "", language: "all" });
      queryClient.invalidateQueries({ queryKey: ["admin", "push"] });
    },
  });

  return (
    <AdminShell title="Notificaciones push">
      <Text style={styles.note}>El envío real de push funciona tras desplegar y generar el build con google-services.json.</Text>
      <AdminField label="Título" value={form.title} onChangeText={(v: string) => set("title", v)} />
      <AdminField label="Mensaje" value={form.body} onChangeText={(v: string) => set("body", v)} multiline />
      <Text style={styles.label}>Idioma</Text>
      <View style={styles.langRow}>
        {LANGS.map((l) => (
          <Pressable key={l} onPress={() => set("language", l)} style={[styles.langChip, form.language === l && { backgroundColor: colors.brandPrimary }]}>
            <Text style={[styles.langText, form.language === l && { color: colors.onBrandPrimary }]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <AppButton testID="send-push-button" label="Enviar / Registrar" onPress={() => form.title && sendMut.mutate()} loading={sendMut.isPending} icon="send" />

      <Text style={styles.section}>Historial</Text>
      {items.map((n: any) => (
        <AdminCard key={n.id}>
          <Text style={styles.pushTitle}>{n.title}</Text>
          <Text style={styles.pushBody}>{n.body}</Text>
          <Text style={styles.pushMeta}>{n.status} · {n.language} · {n.audience} destinatarios</Text>
        </AdminCard>
      ))}
    </AdminShell>
  );
}

const useStyles = makeStyles((c) => ({
  note: { fontFamily: fonts.body, fontSize: 14, color: c.muted, fontStyle: "italic", marginBottom: spacing.md },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onSurfaceSecondary, marginBottom: 4 },
  langRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  langChip: { backgroundColor: c.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8 },
  langText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onSurfaceSecondary },
  section: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  pushTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurface },
  pushBody: { fontFamily: fonts.body, fontSize: 14, color: c.onSurfaceSecondary, marginTop: 2 },
  pushMeta: { fontFamily: fonts.body, fontSize: 14, color: c.muted, marginTop: 4 },
}));
