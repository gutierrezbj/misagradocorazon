import React, { createContext, useCallback, useContext, useState } from "react";
import { Pressable, Text, View, ActivityIndicator, StyleSheet } from "react-native";
import Feather from "@react-native-vector-icons/feather";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";

export function Icon({ name, size = 22, color }: { name: any; size?: number; color?: string }) {
  const { colors } = useTheme();
  return <Feather name={name} size={size} color={color ?? colors.onSurface} />;
}

type BtnProps = {
  label: string;
  onPress?: () => void;
  variant?: "primary" | "gold" | "outline" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  icon?: any;
  testID?: string;
  full?: boolean;
};

export function AppButton({ label, onPress, variant = "primary", loading, disabled, icon, testID, full = true }: BtnProps) {
  const { colors } = useTheme();
  const styles = useButtonStyles();
  const bg =
    variant === "primary" ? colors.brandPrimary : variant === "gold" ? colors.brandSecondary : "transparent";
  const fg =
    variant === "primary"
      ? colors.onBrandPrimary
      : variant === "gold"
        ? colors.onBrandSecondary
        : variant === "outline"
          ? colors.brandPrimary
          : colors.onSurfaceSecondary;
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        full && { alignSelf: "stretch" },
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "outline" && { borderWidth: 1.5, borderColor: colors.brandPrimary },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Feather name={icon} size={18} color={fg} style={{ marginRight: 8 }} />}
          <Text style={[styles.label, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const useButtonStyles = makeStyles((c) => ({
  btn: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  row: { flexDirection: "row", alignItems: "center" },
  label: { fontFamily: fonts.bodySemibold, fontSize: 17 },
}));

export function Chip({ label, active, onPress, testID }: { label: string; active?: boolean; onPress?: () => void; testID?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={{
        height: 36,
        flexShrink: 0,
        paddingHorizontal: 16,
        borderRadius: radius.pill,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? colors.brandPrimary : colors.surfaceSecondary,
        borderWidth: 1,
        borderColor: active ? colors.brandPrimary : colors.border,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.bodyMedium,
          fontSize: 14,
          color: active ? colors.onBrandPrimary : colors.onSurfaceSecondary,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------- Toast ----------------
type ToastState = { message: string; type: "success" | "error" | "info" } | null;
const ToastCtx = createContext<(msg: string, type?: "success" | "error" | "info") => void>(() => {});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const [toast, setToast] = useState<ToastState>(null);

  const show = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const bg = toast?.type === "error" ? colors.error : toast?.type === "success" ? colors.success : colors.surfaceInverse;

  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          entering={FadeInUp}
          exiting={FadeOutUp}
          pointerEvents="none"
          style={[toastStyles.toast, { backgroundColor: bg }]}
        >
          <Text style={toastStyles.text}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}

const toastStyles = StyleSheet.create({
  toast: {
    position: "absolute",
    top: 60,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: radius.md,
    zIndex: 9999,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  text: { color: "#FDFBF7", fontFamily: fonts.bodyMedium, fontSize: 15, textAlign: "center" },
});
