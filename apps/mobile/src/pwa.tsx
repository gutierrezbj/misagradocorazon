// Beta web instalable (SDD-05 US-27, ADR-016). Solo en el navegador:
// - en Chrome y Android, botón "Instalar la app" con el aviso nativo del navegador;
// - en iPhone (Safari no tiene ese aviso), los pasos para añadirla a la pantalla de inicio;
// - nada si ya está instalada o si el fiel lo cerró.
// KPI: pwa_installed cuando el navegador confirma la instalación.
import { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { track } from "@/src/analytics";
import { Icon } from "@/src/components/ui";
import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { storage } from "@/src/utils/storage";

const DISMISSED_KEY = "msc.pwa_hint_dismissed";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

const isWeb = Platform.OS === "web";

function isStandalone() {
  if (!isWeb || typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true || window.matchMedia?.("(display-mode: standalone)").matches === true;
}

const isIos = () => isWeb && typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

/** Registra la instalación en la analítica. Se llama una vez, al arrancar la app. */
export function watchPwaInstall() {
  if (!isWeb || typeof window === "undefined") return () => undefined;
  const onInstalled = () => track("pwa_installed");
  window.addEventListener("appinstalled", onInstalled);
  return () => window.removeEventListener("appinstalled", onInstalled);
}

export function InstallHint() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useI18n();
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isWeb || isStandalone()) return;
    let active = true;
    storage.getItem(DISMISSED_KEY, false).then((dismissed) => {
      if (active && !dismissed && isIos()) setVisible(true);
    });
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
      storage.getItem(DISMISSED_KEY, false).then((dismissed) => active && !dismissed && setVisible(true));
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    void storage.setItem(DISMISSED_KEY, true);
  };
  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setVisible(false);
  };

  return (
    <View testID="pwa-install-hint" style={styles.card}>
      <Icon name="smartphone" size={22} color={colors.gold} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{t("installTitle")}</Text>
        {prompt ? (
          <Pressable testID="pwa-install-button" accessibilityRole="button" onPress={install} style={styles.button}>
            <Text style={styles.buttonText}>{t("installApp")}</Text>
          </Pressable>
        ) : (
          <Text style={styles.body}>{t("installIos")}</Text>
        )}
      </View>
      <Pressable testID="pwa-install-dismiss" accessibilityRole="button" accessibilityLabel={t("close")} onPress={dismiss} style={styles.close}>
        <Icon name="x" size={18} color={colors.onAltarMuted} />
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: c.goldDeep,
    backgroundColor: c.altarCard,
  },
  title: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onAltar },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22, color: c.onAltarMuted, marginTop: 4 },
  button: {
    alignSelf: "flex-start",
    marginTop: spacing.sm,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: c.gold,
  },
  buttonText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.onBrandSecondary },
  close: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
}));
