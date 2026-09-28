// Borrado de cuenta (SDD-02, transversal): obligatorio en App Store (guideline 5.1.1(v)) y derecho
// de supresión (GDPR art. 17). Se explica qué se borra y qué se conserva sin nombre, y se pide
// escribir una palabra para confirmar: Alert no funciona en web y un solo toque es demasiado fácil.
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { ApiError } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { AppButton, Icon, useToast } from "@/src/components/ui";

export default function DeleteAccount() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { deleteAccount } = useAuth();
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  const word = t("deleteAccountConfirmWord");
  const confirmed = typed.trim().toUpperCase() === word;

  const submit = async () => {
    setBusy(true);
    try {
      await deleteAccount();
      // Sin usuario, la puerta de entrada lleva al login.
      toast(t("deleteAccountDone"));
    } catch (e) {
      setBusy(false);
      toast(e instanceof ApiError && e.code === "last_superadmin" ? t("deleteAccountLastAdmin") : t("genericError"), "error");
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("back")}>
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("deleteAccount")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>{t("deleteAccountLead")}</Text>

        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Icon name="trash-2" size={18} color={colors.error} />
            <Text style={styles.blockTitle}>{t("deleteAccountGone")}</Text>
          </View>
          <Text style={styles.blockText}>{t("deleteAccountGoneList")}</Text>
        </View>

        <View style={styles.block}>
          <View style={styles.blockHead}>
            <Icon name="lock" size={18} color={colors.brandSecondary} />
            <Text style={styles.blockTitle}>{t("deleteAccountKept")}</Text>
          </View>
          <Text style={styles.blockText}>{t("deleteAccountKeptList")}</Text>
        </View>

        <Text style={styles.label}>{t("deleteAccountTypeToConfirm").replace("{word}", word)}</Text>
        <TextInput
          testID="delete-account-input"
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
          testID="delete-account-confirm"
          label={t("deleteAccountButton")}
          icon="trash-2"
          onPress={submit}
          loading={busy}
          disabled={!confirmed || busy}
        />
        <View style={{ height: spacing.sm }} />
        <AppButton testID="delete-account-cancel" variant="ghost" label={t("cancel")} onPress={() => router.back()} disabled={busy} />
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
