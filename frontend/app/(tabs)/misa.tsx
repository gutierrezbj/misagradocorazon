import { useEffect, useState } from "react";
import { View, Text, Pressable, FlatList, TextInput, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { WebView } from "react-native-webview";
import { useQuery, useMutation } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";

import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { api } from "@/src/api";
import { queryClient } from "@/src/query-client";
import { useI18n } from "@/src/i18n";
import { Icon, useToast } from "@/src/components/ui";
import { usesNativeTabs } from "@/src/navigation";

const HERO = "https://images.unsplash.com/photo-1465848059293-208e11dfea17?crop=entropy&cs=srgb&fm=jpg&q=85&w=1080";

function youtubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export default function Misa() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t, loc } = useI18n();
  const toast = useToast();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;

  const { data, isLoading } = useQuery({ queryKey: ["mass", "next"], queryFn: () => api("/masses/next", { auth: false }) });
  const { data: candlesData } = useQuery({ queryKey: ["candles", "community"], queryFn: () => api("/candles/community", { auth: false }) });
  const mass = data?.mass;

  const { data: chatData } = useQuery({
    queryKey: ["chat", mass?.id],
    queryFn: () => api(`/masses/${mass.id}/chat`, { auth: false }),
    enabled: !!mass?.id,
    refetchInterval: 8000,
  });
  const messages = chatData?.messages ?? [];

  const [msg, setMsg] = useState("");
  const chatMut = useMutation({
    mutationFn: () => api(`/masses/${mass.id}/chat`, { method: "POST", body: { text: msg } }),
    onSuccess: (res: any) => {
      setMsg("");
      queryClient.invalidateQueries({ queryKey: ["chat"] });
      if (res.flagged) toast(t("intentionFlagged"), "info");
    },
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const scheduled = mass ? new Date(mass.scheduled_at).getTime() : 0;
  const isLive = mass && now >= scheduled && now <= scheduled + 2 * 3600 * 1000;
  const diff = Math.max(0, scheduled - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  const vid = mass ? youtubeId(mass.youtube_url) : null;

  if (isLoading) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {/* Video / hero */}
      <View style={[styles.videoWrap, { paddingTop: insets.top }]}>
        {isLive && vid ? (
          <WebView
            style={styles.video}
            source={{ uri: `https://www.youtube.com/embed/${vid}?autoplay=1&playsinline=1` }}
            allowsFullscreenVideo
          />
        ) : (
          <View style={styles.video}>
            <Image source={{ uri: HERO }} style={styles.heroImg} contentFit="cover" />
            <LinearGradient colors={["rgba(0,0,0,0.2)", "rgba(28,15,14,0.92)"]} style={styles.heroOverlay} />
            <View style={styles.countdownBox}>
              <Text style={styles.nextLabel}>{t("nextMass")}</Text>
              <Text style={styles.massTitle}>{mass ? loc(mass.title) : ""}</Text>
              <View style={styles.countRow}>
                <TimeCell v={d} label={t("days")} />
                <TimeCell v={h} label={t("hours")} />
                <TimeCell v={m} label={t("minutes")} />
                <TimeCell v={s} label={t("seconds")} />
              </View>
            </View>
          </View>
        )}
        {isLive && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t("liveNow")}</Text>
          </View>
        )}
      </View>

      {/* Candles this week banner */}
      <View style={styles.candleBanner}>
        <Icon name="feather" size={18} color={colors.gold} />
        <Text style={styles.candleBannerText}>
          {candlesData?.total ?? 0} {t("candlesThisWeek")}
        </Text>
      </View>

      {/* Chat */}
      <View style={styles.chatHeader}>
        <Text style={styles.chatTitle}>{t("communityChat")}</Text>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(m: any) => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.msgRow}>
            <Text style={styles.msgName}>{item.name}</Text>
            <Text style={styles.msgText}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.chatEmpty}>{t("chatLoginNote")}</Text>}
      />
      <View style={[styles.inputBar, { paddingBottom: bottomChrome + spacing.sm }]}>
        <TextInput
          testID="chat-input"
          value={msg}
          onChangeText={setMsg}
          placeholder={t("chatPlaceholder")}
          placeholderTextColor={colors.muted}
          style={styles.chatInput}
        />
        <Pressable
          testID="chat-send-button"
          onPress={() => msg.trim() && mass && chatMut.mutate()}
          style={styles.sendBtn}
        >
          <Icon name="send" size={20} color={colors.onBrandPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

function TimeCell({ v, label }: { v: number; label: string }) {
  const styles = useStyles();
  return (
    <View style={styles.timeCell}>
      <Text style={styles.timeNum}>{String(v).padStart(2, "0")}</Text>
      <Text style={styles.timeLbl}>{label}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  videoWrap: { backgroundColor: c.altarBg },
  video: { width: "100%", aspectRatio: 16 / 10, backgroundColor: c.altarBg },
  heroImg: { ...abs(), width: "100%", height: "100%" },
  heroOverlay: { ...abs(), width: "100%", height: "100%" },
  countdownBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  nextLabel: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.gold, letterSpacing: 2, textTransform: "uppercase" },
  massTitle: { fontFamily: fonts.displayBold, fontSize: 24, color: c.onAltar, textAlign: "center", marginVertical: spacing.sm },
  countRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  timeCell: { alignItems: "center", minWidth: 52 },
  timeNum: { fontFamily: fonts.displayBold, fontSize: 34, color: c.gold },
  timeLbl: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, textTransform: "uppercase" },
  liveBadge: {
    position: "absolute",
    top: 50,
    right: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: c.brandPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
  liveText: { fontFamily: fonts.bodyBold, fontSize: 14, color: c.onBrandPrimary, letterSpacing: 1 },
  candleBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: c.surfaceSecondary,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: c.divider,
  },
  candleBannerText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: c.onSurfaceSecondary },
  chatHeader: { paddingHorizontal: spacing.md, paddingTop: spacing.md },
  chatTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: c.onSurface },
  msgRow: { backgroundColor: c.surfaceSecondary, borderRadius: radius.md, padding: spacing.sm + 2 },
  msgName: { fontFamily: fonts.bodySemibold, fontSize: 14, color: c.brand },
  msgText: { fontFamily: fonts.body, fontSize: 16, color: c.onSurface, marginTop: 2 },
  chatEmpty: { fontFamily: fonts.body, fontStyle: "italic", color: c.muted, textAlign: "center", marginTop: spacing.lg },
  inputBar: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: c.divider,
    backgroundColor: c.surface,
    alignItems: "center",
  },
  chatInput: {
    flex: 1,
    height: 46,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: 15,
    color: c.onSurface,
    backgroundColor: c.surfaceSecondary,
  },
  sendBtn: { width: 46, height: 46, borderRadius: 23, backgroundColor: c.brandPrimary, alignItems: "center", justifyContent: "center" },
}));

function abs() {
  return { position: "absolute" as const, top: 0, left: 0 };
}
