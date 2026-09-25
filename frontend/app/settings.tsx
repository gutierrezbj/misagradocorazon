import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { Icon, useToast } from "@/src/components/ui";

export default function Settings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const toast = useToast();
  const { user, setUser } = useAuth();

  const changeLang = async (l: "es" | "en") => {
    setLang(l);
    try {
      const res = await api<{ user: any }>("/auth/profile", { method: "PUT", body: { language: l } });
      setUser(res.user);
    } catch {}
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back}>
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("settings")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
        <Text style={styles.sectionTitle}>{t("language")}</Text>
        <View style={styles.langRow}>
          {(["es", "en"] as const).map((l) => (
            <Pressable key={l} testID={`set-lang-${l}`} onPress={() => changeLang(l)} style={[styles.langChip, lang === l && styles.langChipActive]}>
              <Text style={[styles.langText, lang === l && { color: colors.onBrandPrimary }]}>{l === "es" ? "Español" : "English"}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t("notifications")}</Text>
        <Row label={t("morning")} value={user?.morning_time ?? "—"} />
        <Row label={t("angelus")} value={user?.angelus_time ?? "—"} />
        <Row label={t("night")} value={user?.night_time ?? "—"} />
        <Text style={styles.note}>Las notificaciones push funcionan al generar el build en un dispositivo real.</Text>

        <Text style={styles.sectionTitle}>Información</Text>
        <Row label={t("privacy")} chevron />
        <Row label={t("terms")} chevron />
        <Row label={t("support")} value="soporte@misagradocorazon.com" />
      </ScrollView>
    </View>
  );
}

function Row({ label, value, chevron }: { label: string; value?: string; chevron?: boolean }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {chevron && <Icon name="chevron-right" size={18} color={colors.muted} />}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.displaySemibold, fontSize: 20, color: c.onSurface },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  langRow: { flexDirection: "row", gap: spacing.sm },
  langChip: { flex: 1, height: 48, borderRadius: radius.md, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: c.surfaceSecondary },
  langChipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  langText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurfaceSecondary },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  rowLabel: { fontFamily: fonts.bodyMedium, fontSize: 16, color: c.onSurface },
  rowValue: { fontFamily: fonts.body, fontSize: 15, color: c.muted },
  note: { fontFamily: fonts.body, fontSize: 13, color: c.muted, fontStyle: "italic", marginTop: 4 },
}));
