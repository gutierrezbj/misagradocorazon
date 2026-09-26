import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { AppButton, Icon, useToast } from "@/src/components/ui";

export default function Prayer() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, loc } = useI18n();
  const toast = useToast();
  const { refresh } = useAuth();
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const isMorning = kind !== "night";

  const { data, isLoading } = useQuery({ queryKey: ["daily"], queryFn: () => api("/daily", { auth: false }) });
  const daily = data?.daily;
  const prayer = isMorning ? daily?.morning_prayer : daily?.night_prayer;

  const completeMut = useMutation({
    mutationFn: () => api("/daily/complete", { method: "POST", body: { kind: isMorning ? "morning" : "night" } }),
    onSuccess: (res: any) => {
      refresh();
      toast(`🔥 ${res.streak} ${t("streakDays")}`, "success");
      router.back();
    },
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.altarBg }]}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back}>
          <Icon name="arrow-left" size={22} color={colors.onAltar} />
        </Pressable>
        <Text style={styles.headerTitle}>{isMorning ? t("morningPrayer") : t("nightPrayer")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
          <View style={styles.iconWrap}>
            <Icon name={isMorning ? "sunrise" : "moon"} size={40} color={colors.gold} />
          </View>
          <Text style={styles.prayer}>{loc(prayer)}</Text>
          <View style={{ height: spacing.xl }} />
          <AppButton testID="complete-prayer-button" label="Amén · Completar" onPress={() => completeMut.mutate()} loading={completeMut.isPending} variant="gold" icon="check" />
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.displaySemibold, fontSize: 20, color: c.onAltar },
  iconWrap: { alignItems: "center", marginVertical: spacing.lg },
  prayer: { fontFamily: fonts.display, fontSize: 28, lineHeight: 42, color: c.onAltar, textAlign: "center", fontStyle: "italic" },
}));
