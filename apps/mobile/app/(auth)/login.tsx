import { useState } from "react";
import { View, Text, TextInput, Pressable, Switch } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { AppButton, useToast } from "@/src/components/ui";
import { CandleFlame } from "@/src/ritual/CandleFlame";
import { ApiError } from "@/src/api";
import { useFeatures } from "@/src/features";
import { SocialButtons } from "@/src/components/SocialButtons";
import type { SocialProvider } from "@/src/social";
import { errorKey } from "@/src/errors";
import { LegalLinks } from "@/src/legal";

// /login?registro=1 y /registro abren directamente el alta (enlace de la web pública).
export default function LoginScreen({ initialMode }: { initialMode?: "login" | "register" }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const toast = useToast();
  const { login, register, loginWithProvider } = useAuth();
  const router = useRouter();
  const { registro } = useLocalSearchParams<{ registro?: string }>();
  // Recuperar contraseña (US-24) solo si el servidor tiene email configurado.
  const features = useFeatures();

  const [mode, setMode] = useState<"login" | "register">(initialMode ?? (registro ? "register" : "login"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Novedades por correo (US-35): sin marcar, y registrarse no depende de ella.
  const [news, setNews] = useState(false);
  const [busy, setBusy] = useState(false);
  const [socialBusy, setSocialBusy] = useState<SocialProvider | null>(null);

  const submit = async () => {
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      toast(t("authError"), "error");
      return;
    }
    setBusy(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim(), { newsConsent: news });
    } catch (e) {
      // Better Auth responde en inglés: se traducen los casos conocidos.
      // Credenciales incorrectas → authError; sin red o demasiados intentos → su propio mensaje.
      const code = e instanceof ApiError ? e.code : "";
      const key = errorKey(e);
      toast(
        code === "USER_ALREADY_EXISTS"
          ? t("emailTaken")
          : code === "PASSWORD_TOO_SHORT"
            ? t("passwordTooShort")
            : key === "genericError"
              ? t("authError")
              : t(key),
        "error",
      );
    } finally {
      setBusy(false);
    }
  };

  const social = async (provider: SocialProvider) => {
    setSocialBusy(provider);
    try {
      await loginWithProvider(provider);
    } catch (e) {
      // OAUTH_LINK_ERROR: ya hay una cuenta con ese correo creada con contraseña.
      const code = e instanceof ApiError ? e.code : "";
      toast(code === "OAUTH_LINK_ERROR" ? t("socialLinkBlocked") : t("socialError"), "error");
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <KeyboardAwareScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} bottomOffset={20} showsVerticalScrollIndicator={false}>
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
              placeholder={t("emailPlaceholder")}
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

          {mode === "login" && features?.passwordReset && (
            <Pressable testID="forgot-password" accessibilityRole="link" onPress={() => router.push("/forgot-password")} style={styles.forgot}>
              <Text style={styles.toggleText}>{t("forgotPassword")}</Text>
            </Pressable>
          )}

          {mode === "register" && (
            <View style={styles.news}>
              <View style={{ flex: 1 }}>
                <Text style={styles.newsTitle}>{t("newsConsent")}</Text>
                <Text style={styles.newsText}>{t("newsConsentHint")}</Text>
              </View>
              <Switch
                testID="news-consent"
                value={news}
                onValueChange={setNews}
                trackColor={{ true: colors.brandPrimary, false: colors.border }}
                thumbColor={colors.surface}
                {...({ activeThumbColor: colors.surface } as object)}
                accessibilityLabel={t("newsConsent")}
              />
            </View>
          )}

          {mode === "register" && (
            <View style={{ marginTop: spacing.sm }}>
              <Text style={styles.legalIntro}>{t("legalIntro")}</Text>
              <LegalLinks />
            </View>
          )}

          <View style={{ height: spacing.sm }} />
          <AppButton testID="submit-auth-button" label={mode === "login" ? t("signIn") : t("signUp")} onPress={submit} loading={busy} />

          {/* Solo aparecen en iOS/Android y con las credenciales configuradas (src/social). */}
          <SocialButtons onPress={social} busy={socialBusy} />

          <Pressable testID="toggle-auth-mode" onPress={() => setMode(mode === "login" ? "register" : "login")} style={styles.toggle}>
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
  toggle: { marginTop: spacing.lg, alignItems: "center" },
  forgot: { alignSelf: "flex-end", minHeight: 44, justifyContent: "center", marginTop: -spacing.sm },
  toggleText: { fontFamily: fonts.bodyMedium, color: c.brand, fontSize: 15 },
  news: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  newsTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurface },
  newsText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: c.muted, marginTop: 2 },
  legalIntro: { fontFamily: fonts.body, fontSize: 14, color: c.onSurfaceSecondary, textAlign: "center" },
}));
