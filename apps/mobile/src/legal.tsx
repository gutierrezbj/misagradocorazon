// Aviso de privacidad y términos de la beta: páginas estáticas que sirve la beta web
// (apps/mobile/public/privacidad y public/terminos). Se leen sin sesión. En la web se abren por su
// ruta; en las apps nativas, en el navegador, con la URL pública de la beta.
import { Linking, Platform, Pressable, Text, View } from "react-native";

import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, spacing } from "@/src/theme";

export const LEGAL_BASE_URL = "https://app.misagradocorazon.com";

export type LegalPage = "privacidad" | "terminos";

export function legalUrl(page: LegalPage) {
  return Platform.OS === "web" ? `/${page}/` : `${LEGAL_BASE_URL}/${page}/`;
}

export function openLegal(page: LegalPage) {
  return Linking.openURL(legalUrl(page)).catch(() => undefined);
}

// Enlaces al aviso y a los términos, para el registro y el onboarding.
export function LegalLinks({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const styles = useStyles();
  const { t } = useI18n();
  const color = tone === "light" ? styles.linkLight : styles.linkDark;
  return (
    <View style={styles.row}>
      <Pressable testID="open-privacy" accessibilityRole="link" onPress={() => openLegal("privacidad")} style={styles.hit}>
        <Text style={[styles.link, color]}>{t("privacy")}</Text>
      </Pressable>
      <Pressable testID="open-terms" accessibilityRole="link" onPress={() => openLegal("terminos")} style={styles.hit}>
        <Text style={[styles.link, color]}>{t("terms")}</Text>
      </Pressable>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  row: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: spacing.md },
  hit: { minHeight: 44, justifyContent: "center", paddingHorizontal: spacing.xs },
  link: { fontFamily: fonts.bodyMedium, fontSize: 14, textDecorationLine: "underline" },
  linkDark: { color: c.onSurface },
  linkLight: { color: c.goldSoft },
}));
