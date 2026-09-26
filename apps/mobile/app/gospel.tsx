import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, spacing, useTheme } from "@/src/theme";
import { api, deviceTimeZone } from "@/src/api";
import { useAuth } from "@/src/auth";
import type { Daily } from "@/src/types";
import { useI18n } from "@/src/i18n";
import { Icon } from "@/src/components/ui";
import { AudioPlayer } from "@/src/components/AudioPlayer";

export default function Gospel() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, loc, lang } = useI18n();

  const { user } = useAuth();
  const { data: daily, isLoading } = useQuery({
    queryKey: ["daily"],
    queryFn: () => api<Daily>(`/daily?tz=${encodeURIComponent(user?.timezone ?? deviceTimeZone())}`),
  });

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable testID="back-button" onPress={() => router.back()} style={styles.back}>
          <Icon name="arrow-left" size={22} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("gospelToday")}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xl }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: insets.bottom + spacing.xl }} showsVerticalScrollIndicator={false}>
          <Text style={styles.ref}>{daily?.gospel.ref}</Text>
          <Text style={styles.gospel}>{loc(daily?.gospel)}</Text>
          <View style={styles.divider} />
          <Text style={styles.medLabel}>{t("meditation")}</Text>
          {!!daily?.meditation.audioUrl[lang] && (
            <View style={{ marginBottom: spacing.md }}>
              <AudioPlayer url={daily.meditation.audioUrl[lang]!} title={t("meditation")} />
            </View>
          )}
          <Text style={styles.meditation}>{loc(daily?.meditation)}</Text>
        </ScrollView>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 1, borderBottomColor: c.divider },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: fonts.displaySemibold, fontSize: 20, color: c.onSurface },
  ref: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.brand, textTransform: "uppercase", letterSpacing: 1 },
  gospel: { fontFamily: fonts.display, fontSize: 24, lineHeight: 36, color: c.onSurface, marginTop: spacing.md },
  divider: { height: 1, backgroundColor: c.divider, marginVertical: spacing.lg },
  medLabel: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm },
  meditation: { fontFamily: fonts.body, fontSize: 17, lineHeight: 28, color: c.onSurfaceSecondary },
}));
