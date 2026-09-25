// Design tokens for "Mi Sagrado Corazón" — devotional, warm, sacred, premium.
// Light Ivory theme across the app; the Altar screen uses the warm-dark
// `altar*` tokens so the candle flame glows. Keys match design_guidelines.json.
import { useMemo } from "react";
import { Appearance, StyleSheet, useColorScheme } from "react-native";

export type ColorScheme = "light" | "dark";

const light = {
  // Surfaces (Ivory)
  surface: "#FDFBF7",
  onSurface: "#2D2422",
  surfaceSecondary: "#F3EFE6",
  onSurfaceSecondary: "#3A312E",
  surfaceTertiary: "#EAE4D9",
  onSurfaceTertiary: "#4A413D",
  surfaceInverse: "#1C0F0E",
  onSurfaceInverse: "#FDFBF7",
  muted: "#82776E",

  // Brand — Sacred Heart red + gold accent
  brand: "#8B0000",
  onBrand: "#FDFBF7",
  brandPrimary: "#7A0000",
  onBrandPrimary: "#FDFBF7",
  brandSecondary: "#C5A059",
  onBrandSecondary: "#1C0F0E",
  brandTertiary: "#E8D9B9",
  onBrandTertiary: "#5C4316",

  // Status
  success: "#2E523A",
  onSuccess: "#FFFFFF",
  warning: "#B4801F",
  onWarning: "#FFFFFF",
  error: "#8B0000",
  onError: "#FFFFFF",
  info: "#4A6984",
  onInfo: "#FFFFFF",

  // Lines
  border: "#E1D8C9",
  borderStrong: "#C5A059",
  divider: "#E1D8C9",

  // Altar (warm dark chapel) — used only on the Altar screen and candle UI
  altarBg: "#1C0F0E",
  altarBgDeep: "#120807",
  altarCard: "#2A1815",
  altarCardSoft: "#33201C",
  onAltar: "#F6ECDC",
  onAltarMuted: "#B9A895",
  altarBorder: "#4A2E28",

  // Flame + gold
  gold: "#C5A059",
  goldSoft: "#E8D9B9",
  goldDeep: "#9A7B3C",
  flameOuter: "#8B2500",
  flameMid: "#E8901E",
  flameCore: "#FFE9A8",
};

export type ThemeColors = typeof light;

export const fonts = {
  display: "CormorantGaramond",
  displaySemibold: "CormorantGaramond-SemiBold",
  displayBold: "CormorantGaramond-Bold",
  body: "LibreFranklin",
  bodyMedium: "LibreFranklin-Medium",
  bodySemibold: "LibreFranklin-SemiBold",
  bodyBold: "LibreFranklin-Bold",
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, "2xl": 48, "3xl": 64 };
export const radius = { sm: 4, md: 8, lg: 16, xl: 22, pill: 999 };

export const defaultScheme = "light" satisfies ColorScheme;
export const themes: { light: ThemeColors; dark?: ThemeColors } = { light };

export function setColorScheme(scheme: ColorScheme | null) {
  Appearance.setColorScheme?.(scheme ?? "unspecified");
}

setColorScheme?.(themes.dark ? null : defaultScheme);

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const system = useColorScheme();
  const scheme: ColorScheme = system && themes[system] ? system : defaultScheme;
  return { scheme, colors: themes[scheme] ?? themes.light };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
