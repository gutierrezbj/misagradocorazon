import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Switch } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import type { User } from "@/src/types";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { AppButton, Icon, useToast } from "@/src/components/ui";
import { openSystemSettings, pushPermission, registerForPush, type PushPermission } from "@/src/push";

export default function Settings() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang, setLang } = useI18n();
  const toast = useToast();
  const { user, setUser } = useAuth();

  const [permission, setPermission] = useState<PushPermission | null>(null);
  useEffect(() => {
    pushPermission().then(setPermission);
  }, []);

  const enablePush = async () => {
    try {
      setPermission(await registerForPush({ ask: true }));
    } catch {
      toast(t("genericError"), "error");
    }
  };

  const setPref = useCallback(
    async (key: "notifyMorning" | "notifyNight" | "notifySaint" | "notifyCommunity", value: boolean) => {
      if (!user) return;
      setUser({ ...user, [key]: value });
      try {
        setUser(await api<User>("/me", { method: "PATCH", body: { [key]: value } }));
      } catch {
        setUser(user);
        toast(t("genericError"), "error");
      }
    },
    [user, setUser, toast, t],
  );

  const changeLang = async (l: "es" | "en") => {
    setLang(l);
    try {
      setUser(await api<User>("/me", { method: "PATCH", body: { language: l } }));
    } catch {
      /* el idioma local ya ha cambiado; se sincroniza en el próximo intento */
    }
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
        {permission === "undetermined" && (
          <View style={styles.pushBox}>
            <Text style={styles.pushText}>{t("pushAsk")}</Text>
            <AppButton testID="enable-push" label={t("pushEnable")} onPress={enablePush} />
          </View>
        )}
        {permission === "denied" && (
          <View style={styles.pushBox}>
            <Text style={styles.pushText}>{t("pushDenied")}</Text>
            <AppButton testID="open-push-settings" variant="outline" label={t("pushOpenSettings")} onPress={openSystemSettings} />
          </View>
        )}
        <Toggle testID="notify-morning" label={t("morningPrayer")} hint={user?.morningTime} value={!!user?.notifyMorning} onChange={(v) => setPref("notifyMorning", v)} />
        <Toggle testID="notify-night" label={t("nightPrayer")} hint={user?.nightTime} value={!!user?.notifyNight} onChange={(v) => setPref("notifyNight", v)} />
        <Toggle testID="notify-saint" label={t("saintOfDay")} hint="07:00" value={!!user?.notifySaint} onChange={(v) => setPref("notifySaint", v)} />
        <Toggle testID="notify-community" label={t("pushCommunity")} hint={t("pushCommunityHint")} value={!!user?.notifyCommunity} onChange={(v) => setPref("notifyCommunity", v)} />
        {permission === "unavailable" && <Text style={styles.note}>{t("pushNote")}</Text>}

        <Text style={styles.sectionTitle}>{t("information")}</Text>
        <Row label={t("privacy")} chevron />
        <Row label={t("terms")} chevron />
        <Row label={t("support")} value="soporte@misagradocorazon.com" />
      </ScrollView>
    </View>
  );
}

function Toggle({ label, hint, value, onChange, testID }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; testID: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <Switch
        testID={testID}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.brandPrimary, false: colors.border }}
        thumbColor={colors.surface}
        // react-native-web usa su propio verde azulado si no se indica (prop solo de web).
        {...({ activeThumbColor: colors.surface } as object)}
        accessibilityLabel={label}
      />
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
  rowValue: { fontFamily: fonts.body, fontSize: 16, color: c.muted },
  rowHint: { fontFamily: fonts.body, fontSize: 14, color: c.muted, marginTop: 2 },
  pushBox: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.sm },
  pushText: { fontFamily: fonts.body, fontSize: 16, color: c.onSurface, lineHeight: 22 },
  note: { fontFamily: fonts.body, fontSize: 14, color: c.muted, fontStyle: "italic", marginTop: 4 },
}));
