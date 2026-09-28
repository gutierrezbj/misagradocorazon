import React from "react";
import { Platform, View, type ColorValue } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import Feather from "@react-native-vector-icons/feather";

import { usesNativeTabs } from "@/src/navigation";
import { useTheme, fonts } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { useAudio } from "@/src/audio-state";
import { MiniPlayer } from "@/src/components/MiniPlayer";

// En iOS 26 el mini-player va en el hueco nativo sobre la barra de pestañas, que iOS muestra en
// dos tamaños (normal y en línea al hacer scroll).
function NativeAccessory() {
  const placement = NativeTabs.BottomAccessory.usePlacement();
  return <MiniPlayer compact={placement === "inline"} />;
}

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { active } = useAudio();
  const insets = useSafeAreaInsets();

  if (usesNativeTabs) {
    return (
      <NativeTabs>
        {active && (
          <NativeTabs.BottomAccessory>
            <NativeAccessory />
          </NativeTabs.BottomAccessory>
        )}
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="flame.fill" />
          <NativeTabs.Trigger.Label>{t("tabAltar")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="muro">
          <NativeTabs.Trigger.Icon sf="hands.sparkles.fill" />
          <NativeTabs.Trigger.Label>{t("tabMuro")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="misa">
          <NativeTabs.Trigger.Icon sf="play.tv.fill" />
          <NativeTabs.Trigger.Label>{t("tabMisa")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="causas">
          <NativeTabs.Trigger.Icon sf="heart.circle.fill" />
          <NativeTabs.Trigger.Label>{t("tabCausas")}</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  const icon = (name: any) => {
    const TabIcon = ({ color, size }: { color: ColorValue; size: number }) => (
      <Feather name={name} size={size} color={color} />
    );
    return TabIcon;
  };

  // Alto de la barra de pestañas: la de web se fija en 64; en el teléfono es la de React Navigation
  // (49) más el área segura inferior.
  const tabBarHeight = Platform.OS === "web" ? 64 : 49 + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.brandPrimary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            ...(Platform.OS === "web" ? { height: 64 } : {}),
          },
          tabBarItemStyle: { alignSelf: "center" },
          tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 14 },
        }}
      >
        <Tabs.Screen name="index" options={{ title: t("tabAltar"), tabBarIcon: icon("home") }} />
        <Tabs.Screen name="muro" options={{ title: t("tabMuro"), tabBarIcon: icon("users") }} />
        <Tabs.Screen name="misa" options={{ title: t("tabMisa"), tabBarIcon: icon("video") }} />
        <Tabs.Screen name="causas" options={{ title: t("tabCausas"), tabBarIcon: icon("heart") }} />
      </Tabs>
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: tabBarHeight }}>
        <MiniPlayer />
      </View>
    </View>
  );
}
