import { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import { AppButton, Icon, useToast } from "@/src/components/ui";

type Saint = { id: string; name: string; image_url: string; feast_date: string };

const TIMES = ["06:00", "06:30", "07:00", "07:30", "08:00", "12:00", "18:00", "20:00", "21:00", "21:30", "22:00"];

export default function Onboarding() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useI18n();
  const toast = useToast();
  const { setUser } = useAuth();

  const { data } = useQuery({
    queryKey: ["saints", "patron"],
    queryFn: () => api<{ saints: Saint[] }>("/saints?patron_only=true", { auth: false }),
  });
  const saints = data?.saints ?? [];

  const [patron, setPatron] = useState<string | null>(null);
  const [secondary, setSecondary] = useState<string[]>([]);
  const [morning, setMorning] = useState("07:30");
  const [night, setNight] = useState("21:30");
  const [busy, setBusy] = useState(false);

  const toggleSecondary = (id: string) => {
    if (id === patron) return;
    setSecondary((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const finish = async () => {
    if (!patron) {
      toast(t("chooseSaint"), "error");
      return;
    }
    setBusy(true);
    try {
      const res = await api<{ user: any }>("/auth/onboarding", {
        method: "PUT",
        body: {
          patron_saint_id: patron,
          secondary_saint_ids: secondary,
          morning_time: morning,
          angelus_time: "12:00",
          night_time: night,
          language: lang,
        },
      });
      setUser(res.user);
    } catch {
      toast(t("authError"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{t("chooseSaint")}</Text>
          <Text style={styles.sub}>{t("chooseSaintSub")}</Text>
        </View>

        <View style={styles.grid}>
          {saints.map((s) => {
            const isPatron = patron === s.id;
            const isSecondary = secondary.includes(s.id);
            return (
              <Pressable
                key={s.id}
                testID={`saint-${s.id}`}
                onPress={() => setPatron(s.id)}
                onLongPress={() => toggleSecondary(s.id)}
                style={[styles.saintCard, isPatron && styles.saintCardActive]}
              >
                <Image source={{ uri: s.image_url }} style={styles.saintImg} contentFit="cover" />
                {isPatron && (
                  <View style={styles.badge}>
                    <Icon name="star" size={14} color={colors.onBrandSecondary} />
                  </View>
                )}
                {isSecondary && !isPatron && (
                  <View style={[styles.badge, { backgroundColor: colors.surfaceInverse }]}>
                    <Icon name="plus" size={14} color={colors.gold} />
                  </View>
                )}
                <Text style={styles.saintName} numberOfLines={2}>
                  {s.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>{t("secondarySaints")} · manténlo pulsado / long press</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("prayerTimes")}</Text>
          <Text style={styles.timeLabel}>{t("morning")}</Text>
          <TimeRow value={morning} onChange={setMorning} />
          <Text style={styles.timeLabel}>{t("night")}</Text>
          <TimeRow value={night} onChange={setNight} />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("language")}</Text>
          <View style={styles.langRow}>
            {(["es", "en"] as const).map((l) => (
              <Pressable
                key={l}
                testID={`lang-${l}`}
                onPress={() => setLang(l)}
                style={[styles.langChip, lang === l && styles.langChipActive]}
              >
                <Text style={[styles.langText, lang === l && { color: colors.onBrandPrimary }]}>
                  {l === "es" ? "Español" : "English"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.lg }}>
          <AppButton testID="finish-onboarding-button" label={t("finish")} onPress={finish} loading={busy} icon="arrow-right" />
        </View>
      </ScrollView>
    </View>
  );
}

function TimeRow({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {TIMES.map((tm) => (
        <Pressable
          key={tm}
          onPress={() => onChange(tm)}
          style={[styles.timeChip, value === tm && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]}
        >
          <Text style={[styles.timeChipText, value === tm && { color: colors.onBrandPrimary }]}>{tm}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: spacing.md, marginBottom: spacing.lg },
  title: { fontFamily: fonts.displayBold, fontSize: 32, color: c.onSurface },
  sub: { fontFamily: fonts.body, fontSize: 16, color: c.muted, marginTop: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: spacing.md - 4, justifyContent: "space-between" },
  saintCard: {
    width: "31%",
    marginHorizontal: "1%",
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: c.surfaceSecondary,
    borderWidth: 2,
    borderColor: "transparent",
  },
  saintCardActive: { borderColor: c.brandSecondary },
  saintImg: { width: "100%", height: 110, backgroundColor: c.surfaceTertiary },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: c.brandSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  saintName: { fontFamily: fonts.displaySemibold, fontSize: 15, color: c.onSurface, padding: 8, textAlign: "center" },
  hint: { fontFamily: fonts.body, fontSize: 13, color: c.muted, textAlign: "center", marginBottom: spacing.md },
  section: { paddingHorizontal: spacing.md, marginTop: spacing.md },
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 22, color: c.onSurface, marginBottom: spacing.sm },
  timeLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onSurfaceSecondary, marginTop: spacing.sm },
  timeChip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  timeChipText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: c.onSurfaceSecondary },
  langRow: { flexDirection: "row", gap: spacing.sm },
  langChip: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: c.surfaceSecondary,
  },
  langChipActive: { backgroundColor: c.brandPrimary, borderColor: c.brandPrimary },
  langText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onSurfaceSecondary },
}));
