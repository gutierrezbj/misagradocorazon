import { View, Text, ScrollView, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { Icon } from "@/src/components/ui";

export default function Profile() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const { user, logout } = useAuth();

  const { data: candlesData } = useQuery({ queryKey: ["candles", "me"], queryFn: () => api("/candles/me") });
  const { data: votesData } = useQuery({ queryKey: ["votes", "me"], queryFn: () => api("/votes/me") });
  const { data: patronData } = useQuery({
    queryKey: ["saint", user?.patron_saint_id],
    queryFn: () => api(`/saints/${user?.patron_saint_id}`, { auth: false }),
    enabled: !!user?.patron_saint_id,
  });

  const candles = candlesData?.candles ?? [];
  const votes = votesData?.votes ?? [];
  const patron = patronData?.saint;
  const isStaff = user?.role && user.role !== "user";

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back}>
          <Icon name="arrow-left" size={22} color={colors.onAltar} />
        </Pressable>
        <View style={styles.avatar}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={{ width: 80, height: 80, borderRadius: 40 }} />
          ) : (
            <Icon name="user" size={36} color={colors.gold} />
          )}
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {isStaff && (
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role}</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <Stat value={user?.streak ?? 0} label={t("streakDays")} />
          <Stat value={candles.length} label="velas" />
          <Stat value={votes.length} label="votos" />
        </View>

        {patron && (
          <Pressable style={styles.patronCard} onPress={() => router.push(`/saint/${patron.id}`)}>
            <Image source={{ uri: patron.image_url }} style={styles.patronImg} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <Text style={styles.patronLabel}>{t("myPatron")}</Text>
              <Text style={styles.patronName}>{patron.name}</Text>
            </View>
            <Icon name="chevron-right" size={20} color={colors.muted} />
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>{t("candleHistory")}</Text>
        {candles.length === 0 ? (
          <Text style={styles.empty}>{t("noCandles")}</Text>
        ) : (
          candles.slice(0, 10).map((c: any) => (
            <View key={c.id} style={styles.historyRow}>
              <Icon name="feather" size={18} color={colors.brandSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.historySaint}>{c.saint_name}</Text>
                <Text style={styles.historyIntention} numberOfLines={1}>
                  {c.intention}
                </Text>
              </View>
              <Text style={styles.historyPrice}>${c.price}</Text>
            </View>
          ))
        )}

        <View style={{ height: spacing.lg }} />
        {isStaff && (
          <MenuRow icon="grid" label={t("adminPanel")} onPress={() => router.push("/admin")} testID="open-admin-button" />
        )}
        <MenuRow icon="settings" label={t("settings")} onPress={() => router.push("/settings")} testID="open-settings-button" />
        <MenuRow icon="log-out" label={t("logout")} onPress={logout} testID="logout-button" danger />
      </ScrollView>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MenuRow({ icon, label, onPress, testID, danger }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} style={styles.menuRow}>
      <Icon name={icon} size={20} color={danger ? colors.error : colors.onSurfaceSecondary} />
      <Text style={[styles.menuLabel, danger && { color: colors.error }]}>{label}</Text>
      <Icon name="chevron-right" size={18} color={colors.muted} />
    </Pressable>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { backgroundColor: c.altarBg, alignItems: "center", paddingBottom: spacing.lg, borderBottomLeftRadius: radius.xl, borderBottomRightRadius: radius.xl },
  back: { position: "absolute", left: spacing.md, top: spacing.md, width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: c.altarCard, borderWidth: 2, borderColor: c.gold, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  name: { fontFamily: fonts.displayBold, fontSize: 26, color: c.onAltar, marginTop: spacing.sm },
  email: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted },
  roleBadge: { backgroundColor: c.brandSecondary, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 4, marginTop: spacing.sm },
  roleText: { fontFamily: fonts.bodySemibold, fontSize: 12, color: c.onBrandSecondary, textTransform: "uppercase" },
  statsRow: { flexDirection: "row", justifyContent: "space-around", backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md },
  stat: { alignItems: "center" },
  statValue: { fontFamily: fonts.displayBold, fontSize: 28, color: c.brand },
  statLabel: { fontFamily: fonts.body, fontSize: 12, color: c.muted, textTransform: "uppercase" },
  patronCard: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.sm, marginBottom: spacing.md },
  patronImg: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: c.surfaceTertiary },
  patronLabel: { fontFamily: fonts.body, fontSize: 12, color: c.muted, textTransform: "uppercase" },
  patronName: { fontFamily: fonts.displaySemibold, fontSize: 19, color: c.onSurface },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface, marginBottom: spacing.sm, marginTop: spacing.sm },
  empty: { fontFamily: fonts.body, fontStyle: "italic", color: c.muted },
  historyRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  historySaint: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.onSurface },
  historyIntention: { fontFamily: fonts.body, fontSize: 13, color: c.muted },
  historyPrice: { fontFamily: fonts.displayBold, fontSize: 16, color: c.brandSecondary },
  menuRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  menuLabel: { flex: 1, fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurface },
}));
