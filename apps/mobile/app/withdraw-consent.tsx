// Retirar el consentimiento de datos de fe (RGPD art. 7.3 y 9.2.a). Se explica qué se borra y qué
// se conserva, y se pide escribir una palabra para confirmar, como al borrar la cuenta: Alert no
// funciona en web y un solo toque es demasiado fácil. Después, la puerta de entrada lleva al
// onboarding, que vuelve a pedir el consentimiento.
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { api } from "@/src/api";
import type { User } from "@/src/types";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppButton, Icon, useToast } from "@/src/components/ui";

export default function WithdrawConsent() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { setUser } = useAuth();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const word = t("withdrawConsentConfirmWord");
  const confirmed = typed.trim().toUpperCase() === word;

  const submit = async () => {
    setBusy(true);
    try {
      const updated = await api<User>("/me/belief-consent", { method: "DELETE", body: { confirm: true } });
      toast(t("withdrawConsentDone"));
      // Sin consentimiento, la puerta de entrada lleva al onboarding.
      setUser(updated);
    } catch {
      setBusy(false);
      toast(t("genericError"), "error");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("back")}>
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("withdrawConsent")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>{t("withdrawConsentLead")}</Text>

        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Icon name="trash-2" size={18} color={colors.error} />
            <Text style={styles.blockTitle}>{t("withdrawConsentGone")}</Text>
          </View>
          <Text style={styles.blockText}>{t("withdrawConsentGoneList")}</Text>
        </View>

        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Icon name="lock" size={18} color={colors.brandSecondary} />
            <Text style={styles.blockTitle}>{t("withdrawConsentKept")}</Text>
          </View>
          <Text style={styles.blockText}>{t("withdrawConsentKeptList")}</Text>
        </View>

        <Text style={styles.label}>{t("deleteAccountTypeToConfirm").replace("{word}", word)}</Text>
        <TextInput
          testID="withdraw-consent-input"
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={word}
          placeholderTextColor={colors.muted}
          accessibilityLabel={t("deleteAccountTypeToConfirm").replace("{word}", word)}
          style={styles.input}
        />
        <AppButton
          testID="withdraw-consent-confirm"
          label={t("withdrawConsentButton")}
          icon="trash-2"
          onPress={submit}
          loading={busy}
          disabled={!confirmed || busy}
        />
        <View style={{ height: spacing.sm }} />
        <AppButton testID="withdraw-consent-cancel" variant="ghost" label={t("cancel")} onPress={() => router.back()} disabled={busy} />
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.displaySemibold, fontSize: 20, color: c.onSurface },
  lead: { fontFamily: fonts.display, fontSize: 20, lineHeight: 28, color: c.onSurface, marginBottom: spacing.md },
  block: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm, gap: spacing.xs },
  blockHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  blockTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurface },
  blockText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: c.onSurfaceSecondary },
  label: { fontFamily: fonts.bodyMedium, fontSize: 16, color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.xs },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.bodySemibold,
    fontSize: 16,
    letterSpacing: 2,
    color: c.onSurface,
    backgroundColor: c.surfaceSecondary,
    marginBottom: spacing.md,
  },
}));
