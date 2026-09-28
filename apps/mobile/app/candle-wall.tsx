// Muro de velas (SDD-05 US-21): la comunidad reza unida. Solo llamas y contadores:
// nunca se muestran intenciones ni quién encendió cada vela (privacidad y cero moderación).
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { api } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { Icon } from "@/src/components/ui";
import { CandleFlame } from "@/src/components/CandleFlame";
import type { CommunityCandles, Saint } from "@/src/types";

// Cada llama está animada: se muestran como mucho estas para que el muro vaya fluido en móviles modestos.
const MAX_FLAMES = 36;

export default function CandleWall() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();

  const { data, isLoading } = useQuery({
    queryKey: ["candles", "community"],
    queryFn: () => api<CommunityCandles>("/candles/community"),
    refetchInterval: 60_000,
  });
  const { data: saints } = useQuery({ queryKey: ["saints", "all"], queryFn: () => api<Saint[]>("/saints") });
  const saintName = new Map((saints ?? []).map((s) => [s.id, s.name]));
  const flames = (data?.flames ?? []).slice(0, MAX_FLAMES);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel={t("back")}>
          <Icon name="arrow-left" size={22} color={colors.onAltar} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("candleWall")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }}>
        <Text style={styles.lead}>{t("candleWallLead")}</Text>
        {isLoading || !data ? (
          <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xl }} />
        ) : (
          <>
            <View style={styles.stats}>
              <Stat value={data.last24h} label={t("wallToday")} testID="wall-today" />
              <Stat value={data.active} label={t("wallLitNow")} />
              <Stat value={data.last7d} label={t("wallThisWeek")} />
            </View>

            {flames.length === 0 ? (
              <Text style={styles.empty}>{t("candleWallEmpty")}</Text>
            ) : (
              <View style={styles.grid}>
                {flames.map((f, i) => (
                  <View key={`${f.litAt}-${i}`} style={styles.cell} testID="wall-flame">
                    <CandleFlame size={56} lit variant={f.type} mourning={f.category === "difuntos"} />
                    <Text style={styles.saint} numberOfLines={3}>
                      {saintName.get(f.saintId) ?? ""}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {data.active > flames.length && <Text style={styles.more}>{t("wallMore").replace("{n}", String(data.active - flames.length))}</Text>}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function Stat({ value, label, testID }: { value: number; label: string; testID?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} testID={testID}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.altarBg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.displaySemibold, fontSize: 20, color: c.onAltar },
  lead: { fontFamily: fonts.display, fontSize: 20, lineHeight: 28, color: c.goldSoft, textAlign: "center", fontStyle: "italic", marginBottom: spacing.lg },
  stats: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  stat: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "rgba(253,251,247,0.06)",
    borderWidth: 1,
    borderColor: "rgba(197,160,89,0.3)",
  },
  statValue: { fontFamily: fonts.displayBold, fontSize: 28, color: c.gold, fontVariant: ["lining-nums"] },
  statLabel: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, marginTop: 2, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", rowGap: spacing.md },
  cell: { width: "33.33%", alignItems: "center" },
  saint: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, textAlign: "center", marginTop: 4, paddingHorizontal: 4 },
  empty: { fontFamily: fonts.body, fontSize: 16, color: c.onAltarMuted, textAlign: "center", marginTop: spacing.lg },
  more: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, textAlign: "center", marginTop: spacing.lg },
}));
