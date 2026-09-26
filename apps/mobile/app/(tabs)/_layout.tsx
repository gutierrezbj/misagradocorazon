import React from "react";
import { Platform, type ColorValue } from "react-native";
import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import Feather from "@react-native-vector-icons/feather";

import { usesNativeTabs } from "@/src/navigation";
import { useTheme, fonts } from "@/src/theme";
import { useI18n } from "@/src/i18n";

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();

  if (usesNativeTabs) {
    return (
      <NativeTabs>
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

  return (
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
  );
}
