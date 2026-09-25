import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "expo-haptics";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { Icon, useToast } from "@/src/components/ui";
import { CandleFlame } from "@/src/components/CandleFlame";

const TYPES = [
  { key: "basic", price: 1, label: "candleBasic", desc: "candleBasicDesc" },
  { key: "solemn", price: 2, label: "candleSolemn", desc: "candleSolemnDesc" },
  { key: "permanent", price: 3, label: "candlePermanent", desc: "candlePermanentDesc" },
] as const;

export default function LightCandle() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { user } = useAuth();

  const { data } = useQuery({ queryKey: ["saints", "all"], queryFn: () => api("/saints", { auth: false }) });
  const saints = data?.saints ?? [];

  const [saintId, setSaintId] = useState<string | null>(user?.patron_saint_id ?? null);
  const [intention, setIntention] = useState("");
  const [type, setType] = useState("basic");
  const [forDeceased, setForDeceased] = useState(false);
  const [done, setDone] = useState(false);

  const lightMut = useMutation({
    mutationFn: () => api("/candles", { method: "POST", body: { saint_id: saintId, intention, type, category: forDeceased ? "difuntos" : "general" } }),
    onSuccess: () => {
      if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["candles"] });
      setDone(true);
    },
    onError: () => toast(t("authError"), "error"),
  });

  const submit = () => {
    if (!saintId) {
      toast(t("forWhichSaint"), "error");
      return;
    }
    if (!intention.trim()) {
      toast(t("intentionRequired"), "error");
      return;
    }
    lightMut.mutate();
  };

  if (done) {
    return (
      <View style={[styles.root, styles.doneWrap, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <View style={{ height: 220, justifyContent: "flex-end" }}>
          <CandleFlame size={170} lit variant={type} mourning={forDeceased} />
        </View>
        <Text style={styles.doneTitle}>{t("candleLit")}</Text>
        <Text style={styles.doneSub}>{t("candleLitSub")}</Text>
        <Text style={styles.impactSmall}>{t("impactNote")}</Text>
        <Pressable testID="candle-done-button" onPress={() => router.back()} style={styles.doneBtn}>
          <Text style={styles.doneBtnText}>{t("continue")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.title}>{t("lightCandleTitle")}</Text>
        <Pressable testID="close-candle-button" onPress={() => router.back()} style={styles.close}>
          <Icon name="x" size={22} color={colors.onAltar} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        <View style={styles.preview}>
          <CandleFlame size={150} lit variant={type} mourning={forDeceased} />
        </View>

        <Text style={styles.sectionLabel}>{t("forWhichSaint")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingVertical: spacing.sm }}>
          {saints.map((s: any) => (
            <Pressable
              key={s.id}
              testID={`candle-saint-${s.id}`}
              onPress={() => setSaintId(s.id)}
              style={[styles.saintChip, saintId === s.id && styles.saintChipActive]}
            >
              <Image source={{ uri: s.image_url }} style={styles.saintChipImg} contentFit="cover" />
              <Text style={styles.saintChipName} numberOfLines={1}>
                {s.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>{t("yourIntention")}</Text>
        <TextInput
          testID="candle-intention-input"
          value={intention}
          onChangeText={setIntention}
          multiline
          placeholder={t("intentionPlaceholder")}
          placeholderTextColor={colors.onAltarMuted}
          style={styles.input}
        />

        <Pressable testID="deceased-toggle" onPress={() => setForDeceased((v) => !v)} style={styles.deceasedRow}>
          <View style={[styles.checkbox, forDeceased && { backgroundColor: colors.brandSecondary, borderColor: colors.brandSecondary }]}>
            {forDeceased && <Icon name="check" size={14} color={colors.onBrandSecondary} />}
          </View>
          <Text style={styles.deceasedText}>{t("forDeceased")}</Text>
        </Pressable>

        <Text style={styles.sectionLabel}>{t("candleType")}</Text>
        {TYPES.map((ty) => (
          <Pressable
            key={ty.key}
            testID={`candle-type-${ty.key}`}
            onPress={() => setType(ty.key)}
            style={[styles.typeCard, type === ty.key && styles.typeCardActive]}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.typeName}>{t(ty.label)}</Text>
              <Text style={styles.typeDesc}>{t(ty.desc)}</Text>
            </View>
            <Text style={styles.typePrice}>${ty.price}{ty.key === "permanent" ? "/sem" : ""}</Text>
            <View style={[styles.radio, type === ty.key && styles.radioActive]}>
              {type === ty.key && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.simulated}>{t("simulatedPayment")}</Text>
        <Pressable testID="light-now-button" onPress={submit} style={styles.lightBtn} disabled={lightMut.isPending}>
          <Icon name="feather" size={20} color={colors.gold} />
          <Text style={styles.lightBtnText}>{t("lightNow")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.altarBg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  title: { fontFamily: fonts.displayBold, fontSize: 26, color: c.gold },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: c.altarCard, alignItems: "center", justifyContent: "center" },
  sectionLabel: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.onAltarMuted, textTransform: "uppercase", letterSpacing: 1, marginTop: spacing.md },
  preview: { height: 250, alignItems: "center", justifyContent: "flex-end", marginBottom: spacing.sm },
  deceasedRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.md },
  checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, borderColor: c.altarBorder, alignItems: "center", justifyContent: "center" },
  deceasedText: { fontFamily: fonts.body, fontSize: 16, color: c.onAltar, flex: 1 },
  saintChip: { width: 92, borderRadius: radius.md, overflow: "hidden", borderWidth: 2, borderColor: "transparent", backgroundColor: c.altarCard },
  saintChipActive: { borderColor: c.gold },
  saintChipImg: { width: "100%", height: 80, backgroundColor: c.altarCardSoft },
  saintChipName: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onAltar, padding: 6, textAlign: "center" },
  input: {
    minHeight: 90,
    borderWidth: 1,
    borderColor: c.altarBorder,
    borderRadius: radius.md,
    padding: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
    color: c.onAltar,
    backgroundColor: c.altarCard,
    marginTop: spacing.sm,
    textAlignVertical: "top",
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: c.altarCard,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: c.altarBorder,
  },
  typeCardActive: { borderColor: c.gold },
  typeName: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onAltar },
  typeDesc: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, marginTop: 2 },
  typePrice: { fontFamily: fonts.displayBold, fontSize: 20, color: c.gold },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.altarBorder, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: c.gold },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: c.gold },
  footer: { position: "absolute", left: 0, right: 0, bottom: 0, padding: spacing.md, backgroundColor: c.altarBgDeep, borderTopWidth: 1, borderTopColor: c.altarBorder },
  simulated: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, textAlign: "center", marginBottom: spacing.sm },
  lightBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, height: 56, borderRadius: radius.lg, backgroundColor: c.brandPrimary },
  lightBtnText: { fontFamily: fonts.bodyBold, fontSize: 18, color: c.gold },
  doneWrap: { alignItems: "center", justifyContent: "center", padding: spacing.lg },
  doneTitle: { fontFamily: fonts.displayBold, fontSize: 30, color: c.gold, marginTop: spacing.lg, textAlign: "center" },
  doneSub: { fontFamily: fonts.body, fontSize: 16, color: c.onAltar, textAlign: "center", marginTop: spacing.sm, fontStyle: "italic" },
  impactSmall: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, textAlign: "center", marginTop: spacing.lg },
  doneBtn: { marginTop: spacing.xl, backgroundColor: c.brandSecondary, borderRadius: radius.lg, paddingHorizontal: spacing.xl, height: 52, justifyContent: "center" },
  doneBtnText: { fontFamily: fonts.bodyBold, fontSize: 17, color: c.onBrandSecondary },
}));
