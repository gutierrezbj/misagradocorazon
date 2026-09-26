// Reproductor de audio devocional (SDD-05 US-05, US-06, US-08, US-09).
// Sigue sonando con la app en segundo plano o el teléfono bloqueado y muestra controles en la
// pantalla de bloqueo. El audio lo graba el equipo (CLAUDE.md): aquí solo se reproduce una URL.
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View, type LayoutChangeEvent } from "react-native";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { useI18n } from "@/src/i18n";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { Icon } from "@/src/components/ui";

const SKIP_SECONDS = 15;
const LOAD_TIMEOUT_MS = 20_000;

// Una sola vez por sesión. "doNotMix" es obligatorio para los controles de la pantalla de bloqueo.
let audioModeReady: Promise<void> | null = null;
function ensureAudioMode() {
  audioModeReady ??= setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "doNotMix",
  }).catch(() => {
    audioModeReady = null;
  });
  return audioModeReady;
}

function mmss(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

type Props = {
  url: string;
  /** Título en la pantalla de bloqueo (p. ej. "Oración de la mañana"). */
  title: string;
  artworkUrl?: string;
  /** Empieza a sonar al cargar (al llegar desde una notificación, SDD flujos 1 y 2). */
  autoPlay?: boolean;
  /** "altar": fondo oscuro de las oraciones; "surface": fondo claro de las fichas. */
  tone?: "altar" | "surface";
  testID?: string;
};

export function AudioPlayer({ url, title, artworkUrl, autoPlay = false, tone = "surface", testID = "audio-player" }: Props) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useStyles();
  const player = useAudioPlayer({ uri: url }, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [trackWidth, setTrackWidth] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const lockScreenOn = useRef(false);
  const autoPlayed = useRef(false);

  const fg = tone === "altar" ? colors.onAltar : colors.onSurface;
  const muted = tone === "altar" ? colors.onAltarMuted : colors.muted;
  const accent = tone === "altar" ? colors.gold : colors.brandPrimary;
  const onAccent = tone === "altar" ? colors.altarBg : colors.onBrandPrimary;

  // Sin carga en un tiempo razonable (URL rota, sin conexión): se ofrece reintentar.
  useEffect(() => {
    if (status.isLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status.isLoaded, url, attempt]);
  const failed = timedOut && !status.isLoaded;

  const play = async () => {
    await ensureAudioMode();
    if (status.duration > 0 && status.currentTime >= status.duration - 0.5) await player.seekTo(0);
    player.play();
    if (!lockScreenOn.current) {
      player.setActiveForLockScreen(
        true,
        { title, artist: "Mi Sagrado Corazón", ...(artworkUrl && { artworkUrl }) },
        { showSeekForward: true, showSeekBackward: true },
      );
      lockScreenOn.current = true;
    }
  };

  useEffect(() => {
    if (autoPlay && status.isLoaded && !autoPlayed.current) {
      autoPlayed.current = true;
      void play();
    }
    // play depende del estado actual; solo interesa el primer momento en que carga.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, status.isLoaded]);

  // Al salir de la pantalla se quitan los controles de la pantalla de bloqueo (el reproductor lo libera expo-audio).
  useEffect(
    () => () => {
      if (lockScreenOn.current) player.clearLockScreenControls();
    },
    [player],
  );

  const skip = (delta: number) => {
    const next = Math.max(status.currentTime + delta, 0);
    // Si la duración aún no se conoce (0), no se limita por arriba.
    const target = status.duration > 0 ? Math.min(next, status.duration) : next;
    void player.seekTo(target);
  };

  const onTrackPress = (x: number) => {
    if (!trackWidth || !status.duration) return;
    void player.seekTo((x / trackWidth) * status.duration);
  };

  const retry = () => {
    setTimedOut(false);
    setAttempt((n) => n + 1);
    player.replace({ uri: url });
  };

  const progress = status.duration > 0 ? Math.min(status.currentTime / status.duration, 1) : 0;
  const loading = !status.isLoaded || status.isBuffering;

  if (failed) {
    return (
      <View testID={testID} style={[styles.box, tone === "altar" ? styles.boxAltar : styles.boxSurface]}>
        <Text style={[styles.error, { color: fg }]}>{t("audioError")}</Text>
        <Pressable onPress={retry} accessibilityRole="button" style={styles.retry}>
          <Text style={[styles.retryText, { color: accent }]}>{t("retry")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View testID={testID} style={[styles.box, tone === "altar" ? styles.boxAltar : styles.boxSurface]}>
      <View style={styles.controls}>
        <Pressable
          testID={`${testID}-back`}
          onPress={() => skip(-SKIP_SECONDS)}
          disabled={!status.isLoaded}
          accessibilityRole="button"
          accessibilityLabel={t("audioBack15")}
          style={styles.skip}
        >
          <Icon name="rotate-ccw" size={22} color={fg} />
          <Text style={[styles.skipText, { color: muted }]}>{SKIP_SECONDS}</Text>
        </Pressable>

        <Pressable
          testID={`${testID}-toggle`}
          onPress={() => (status.playing ? player.pause() : void play())}
          disabled={!status.isLoaded}
          accessibilityRole="button"
          accessibilityLabel={status.playing ? t("audioPause") : t("audioPlay")}
          style={[styles.main, { backgroundColor: accent, opacity: status.isLoaded ? 1 : 0.6 }]}
        >
          {loading && !status.playing ? (
            <ActivityIndicator color={onAccent} />
          ) : (
            <Icon name={status.playing ? "pause" : "play"} size={28} color={onAccent} />
          )}
        </Pressable>

        <Pressable
          testID={`${testID}-forward`}
          onPress={() => skip(SKIP_SECONDS)}
          disabled={!status.isLoaded}
          accessibilityRole="button"
          accessibilityLabel={t("audioForward15")}
          style={styles.skip}
        >
          <Icon name="rotate-cw" size={22} color={fg} />
          <Text style={[styles.skipText, { color: muted }]}>{SKIP_SECONDS}</Text>
        </Pressable>
      </View>

      <Pressable
        onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
        onPress={(e) => onTrackPress(e.nativeEvent.locationX)}
        accessibilityRole="adjustable"
        accessibilityLabel={t("audioProgress")}
        accessibilityValue={{ min: 0, max: Math.round(status.duration), now: Math.round(status.currentTime) }}
        style={styles.trackHit}
      >
        <View style={[styles.track, { backgroundColor: tone === "altar" ? "rgba(253,251,247,0.18)" : colors.border }]}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: accent }]} />
        </View>
      </Pressable>
      <View style={styles.times}>
        <Text testID={`${testID}-elapsed`} style={[styles.time, { color: muted }]}>{mmss(status.currentTime)}</Text>
        <Text style={[styles.time, { color: muted }]}>{status.duration > 0 ? mmss(status.duration) : "–:––"}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  box: { borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  boxSurface: { backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  boxAltar: { backgroundColor: "rgba(253,251,247,0.06)", borderWidth: 1, borderColor: "rgba(197,160,89,0.35)" },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xl },
  main: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  skip: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  skipText: { fontFamily: fonts.bodySemibold, fontSize: 14, marginTop: 2 },
  trackHit: { paddingVertical: 10 },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  times: { flexDirection: "row", justifyContent: "space-between" },
  time: { fontFamily: fonts.bodyMedium, fontSize: 14, fontVariant: ["tabular-nums"] },
  error: { fontFamily: fonts.body, fontSize: 16, textAlign: "center" },
  retry: { alignSelf: "center", paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  retryText: { fontFamily: fonts.bodySemibold, fontSize: 16 },
}));
