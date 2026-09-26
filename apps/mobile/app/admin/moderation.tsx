import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { AdminShell, AdminCard, AdminField } from "@/src/components/admin";
import { AppButton, Icon, useToast } from "@/src/components/ui";

export default function AdminModeration() {
  const styles = useStyles();
  const { colors } = useTheme();
  const toast = useToast();
  const [word, setWord] = useState("");

  const { data } = useQuery({ queryKey: ["admin", "mod", "intentions"], queryFn: () => api("/admin/moderation/intentions?status=pending") });
  const { data: wordsData } = useQuery({ queryKey: ["admin", "mod", "words"], queryFn: () => api("/admin/moderation/words") });

  const pending = data?.intentions ?? [];
  const words = wordsData?.words ?? [];

  const actMut = useMutation({
    mutationFn: ({ id, action }: any) => api(`/admin/moderation/intentions/${id}`, { method: "POST", body: { action } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "mod", "intentions"] }),
  });
  const addWordMut = useMutation({
    mutationFn: () => api("/admin/moderation/words", { method: "POST", body: { word } }),
    onSuccess: () => {
      setWord("");
      queryClient.invalidateQueries({ queryKey: ["admin", "mod", "words"] });
    },
  });
  const delWordMut = useMutation({
    mutationFn: (w: string) => api(`/admin/moderation/words/${encodeURIComponent(w)}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "mod", "words"] }),
  });

  return (
    <AdminShell title="Moderación">
      <Text style={styles.section}>Cola de intenciones ({pending.length})</Text>
      {pending.length === 0 && <Text style={styles.empty}>No hay intenciones pendientes.</Text>}
      {pending.map((it: any) => (
        <AdminCard key={it.id}>
          <Text style={styles.author}>{it.author_name} · {it.category}</Text>
          <Text style={styles.text}>{it.text}</Text>
          <View style={styles.actions}>
            <Pressable testID={`approve-${it.id}`} onPress={() => actMut.mutate({ id: it.id, action: "approve" })} style={[styles.actBtn, { backgroundColor: colors.success }]}>
              <Icon name="check" size={16} color={colors.onSuccess} />
              <Text style={styles.actText}>Aprobar</Text>
            </Pressable>
            <Pressable testID={`hide-${it.id}`} onPress={() => actMut.mutate({ id: it.id, action: "hide" })} style={[styles.actBtn, { backgroundColor: colors.error }]}>
              <Icon name="eye-off" size={16} color={colors.onError} />
              <Text style={styles.actText}>Ocultar</Text>
            </Pressable>
          </View>
        </AdminCard>
      ))}

      <Text style={styles.section}>Palabras filtradas</Text>
      <View style={styles.wordRow}>
        {words.map((w: any) => (
          <Pressable key={w.word} onPress={() => delWordMut.mutate(w.word)} style={styles.wordChip}>
            <Text style={styles.wordText}>{w.word}</Text>
            <Icon name="x" size={13} color={colors.muted} />
          </Pressable>
        ))}
      </View>
      <AdminField label="Añadir palabra" value={word} onChangeText={setWord} placeholder="palabra o frase" />
      <AppButton label="Añadir" onPress={() => word.trim() && addWordMut.mutate()} icon="plus" />
    </AdminShell>
  );
}

const useStyles = makeStyles((c) => ({
  section: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, marginTop: spacing.md, marginBottom: spacing.sm },
  empty: { fontFamily: fonts.body, fontStyle: "italic", color: c.muted, marginBottom: spacing.md },
  author: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.brand },
  text: { fontFamily: fonts.body, fontSize: 15, color: c.onSurface, marginVertical: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
  actBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radius.md, paddingHorizontal: spacing.md, height: 40 },
  actText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: "#fff" },
  wordRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  wordChip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.surfaceTertiary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  wordText: { fontFamily: fonts.body, fontSize: 14, color: c.onSurface },
}));
