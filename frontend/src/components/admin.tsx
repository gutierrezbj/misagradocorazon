import React from "react";
import { View, Text, ScrollView, Pressable, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { Icon } from "@/src/components/ui";

export function AdminShell({ title, children }: { title: string; children: React.ReactNode }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="admin-back" onPress={() => router.back()} style={styles.back}>
          <Icon name="arrow-left" size={22} color={colors.onAltar} />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing["2xl"], maxWidth: 900, width: "100%", alignSelf: "center" }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function AdminField({ label, value, onChangeText, placeholder, multiline }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[styles.input, multiline && { minHeight: 80, textAlignVertical: "top" }]}
      />
    </View>
  );
}

export function AdminCard({ children }: { children: React.ReactNode }) {
  const styles = useStyles();
  return <View style={styles.card}>{children}</View>;
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, backgroundColor: c.altarBg },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.displayBold, fontSize: 22, color: c.gold },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: c.onSurfaceSecondary, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: c.border, borderRadius: radius.md, padding: spacing.sm + 2, fontFamily: fonts.body, fontSize: 15, color: c.onSurface, backgroundColor: c.surfaceSecondary },
  card: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: c.border },
}));
