import { View, Text, Pressable, ScrollView, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api, ApiError } from "@/src/api";
import type { CurrentCauses, Transparency } from "@/src/types";
import { queryClient } from "@/src/query-client";
import { useI18n } from "@/src/i18n";
import { Icon, useToast } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";

export default function Causas() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, loc } = useI18n();
  const toast = useToast();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const { data, isLoading } = useQuery({ queryKey: ["causes", "current"], queryFn: () => api<CurrentCauses>("/causes/current") });
  const { data: transp } = useQuery({ queryKey: ["transparency"], queryFn: () => api<Transparency>("/transparency") });

  const causes = data?.causes ?? [];
  const myVote = data?.myVoteCauseId;
  const votingOpen = data?.votingOpen;

  const voteMut = useMutation({
    mutationFn: (id: string) => api(`/causes/${id}/vote`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["causes", "current"] });
      toast(t("voteRegistered"), "success");
    },
    onError: (e) => toast(e instanceof ApiError && e.code === "already_voted" ? t("alreadyVoted") : t("authError"), "error"),
  });

  // Meses con causa ganadora o financiada; el importe transferido sale del libro de movimientos.
  const records = (transp?.months ?? []).filter((m) => m.cause);
  const totalTransferredCents = transp?.totals.transferredCents ?? 0;

  if (isLoading) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: bottomChrome + spacing["2xl"] }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("causesTitle")}</Text>
          <Text style={styles.sub}>{t("causesSub")}</Text>
          <View style={styles.votesPill}>
            <Icon name="check-circle" size={15} color={colors.onBrandTertiary} />
            <Text style={styles.votesPillText}>
              {data?.totalVotes ?? 0} {t("totalVotes")}
            </Text>
          </View>
        </View>

        {causes.map((cause: any) => {
          const voted = myVote === cause.id;
          return (
            <View key={cause.id} testID={`cause-${cause.id}`} style={styles.card}>
              <View style={styles.imgWrap}>
                <Image source={{ uri: cause.photos?.[0] }} style={styles.cardImg} contentFit="cover" />
                <LinearGradient colors={["transparent", "rgba(28,15,14,0.85)"]} style={styles.imgScrim} />
                <View style={styles.imgTextWrap}>
                  <Text style={styles.causeName}>{loc(cause.name)}</Text>
                  <View style={styles.locationRow}>
                    <Icon name="map-pin" size={13} color={colors.goldSoft} />
                    <Text style={styles.location}>{cause.location}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.desc} numberOfLines={3}>
                  {loc(cause.description)}
                </Text>
                <View style={styles.metaRow}>
                  <Meta icon="user" label={t("responsible")} value={cause.responsible} />
                  <Meta icon="dollar-sign" label={t("budget")} value={`$${(cause.budgetCents / 100).toLocaleString()}`} />
                </View>

                {/* Progress */}
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${cause.percentage ?? 0}%` }]} />
                </View>
                <Text style={styles.percentage}>{cause.percentage ?? 0}% · {cause.votes ?? 0} {t("votesLabel")}</Text>

                <Pressable
                  testID={`vote-${cause.id}`}
                  disabled={!!myVote || !votingOpen || voteMut.isPending}
                  onPress={() => {
                    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    voteMut.mutate(cause.id);
                  }}
                  style={[styles.voteBtn, (voted || (!!myVote && !voted) || !votingOpen) && styles.voteBtnDisabled, voted && styles.voteBtnVoted]}
                >
                  <Icon
                    name={voted ? "check" : "heart"}
                    size={18}
                    color={voted ? colors.onSuccess : !myVote && votingOpen ? colors.onBrandPrimary : colors.muted}
                  />
                  <Text
                    style={[
                      styles.voteBtnText,
                      { color: voted ? colors.onSuccess : !myVote && votingOpen ? colors.onBrandPrimary : colors.muted },
                    ]}
                  >
                    {voted ? t("voted") : !votingOpen ? t("votingClosed") : t("vote")}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* Transparency */}
        <View style={styles.transpSection}>
          <Text style={styles.transpTitle}>{t("transparency")}</Text>
          <LinearGradient colors={[colors.brand, colors.brandPrimary]} style={styles.impactCard}>
            <Text style={styles.impactLabel}>{t("totalImpact")}</Text>
            <Text style={styles.impactValue}>${(totalTransferredCents / 100).toLocaleString()}</Text>
            <Text style={styles.impactNote}>{t("impactNote")}</Text>
          </LinearGradient>

          <Text style={styles.fundedTitle}>{t("fundedCauses")}</Text>
          {records.map((r) => (
            <View key={r.month} style={styles.fundedRow}>
              <View style={styles.fundedIcon}>
                <Icon name="gift" size={18} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fundedName}>{r.cause ? loc(r.cause.name) : r.month}</Text>
                <Text style={styles.fundedMonth}>{r.month}</Text>
              </View>
              <Text style={styles.fundedAmount}>${(r.transferredCents / 100).toLocaleString()}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function Meta({ icon, label, value }: any) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.metaLabelRow}>
        <Icon name={icon} size={13} color={colors.muted} />
        <Text style={styles.metaLabel}>{label}</Text>
      </View>
      <Text style={styles.metaValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  title: { fontFamily: fonts.displayBold, fontSize: 30, color: c.onSurface },
  sub: { fontFamily: fonts.body, fontSize: 16, color: c.muted, marginTop: 2 },
  votesPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: c.brandTertiary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: spacing.sm,
  },
  votesPillText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onBrandTertiary },
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: c.surfaceSecondary,
    borderWidth: 1,
    borderColor: c.border,
  },
  imgWrap: { height: 170 },
  cardImg: { width: "100%", height: "100%", backgroundColor: c.surfaceTertiary },
  imgScrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: 120 },
  imgTextWrap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.md },
  causeName: { fontFamily: fonts.displayBold, fontSize: 24, color: "#FDFBF7" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  location: { fontFamily: fonts.body, fontSize: 14, color: "#E8D9B9" },
  cardBody: { padding: spacing.md },
  desc: { fontFamily: fonts.body, fontSize: 16, color: c.onSurfaceSecondary, lineHeight: 24 },
  metaRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.md },
  metaLabelRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.muted, textTransform: "uppercase" },
  metaValue: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.onSurface, marginTop: 2 },
  progressTrack: { height: 10, borderRadius: 5, backgroundColor: c.surfaceTertiary, marginTop: spacing.md, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5, backgroundColor: c.brandSecondary },
  percentage: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onSurfaceSecondary, marginTop: 6 },
  voteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: c.brandPrimary,
    marginTop: spacing.md,
  },
  voteBtnDisabled: { backgroundColor: c.surfaceTertiary },
  voteBtnVoted: { backgroundColor: c.success },
  voteBtnText: { fontFamily: fonts.bodySemibold, fontSize: 16 },
  transpSection: { paddingHorizontal: spacing.md, marginTop: spacing.sm },
  transpTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: c.onSurface, marginBottom: spacing.md },
  impactCard: { borderRadius: radius.lg, padding: spacing.lg, alignItems: "center" },
  impactLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.goldSoft, textTransform: "uppercase", letterSpacing: 1 },
  impactValue: { fontFamily: fonts.displayBold, fontSize: 48, color: "#FDFBF7", marginVertical: 4 },
  impactNote: { fontFamily: fonts.body, fontSize: 14, color: c.goldSoft },
  fundedTitle: { fontFamily: fonts.displaySemibold, fontSize: 19, color: c.onSurface, marginTop: spacing.lg, marginBottom: spacing.sm },
  fundedRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  fundedIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.brandTertiary, alignItems: "center", justifyContent: "center" },
  fundedName: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.onSurface },
  fundedMonth: { fontFamily: fonts.body, fontSize: 14, color: c.muted },
  fundedAmount: { fontFamily: fonts.displayBold, fontSize: 18, color: c.success },
}));
