import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { AppButton, Icon } from "@/src/components/ui";

export default function SaintDetail() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, loc } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data, isLoading } = useQuery({ queryKey: ["saint", id], queryFn: () => api(`/saints/${id}`, { auth: false }) });
  const saint = data?.saint;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {isLoading || !saint ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: 100 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <Image source={{ uri: saint.image_url }} style={styles.heroImg} contentFit="cover" />
            <LinearGradient colors={["rgba(28,15,14,0.5)", "transparent", "rgba(28,15,14,0.95)"]} style={styles.heroScrim} />
            <Pressable testID="back-button" onPress={() => router.back()} style={[styles.back, { top: insets.top + spacing.sm }]}>
              <Icon name="arrow-left" size={22} color="#FDFBF7" />
            </Pressable>
            <View style={styles.heroText}>
              <Text style={styles.name}>{saint.name}</Text>
              {!!saint.feast_date && (
                <View style={styles.feastRow}>
                  <Icon name="calendar" size={14} color={colors.goldSoft} />
                  <Text style={styles.feast}>{saint.feast_date}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.body}>
            <Section title="Historia" text={loc(saint.history)} />
            {!!loc(saint.patronages) && <Section title="Advocaciones" text={loc(saint.patronages)} />}
            {!!loc(saint.prayer) && (
              <View style={styles.prayerBox}>
                <Text style={styles.prayerLabel}>Oración</Text>
                <Text style={styles.prayerText}>{loc(saint.prayer)}</Text>
              </View>
            )}
            <View style={{ height: spacing.lg }} />
            <AppButton
              testID="light-candle-to-saint-button"
              label={t("lightCandle")}
              icon="feather"
              onPress={() => router.push("/light-candle")}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  const styles = useStyles();
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  hero: { height: 360 },
  heroImg: { width: "100%", height: "100%", backgroundColor: c.surfaceTertiary },
  heroScrim: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  back: { position: "absolute", left: spacing.md, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  heroText: { position: "absolute", bottom: spacing.lg, left: spacing.md, right: spacing.md },
  name: { fontFamily: fonts.displayBold, fontSize: 36, color: "#FDFBF7" },
  feastRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  feast: { fontFamily: fonts.bodyMedium, fontSize: 15, color: c.goldSoft },
  body: { padding: spacing.lg },
  sectionTitle: { fontFamily: fonts.displaySemibold, fontSize: 22, color: c.brand, marginBottom: spacing.sm },
  sectionText: { fontFamily: fonts.body, fontSize: 17, lineHeight: 27, color: c.onSurfaceSecondary },
  prayerBox: { backgroundColor: c.surfaceSecondary, borderRadius: radius.lg, padding: spacing.lg, borderLeftWidth: 4, borderLeftColor: c.brandSecondary },
  prayerLabel: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm },
  prayerText: { fontFamily: fonts.display, fontSize: 22, lineHeight: 32, color: c.onSurface, fontStyle: "italic" },
}));
