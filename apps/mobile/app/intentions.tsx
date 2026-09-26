// Intenciones personales privadas (SDD-02, Pilar 1): "por quién rezo". Se guardan cifradas en el
// servidor (GDPR art. 9) y solo las ve su autor. No se comparten ni se publican nunca.
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { api } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppButton, Icon, useToast } from "@/src/components/ui";
import type { PrivateIntention } from "@/src/types";

const MAX = 500;

export default function Intentions() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useI18n();
  const toast = useToast();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["private-intentions"], queryFn: () => api<PrivateIntention[]>("/me/intentions") });
  const add = useMutation({
    mutationFn: (value: string) => api<PrivateIntention>("/me/intentions", { method: "POST", body: { text: value } }),
    // Solo se limpia si no se ha escrito nada nuevo mientras se guardaba.
    onSuccess: (_saved, value) => {
      setText((current) => (current.trim() === value ? "" : current));
      void qc.invalidateQueries({ queryKey: ["private-intentions"] });
    },
    onError: () => toast(t("genericError"), "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/me/intentions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setConfirming(null);
      void qc.invalidateQueries({ queryKey: ["private-intentions"] });
    },
    onError: () => toast(t("genericError"), "error"),
  });
  const fmt = (iso: string) => new Intl.DateTimeFormat(lang === "en" ? "en-US" : "es-MX", { dateStyle: "medium" }).format(new Date(iso));

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("back")}>
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("privateIntentions")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
        <View style={styles.privacy}>
          <Icon name="lock" size={18} color={colors.brandSecondary} />
          <Text style={styles.privacyText}>{t("privateIntentionsNote")}</Text>
        </View>

        <TextInput
          testID="private-intention-input"
          value={text}
          onChangeText={setText}
          placeholder={t("privateIntentionPlaceholder")}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={MAX}
          style={styles.input}
        />
        <Text style={styles.counter}>{text.length}/{MAX}</Text>
        <AppButton testID="add-private-intention" label={t("addIntention")} icon="plus" onPress={() => add.mutate(text.trim())} loading={add.isPending} disabled={!text.trim()} />

        <View style={{ height: spacing.lg }} />
        {isLoading && <ActivityIndicator color={colors.brand} />}
        {data?.length === 0 && <Text style={styles.empty}>{t("noPrivateIntentions")}</Text>}
        {data?.map((i) => (
          <View key={i.id} style={styles.item} testID="private-intention">
            <View style={{ flex: 1 }}>
              <Text style={styles.itemText}>{i.text}</Text>
              <Text style={styles.itemDate}>{fmt(i.createdAt)}</Text>
            </View>
            {confirming === i.id ? (
              <View style={styles.confirm}>
                <Pressable testID="confirm-delete" onPress={() => remove.mutate(i.id)} accessibilityRole="button" style={styles.confirmBtn}>
                  <Text style={[styles.confirmText, { color: colors.error }]}>{t("delete")}</Text>
                </Pressable>
                <Pressable onPress={() => setConfirming(null)} accessibilityRole="button" style={styles.confirmBtn}>
                  <Text style={styles.confirmText}>{t("cancel")}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable testID="delete-private-intention" onPress={() => setConfirming(i.id)} accessibilityRole="button" accessibilityLabel={t("delete")} style={styles.trash}>
                <Icon name="trash-2" size={18} color={colors.muted} />
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.displaySemibold, fontSize: 20, color: c.onSurface },
  privacy: { flexDirection: "row", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  privacyText: { flex: 1, fontFamily: fonts.body, fontSize: 16, lineHeight: 22, color: c.onSurfaceSecondary },
  input: { minHeight: 110, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.md, fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: c.onSurface, backgroundColor: c.surfaceSecondary, textAlignVertical: "top" },
  counter: { alignSelf: "flex-end", fontFamily: fonts.body, fontSize: 14, color: c.muted, marginVertical: spacing.xs },
  empty: { fontFamily: fonts.body, fontSize: 16, color: c.muted, textAlign: "center", marginTop: spacing.lg },
  item: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  itemText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: c.onSurface },
  itemDate: { fontFamily: fonts.body, fontSize: 14, color: c.muted, marginTop: 4 },
  trash: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  confirm: { alignItems: "flex-end" },
  confirmBtn: { paddingVertical: 6, paddingHorizontal: 4 },
  confirmText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.onSurfaceSecondary },
}));
