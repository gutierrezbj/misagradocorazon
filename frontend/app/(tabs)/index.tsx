import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { Icon } from "@/src/components/ui";
import { CandleFlame } from "@/src/components/CandleFlame";
import { usesNativeTabs } from "@/src/navigation";

export default function Altar() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, loc } = useI18n();
  const { user } = useAuth();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const { data: daily } = useQuery({ queryKey: ["daily"], queryFn: () => api("/daily", { auth: false }) });
  const { data: candlesData, isLoading } = useQuery({ queryKey: ["candles", "me"], queryFn: () => api("/candles/me") });
  const { data: patronData } = useQuery({
    queryKey: ["saint", user?.patron_saint_id],
    queryFn: () => api(`/saints/${user?.patron_saint_id}`, { auth: false }),
    enabled: !!user?.patron_saint_id,
  });

  const patron = patronData?.saint;
  const candles = candlesData?.candles ?? [];
  const saintOfDay = daily?.daily?.saint_of_day;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? t("greetingMorning") : hour < 19 ? t("greetingAfternoon") : t("greetingEvening");

  const goLight = () => {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push("/light-candle");
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {patron?.image_url && (
        <Image source={{ uri: patron.image_url }} style={styles.bgImage} contentFit="cover" blurRadius={30} />
      )}
      <LinearGradient
        colors={[colors.altarBgDeep + "F2", colors.altarBg + "FA", colors.altarBg]}
        style={styles.bgOverlay}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: bottomChrome + spacing["2xl"] }}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {greeting}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </Text>
            <View style={styles.streakRow}>
              <Icon name="award" size={16} color={colors.gold} />
              <Text style={styles.streak}>
                {user?.streak ?? 0} {t("streakDays")}
              </Text>
            </View>
          </View>
          <Pressable testID="profile-button" onPress={() => router.push("/profile")} style={styles.avatar}>
            <Icon name="user" size={22} color={colors.gold} />
          </Pressable>
        </View>

        {/* Patron + candle */}
        <View style={styles.altarStage}>
          {patron ? (
            <Text style={styles.patronName}>{patron.name}</Text>
          ) : (
            <Pressable onPress={() => router.push("/profile")}>
              <Text style={styles.patronName}>{t("selectPatronFirst")}</Text>
            </Pressable>
          )}
          <View style={styles.flameArea}>
            <CandleFlame size={190} lit variant="solemn" />
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.md }}>
          <Pressable testID="light-candle-button" onPress={goLight} style={styles.lightBtn}>
            <LinearGradient colors={[colors.brand, colors.brandPrimary]} style={styles.lightBtnBg}>
              <Icon name="feather" size={20} color={colors.gold} />
              <Text style={styles.lightBtnText}>{t("lightCandle")}</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Daily cards */}
        <View style={styles.cards}>
          <GlassCard
            testID="gospel-card"
            icon="book-open"
            title={t("gospelToday")}
            subtitle={daily?.daily?.gospel_ref || ""}
            onPress={() => router.push("/gospel")}
          />
          {saintOfDay && (
            <GlassCard
              testID="saint-of-day-card"
              icon="star"
              title={t("saintOfDay")}
              subtitle={saintOfDay.name}
              onPress={() => router.push(`/saint/${saintOfDay.id}`)}
            />
          )}
          <View style={styles.prayerRow}>
            <PrayerCard label={t("morningPrayer")} icon="sunrise" onPress={() => router.push("/prayer?kind=morning")} />
            <PrayerCard label={t("nightPrayer")} icon="moon" onPress={() => router.push("/prayer?kind=night")} />
          </View>
        </View>

        {/* My candles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("myCandles")}</Text>
          {isLoading ? (
            <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.md }} />
          ) : candles.length === 0 ? (
            <Text style={styles.empty}>{t("noCandles")}</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.md }}>
              {candles.map((c: any) => (
                <View key={c.id} style={styles.miniCandle}>
                  <CandleFlame size={54} lit variant={c.type} />
                  <Text style={styles.miniSaint} numberOfLines={1}>
                    {c.saint_name}
                  </Text>
                  <Text style={styles.miniIntention} numberOfLines={2}>
                    {c.intention}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function GlassCard({ icon, title, subtitle, onPress, testID }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.glassCard}>
      <View style={styles.glassIcon}>
        <Icon name={icon} size={20} color={colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.glassTitle}>{title}</Text>
        {!!subtitle && (
          <Text style={styles.glassSub} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
      <Icon name="chevron-right" size={20} color={colors.onAltarMuted} />
    </Pressable>
  );
}

function PrayerCard({ label, icon, onPress }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.prayerCard}>
      <Icon name={icon} size={22} color={colors.gold} />
      <Text style={styles.prayerLabel}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.altarBg },
  bgImage: { ...StyleSheetAbsolute(), height: 380, opacity: 0.35 },
  bgOverlay: { ...StyleSheetAbsolute(), height: 400 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.md, marginBottom: spacing.sm },
  greeting: { fontFamily: fonts.displayBold, fontSize: 26, color: c.onAltar },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  streak: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.gold },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.altarCard,
    borderWidth: 1,
    borderColor: c.altarBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  altarStage: { alignItems: "center", marginTop: spacing.sm },
  patronName: { fontFamily: fonts.display, fontSize: 24, color: c.gold, fontStyle: "italic", textAlign: "center", paddingHorizontal: spacing.lg },
  flameArea: { height: 300, justifyContent: "center", alignItems: "center", marginTop: -10 },
  lightBtn: { borderRadius: radius.lg, overflow: "hidden", marginTop: -20 },
  lightBtnBg: { height: 58, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  lightBtnText: { fontFamily: fonts.bodyBold, fontSize: 18, color: c.gold },
  cards: { paddingHorizontal: spacing.md, marginTop: spacing.lg, gap: spacing.sm },
  glassCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.altarCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.altarBorder,
  },
  glassIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.altarCardSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  glassTitle: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onAltar },
  glassSub: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, marginTop: 2 },
  prayerRow: { flexDirection: "row", gap: spacing.sm },
  prayerCard: {
    flex: 1,
    backgroundColor: c.altarCard,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: c.altarBorder,
    alignItems: "center",
    gap: 8,
  },
  prayerLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onAltar, textAlign: "center" },
  section: { paddingLeft: spacing.md, marginTop: spacing.xl },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: c.gold, marginBottom: spacing.md },
  empty: { fontFamily: fonts.body, fontSize: 15, color: c.onAltarMuted, fontStyle: "italic" },
  miniCandle: {
    width: 130,
    backgroundColor: c.altarCard,
    borderRadius: radius.lg,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: c.altarBorder,
    alignItems: "center",
  },
  miniSaint: { fontFamily: fonts.bodySemibold, fontSize: 13, color: c.gold, marginTop: 4 },
  miniIntention: { fontFamily: fonts.body, fontSize: 12, color: c.onAltarMuted, textAlign: "center", marginTop: 2 },
}));

function StyleSheetAbsolute() {
  return { position: "absolute" as const, top: 0, left: 0, right: 0 };
}
