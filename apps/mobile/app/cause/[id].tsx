// Ficha completa de una causa (SDD-02 Pilar 3; especificación §2.3): fotos, qué se hará con el
// dinero, presupuesto desglosado, responsable, plazo y avances. Fuera del flujo de compra de la vela.
import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import type { CauseDetail } from "@/src/types";
import { useI18n } from "@/src/i18n";
import { Icon } from "@/src/components/ui";
import { formatUsd } from "@/src/money";

export default function CauseScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, loc, lang } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: cause, isLoading, isError } = useQuery({ queryKey: ["cause", id], queryFn: () => api<CauseDetail>(`/causes/${id}`) });
  const locale = lang === "en" ? "en-US" : "es-MX";
  const usd = (cents: number) => formatUsd(cents, lang);
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });

  const back = (
    <Pressable
      testID="back-button"
      accessibilityRole="button"
      accessibilityLabel={t("back")}
      onPress={() => router.back()}
      style={[styles.back, { top: insets.top + spacing.sm }]}
    >
      <Icon name="arrow-left" size={22} color="#FDFBF7" />
    </Pressable>
  );

  if (isLoading)
    return (
      <View style={styles.root}>
        <ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} />
      </View>
    );
  if (isError || !cause) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 80, paddingHorizontal: spacing.lg }]}>
        <StatusBar style="dark" />
        <Pressable
          testID="back-button"
          accessibilityRole="button"
          accessibilityLabel={t("back")}
          onPress={() => router.back()}
          style={[styles.back, { top: insets.top + spacing.sm, backgroundColor: colors.brand }]}
        >
          <Icon name="arrow-left" size={22} color="#FDFBF7" />
        </Pressable>
        <Text style={styles.sectionText}>{t("causeNotFound")}</Text>
      </View>
    );
  }

  const [cover, ...more] = cause.photos;
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={{ uri: cover }} style={styles.heroImg} contentFit="cover" />
          <LinearGradient colors={["rgba(28,15,14,0.5)", "transparent", "rgba(28,15,14,0.95)"]} style={styles.heroScrim} />
          {back}
          <View style={styles.heroText}>
            <Text style={styles.name}>{loc(cause.name)}</Text>
            <View style={styles.row}>
              <Icon name="map-pin" size={14} color={colors.goldSoft} />
              <Text style={styles.heroSub}>{cause.location}</Text>
            </View>
          </View>
        </View>

        {more.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gallery} testID="cause-gallery">
            {more.map((uri) => (
              <Image key={uri} source={{ uri }} style={styles.thumb} contentFit="cover" />
            ))}
          </ScrollView>
        )}

        <View style={styles.body}>
          <View style={styles.metaRow}>
            <Meta icon="user" label={t("responsible")} value={cause.responsible} />
            <Meta icon="clock" label={t("timelineLabel")} value={cause.timeline} />
          </View>

          <Text style={styles.sectionTitle}>{t("aboutCause")}</Text>
          <Text style={styles.sectionText}>{loc(cause.description)}</Text>

          {cause.fundsUse && (
            <>
              <Text style={styles.sectionTitle}>{t("fundsUse")}</Text>
              <Text testID="cause-funds-use" style={styles.sectionText}>
                {loc(cause.fundsUse)}
              </Text>
            </>
          )}

          <Text style={styles.sectionTitle}>{t("budgetBreakdown")}</Text>
          <View style={styles.budget} testID="cause-budget">
            {cause.budgetItems.map((item, n) => (
              <View key={n} style={styles.budgetRow}>
                <Text style={styles.budgetConcept}>{loc(item.concept)}</Text>
                <Text style={styles.budgetAmount}>{usd(item.amountCents)}</Text>
              </View>
            ))}
            <View style={[styles.budgetRow, styles.budgetTotalRow]}>
              <Text style={styles.budgetTotal}>{t("budgetTotal")}</Text>
              <Text testID="cause-budget-total" style={styles.budgetTotal}>
                {usd(cause.budgetCents)}
              </Text>
            </View>
          </View>

          {cause.updates.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t("progressUpdates")}</Text>
              {cause.updates.map((u) => (
                <View key={u.id} style={styles.update}>
                  <Text style={styles.updateDate}>{date(u.createdAt)}</Text>
                  <Text style={styles.sectionText}>{loc(u.text)}</Text>
                  {!!u.photoUrl && <Image source={{ uri: u.photoUrl }} style={styles.updatePhoto} contentFit="cover" />}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Meta({ icon, label, value }: { icon: string; label: string; value: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.row}>
        <Icon name={icon} size={14} color={colors.muted} />
        <Text style={styles.metaLabel}>{label}</Text>
      </View>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { height: 300 },
  heroImg: { width: "100%", height: "100%", backgroundColor: c.surfaceTertiary },
  heroScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  back: {
    position: "absolute",
    left: spacing.md,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  heroText: { position: "absolute", bottom: spacing.lg, left: spacing.md, right: spacing.md },
  name: { fontFamily: fonts.displayBold, fontSize: 30, color: "#FDFBF7" },
  heroSub: { fontFamily: fonts.body, fontSize: 15, color: c.goldSoft },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  gallery: { gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  thumb: { width: 132, height: 96, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  body: { padding: spacing.lg },
  metaRow: { flexDirection: "row", gap: spacing.md },
  metaLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.muted, textTransform: "uppercase" },
  metaValue: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurface, marginTop: 2 },
  sectionTitle: { fontFamily: fonts.displaySemibold, fontSize: 22, color: c.brand, marginTop: spacing.lg, marginBottom: spacing.sm },
  sectionText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: c.onSurfaceSecondary },
  budget: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, borderWidth: 1, borderColor: c.border, paddingHorizontal: spacing.md },
  budgetRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing.md, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border },
  budgetConcept: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: c.onSurface },
  budgetAmount: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurface },
  budgetTotalRow: { borderBottomWidth: 0 },
  budgetTotal: { fontFamily: fonts.bodyBold, fontSize: 16, color: c.brand },
  update: { marginBottom: spacing.md },
  updateDate: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.muted, marginBottom: 4 },
  updatePhoto: { width: "100%", height: 180, borderRadius: radius.md, marginTop: spacing.sm, backgroundColor: c.surfaceTertiary },
}));
