import { useEffect, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Svg, { Path } from "react-native-svg";

import { appleAvailable, googleAvailable, type SocialProvider } from "@/src/social";
import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

type Props = { onPress: (provider: SocialProvider) => void; busy: SocialProvider | null };

// Botones según las guías de cada marca: el de Apple es el nativo del sistema (obligatorio por
// sus guías de interfaz) y el de Google lleva su logotipo sobre fondo blanco.
export function SocialButtons({ onPress, busy }: Props) {
  const styles = useStyles();
  const { t } = useI18n();
  const { scheme } = useTheme();
  const [apple, setApple] = useState(false);
  const google = googleAvailable();

  useEffect(() => {
    appleAvailable().then(setApple);
  }, []);

  if (!apple && !google) return null;

  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.or}>{t("orDivider")}</Text>
        <View style={styles.line} />
      </View>

      {apple && Platform.OS === "ios" && (
        <View style={styles.gap} pointerEvents={busy ? "none" : "auto"}>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={
              scheme === "dark"
                ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
            }
            cornerRadius={radius.md}
            style={styles.appleBtn}
            onPress={() => onPress("apple")}
          />
        </View>
      )}

      {google && (
        <Pressable
          testID="google-login-button"
          accessibilityRole="button"
          onPress={() => onPress("google")}
          disabled={busy !== null}
          style={({ pressed }) => [styles.googleBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          {busy === "google" ? (
            <ActivityIndicator color="#1F1F1F" />
          ) : (
            <>
              <GoogleLogo />
              <Text style={styles.googleText}>{t("continueGoogle")}</Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

function GoogleLogo() {
  return (
    <Svg width={20} height={20} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

const useStyles = makeStyles((c) => ({
  dividerRow: { flexDirection: "row", alignItems: "center", marginVertical: spacing.md },
  line: { flex: 1, height: 1, backgroundColor: c.divider },
  or: { marginHorizontal: spacing.md, color: c.muted, fontFamily: fonts.body, fontSize: 14 },
  gap: { marginBottom: spacing.sm },
  appleBtn: { height: 52, width: "100%" },
  googleBtn: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#747775",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: "#1F1F1F" },
}));
