import { useState } from "react";
import { View, Text, Pressable, FlatList, Modal, TextInput, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api, ApiError } from "@/src/api";
import type { Intention } from "@/src/types";
import { queryClient } from "@/src/query-client";
import { useI18n } from "@/src/i18n";
import { Chip, Icon, AppButton, useToast } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";

const CATS = [
  { key: "all", label: "catAll" },
  { key: "salud", label: "catSalud" },
  { key: "familia", label: "catFamilia" },
  { key: "trabajo", label: "catTrabajo" },
  { key: "difuntos", label: "catDifuntos" },
  { key: "agradecimiento", label: "catAgradecimiento" },
] as const;

export default function Muro() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const toast = useToast();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const [cat, setCat] = useState("all");
  const [modal, setModal] = useState(false);
  const [text, setText] = useState("");
  const [newCat, setNewCat] = useState("salud");

  const { data, isLoading } = useQuery({
    queryKey: ["intentions", cat],
    queryFn: () => api<Intention[]>(`/intentions${cat !== "all" ? `?category=${cat}` : ""}`),
  });
  const intentions = data ?? [];

  const prayMut = useMutation({
    mutationFn: (id: string) => api(`/intentions/${id}/pray`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["intentions"] }),
  });

  const publishMut = useMutation({
    mutationFn: () => api<{ id: string; status: "approved" | "pending" }>("/intentions", { method: "POST", body: { text, category: newCat } }),
    onSuccess: (res) => {
      setModal(false);
      setText("");
      queryClient.invalidateQueries({ queryKey: ["intentions"] });
      toast(res.status === "pending" ? t("intentionFlagged") : t("intentionSent"), res.status === "pending" ? "info" : "success");
    },
    onError: (e) => toast(e instanceof ApiError && e.code === "rate_limited" ? t("tooFast") : t("authError"), "error"),
  });

  const catLabel = (k: string) => t(CATS.find((c) => c.key === k)?.label ?? "catAll");

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>{t("wallTitle")}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}
          style={styles.chipRow}
        >
          {CATS.map((c) => (
            <Chip key={c.key} testID={`cat-${c.key}`} label={t(c.label)} active={cat === c.key} onPress={() => setCat(c.key)} />
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={intentions}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: bottomChrome + 96 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.empty}>{t("wallEmpty")}</Text>}
          renderItem={({ item }) => (
            <View testID={`intention-${item.id}`} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.author}>{item.author}</Text>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{catLabel(item.category)}</Text>
                </View>
              </View>
              <Text style={styles.intentionText}>{item.text}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.prayCount}>
                  {item.prayCount} {t("peoplePraying")}
                </Text>
                <Pressable
                  testID={`pray-${item.id}`}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    prayMut.mutate(item.id);
                  }}
                  style={styles.prayBtn}
                >
                  <Icon name="heart" size={16} color={colors.onBrandSecondary} />
                  <Text style={styles.prayBtnText}>{t("prayForYou")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      {/* FAB */}
      <Pressable
        testID="new-intention-fab"
        onPress={() => setModal(true)}
        style={[styles.fab, { bottom: bottomChrome + 16 }]}
      >
        <Icon name="edit-3" size={22} color={colors.onBrandPrimary} />
      </Pressable>

      {/* Publish modal */}
      <Modal visible={modal} animationType="slide" transparent onRequestClose={() => setModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { paddingBottom: insets.bottom + spacing.md }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{t("shareIntention")}</Text>
            <TextInput
              testID="intention-input"
              value={text}
              onChangeText={setText}
              multiline
              placeholder={t("intentionPlaceholder")}
              placeholderTextColor={colors.muted}
              style={styles.modalInput}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
              {CATS.filter((c) => c.key !== "all").map((c) => (
                <Chip key={c.key} label={t(c.label)} active={newCat === c.key} onPress={() => setNewCat(c.key)} />
              ))}
            </ScrollView>
            <AppButton
              testID="publish-intention-button"
              label={t("publish")}
              onPress={() => text.trim() && publishMut.mutate()}
              loading={publishMut.isPending}
            />
            <Pressable onPress={() => setModal(false)} style={{ alignItems: "center", paddingVertical: spacing.md }}>
              <Text style={styles.cancel}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.divider },
  title: { fontFamily: fonts.displayBold, fontSize: 30, color: c.onSurface, paddingHorizontal: spacing.md },
  chipRow: { maxHeight: 56 },
  empty: { fontFamily: fonts.body, fontStyle: "italic", color: c.muted, textAlign: "center", marginTop: spacing.xl, fontSize: 16 },
  card: {
    backgroundColor: c.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  author: { fontFamily: fonts.displaySemibold, fontSize: 19, color: c.brand },
  catBadge: { backgroundColor: c.brandTertiary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4 },
  catBadgeText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onBrandTertiary },
  intentionText: { fontFamily: fonts.body, fontSize: 17, color: c.onSurface, lineHeight: 26, marginTop: spacing.sm },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  prayCount: { fontFamily: fonts.body, fontSize: 14, color: c.muted },
  prayBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.brandSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 40,
  },
  prayBtnText: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.onBrandSecondary },
  fab: {
    position: "absolute",
    right: spacing.md,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: c.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: c.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: "center", marginBottom: spacing.md },
  modalTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: c.onSurface, marginBottom: spacing.md },
  modalInput: {
    minHeight: 110,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: c.onSurface,
    backgroundColor: c.surfaceSecondary,
    textAlignVertical: "top",
  },
  cancel: { fontFamily: fonts.bodyMedium, fontSize: 15, color: c.muted },
}));
