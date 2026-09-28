// Mini-player de las pestañas (SDD-07: "el mini-player aparece al navegar"). Mientras hay un audio
// activo, permite pausarlo o reanudarlo, cerrarlo o volver a su pantalla.
import { Pressable, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { track } from "@/src/analytics";
import { MINI_PLAYER_HEIGHT, useAudio } from "@/src/ritual/audio-state";
import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { Icon } from "@/src/components/ui";

/** `compact`: versión en línea de la barra nativa de iOS 26, más estrecha. */
export function MiniPlayer({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  const audio = useAudio();
  const current = audio.loaded;
  if (!audio.active || !current) return null;

  const { playing, currentTime, duration, isLoaded } = audio.status;
  const progress = duration > 0 ? Math.min(currentTime / duration, 1) : 0;
  const toggle = () => {
    track("mini_player_used", { action: "toggle" });
    if (playing) audio.pause();
    else void audio.play(current);
  };

  return (
    <View testID="mini-player" style={[styles.bar, compact && styles.barCompact]}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>
      <Pressable
        testID="mini-player-open"
        accessibilityRole="button"
        accessibilityLabel={`${t("miniPlayerOpen")}: ${current.title}`}
        onPress={() => {
          track("mini_player_used", { action: "open" });
          router.push(current.route as Href);
        }}
        style={styles.info}
      >
        <Icon name="headphones" size={20} color={colors.gold} />
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={styles.title}>
            {current.title}
          </Text>
          {!compact && <Text style={styles.sub}>{playing ? t("miniPlayerPlaying") : t("miniPlayerPaused")}</Text>}
        </View>
      </Pressable>
      <Pressable
        testID="mini-player-toggle"
        accessibilityRole="button"
        accessibilityLabel={playing ? t("audioPause") : t("audioPlay")}
        disabled={!isLoaded}
        onPress={toggle}
        style={styles.btn}
      >
        <Icon name={playing ? "pause" : "play"} size={22} color={colors.onAltar} />
      </Pressable>
      {!compact && (
        <Pressable
          testID="mini-player-close"
          accessibilityRole="button"
          accessibilityLabel={t("miniPlayerClose")}
          onPress={() => {
            track("mini_player_used", { action: "close" });
            audio.close();
          }}
          style={styles.btn}
        >
          <Icon name="x" size={20} color={colors.onAltarMuted} />
        </Pressable>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  bar: {
    height: MINI_PLAYER_HEIGHT,
    marginHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: c.altarBg,
    borderWidth: 1,
    borderColor: "rgba(197,160,89,0.35)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    overflow: "hidden",
  },
  barCompact: { height: "100%", marginHorizontal: 0, marginBottom: 0, borderWidth: 0, borderRadius: 0, backgroundColor: "transparent" },
  track: { position: "absolute", left: 0, right: 0, top: 0, height: 2, backgroundColor: "rgba(253,251,247,0.12)" },
  fill: { height: 2, backgroundColor: c.gold },
  info: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 44, paddingHorizontal: spacing.xs },
  title: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onAltar },
  sub: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted },
  btn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
}));
