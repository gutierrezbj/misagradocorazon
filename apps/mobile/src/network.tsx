// Conexión (SDD-07: "la app no crashea con conexión lenta o sin conexión").
// - React Query sabe cuándo hay red: las consultas esperan y se recargan solas al volver.
// - Un aviso fijo explica por qué no llega nada nuevo mientras tanto.
// isInternetReachable puede ser null al arrancar: solo "false" cuenta como sin conexión.
import { useEffect } from "react";
import { Text, View } from "react-native";
import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, spacing } from "@/src/theme";
import { Icon } from "@/src/components/ui";

export const isOnline = (s: Pick<Network.NetworkState, "isConnected" | "isInternetReachable">) =>
  s.isConnected !== false && s.isInternetReachable !== false;

export function useQueryOnlineSync() {
  useEffect(() => {
    onlineManager.setEventListener((setOnline) => {
      const sub = Network.addNetworkStateListener((s) => setOnline(isOnline(s)));
      return () => sub.remove();
    });
  }, []);
}

export function OfflineBanner() {
  const state = Network.useNetworkState();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const styles = useStyles();
  if (isOnline(state)) return null;
  return (
    <View
      testID="offline-banner"
      accessibilityRole="alert"
      style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}
      pointerEvents="none"
    >
      <Icon name="wifi-off" size={16} color={styles.text.color as string} />
      <Text style={styles.text}>{t("offline")}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    backgroundColor: c.altarCard,
    borderBottomWidth: 1,
    borderBottomColor: c.gold,
  },
  text: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.goldSoft, textAlign: "center", flexShrink: 1 },
}));
