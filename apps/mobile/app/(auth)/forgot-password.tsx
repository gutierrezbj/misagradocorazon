// Recuperar la contraseña con un código de 6 dígitos por email (SDD-05 US-24). Dos pasos: pedir el
// código y, con él, poner la contraseña nueva. La respuesta al pedirlo es la misma exista o no la
// cuenta, así que el aviso tampoco lo dice.
import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { ApiError, passwordResetRequest } from "@/src/api";
import { useI18n, type Key } from "@/src/i18n";
import { AppButton, useToast } from "@/src/components/ui";
import { track } from "@/src/analytics";
import { errorKey } from "@/src/errors";

const CODE_ERRORS: Record<string, Key> = {
  INVALID_OTP: "invalidCode",
  OTP_EXPIRED: "codeExpired",
  TOO_MANY_ATTEMPTS: "tooManyAttempts",
  PASSWORD_TOO_SHORT: "passwordTooShort",
};

export default function ForgotPassword() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const fail = (e: unknown) => {
    const code = e instanceof ApiError ? CODE_ERRORS[e.code] : undefined;
    toast(t(code ?? errorKey(e)), "error");
  };

  const requestCode = async () => {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await passwordResetRequest("/auth/email-otp/request-password-reset", { email: email.trim().toLowerCase() });
      track("password_reset_requested");
      setCode("");
      setStep("code");
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const change = async () => {
    if (password.length < 8) {
      toast(t("passwordTooShort"), "error");
      return;
    }
    setBusy(true);
    try {
      await passwordResetRequest("/auth/email-otp/reset-password", { email: email.trim().toLowerCase(), otp: code.trim(), password });
      track("password_reset_completed");
      toast(t("passwordChanged"), "success");
      router.back();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }}
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{t("resetTitle")}</Text>
          <Text style={styles.intro}>{step === "email" ? t("resetIntro") : t("codeSentHint")}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>{t("email")}</Text>
            <TextInput
              testID="reset-email-input"
              value={email}
              onChangeText={setEmail}
              editable={step === "email"}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              style={[styles.input, step === "code" && styles.inputDisabled]}
              placeholder={t("emailPlaceholder")}
              placeholderTextColor={colors.muted}
            />
          </View>

          {step === "email" ? (
            <AppButton testID="send-code-button" label={t("sendCode")} onPress={requestCode} loading={busy} />
          ) : (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>{t("codeLabel")}</Text>
                <TextInput
                  testID="reset-code-input"
                  value={code}
                  onChangeText={(v) => setCode(v.replace(/\D/g, "").slice(0, 6))}
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={6}
                  style={[styles.input, styles.codeInput]}
                  placeholder="000000"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={styles.field}>
                <Text style={styles.label}>{t("newPassword")}</Text>
                <TextInput
                  testID="reset-password-input"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <AppButton testID="change-password-button" label={t("changePassword")} onPress={change} loading={busy} disabled={code.length !== 6} />
              <Pressable testID="resend-code" accessibilityRole="button" onPress={requestCode} disabled={busy} style={styles.link}>
                <Text style={styles.linkText}>{t("resendCode")}</Text>
              </Pressable>
            </>
          )}

          <Pressable testID="back-to-login" accessibilityRole="button" onPress={() => router.back()} style={styles.link}>
            <Text style={styles.linkText}>{t("backToLogin")}</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.altarBg },
  card: { backgroundColor: c.surface, marginHorizontal: spacing.md, borderRadius: radius.xl, padding: spacing.lg },
  title: { fontFamily: fonts.displayBold, fontSize: 28, color: c.onSurface, marginBottom: spacing.sm },
  intro: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: c.onSurfaceSecondary, marginBottom: spacing.lg },
  field: { marginBottom: spacing.md },
  label: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onSurfaceSecondary, marginBottom: 6 },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: c.onSurface,
    backgroundColor: c.surfaceSecondary,
  },
  inputDisabled: { opacity: 0.6 },
  codeInput: { fontFamily: fonts.bodySemibold, fontSize: 22, letterSpacing: 8, textAlign: "center" },
  link: { marginTop: spacing.lg, alignItems: "center", minHeight: 44, justifyContent: "center" },
  linkText: { fontFamily: fonts.bodyMedium, color: c.brand, fontSize: 16 },
}));
