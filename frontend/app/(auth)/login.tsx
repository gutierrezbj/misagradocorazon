import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { AppButton, useToast } from "@/src/components/ui";
import { CandleFlame } from "@/src/components/CandleFlame";
import { GoogleLogo } from "@/src/components/GoogleLogo";
import { ApiError } from "@/src/api";

export default function LoginScreen() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const toast = useToast();
  const { login, register, googleLogin } = useAuth();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      toast(t("authError"), "error");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim());
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("authError");
      toast(msg, "error");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    try {
      await googleLogin();
    } catch {
      toast(t("authError"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        bottomOffset={20}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}>
          <View style={styles.flameWrap}>
            <CandleFlame size={110} />
          </View>
          <Text style={styles.brand}>Mi Sagrado Corazón</Text>
          <Text style={styles.tagline}>{t("tagline")}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{mode === "login" ? t("signIn") : t("signUp")}</Text>

          {mode === "register" && (
            <View style={styles.field}>
              <Text style={styles.label}>{t("name")}</Text>
              <TextInput
                testID="name-input"
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder={t("name")}
                placeholderTextColor={colors.muted}
              />
            </View>
          )}

          <View style={styles.field}>
            <Text style={styles.label}>{t("email")}</Text>
            <TextInput
              testID="email-input"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholder="tu@correo.com"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>{t("password")}</Text>
            <TextInput
              testID="password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.muted}
            />
          </View>

          <View style={{ height: spacing.sm }} />
          <AppButton
            testID="submit-auth-button"
            label={mode === "login" ? t("signIn") : t("signUp")}
            onPress={submit}
            loading={busy}
          />

          <View style={styles.dividerRow}>
            <View style={styles.line} />
            <Text style={styles.or}>o</Text>
            <View style={styles.line} />
          </View>

          <Pressable testID="google-login-button" onPress={google} style={styles.googleBtn}>
            <GoogleLogo size={20} />
            <Text style={styles.googleText}>{t("continueGoogle")}</Text>
          </Pressable>

          <Pressable
            testID="toggle-auth-mode"
            onPress={() => setMode(mode === "login" ? "register" : "login")}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>{mode === "login" ? t("noAccount") : t("haveAccount")}</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.altarBg },
  hero: { alignItems: "center", paddingBottom: spacing.lg },
  flameWrap: { height: 170, justifyContent: "flex-end" },
  brand: { fontFamily: fonts.displayBold, fontSize: 38, color: c.gold, marginTop: spacing.sm, textAlign: "center" },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: c.onAltarMuted,
    textAlign: "center",
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xl,
    fontStyle: "italic",
  },
  fade: { height: 0 },
  card: {
    backgroundColor: c.surface,
    marginHorizontal: spacing.md,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.sm,
  },
  cardTitle: { fontFamily: fonts.displayBold, fontSize: 28, color: c.onSurface, marginBottom: spacing.md },
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
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: c.divider },
  or: { marginHorizontal: spacing.md, color: c.muted, fontFamily: fonts.body },
  googleBtn: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: c.borderStrong,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurface },
  toggle: { marginTop: spacing.lg, alignItems: "center" },
  toggleText: { fontFamily: fonts.bodyMedium, color: c.brand, fontSize: 15 },
}));
