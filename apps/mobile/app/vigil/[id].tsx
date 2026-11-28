// La vela en pantalla (SDD-05 US-31, aprobada el 28-nov-2026): la vela del fiel a pantalla completa
// mientras ora, por ejemplo en la mesita de noche. La cera baja según lo que le queda de verdad.
// - La intención está oculta (RGPD art. 9: otra persona puede ver la pantalla).
// - La pantalla no se apaga mientras dura el temporizador que elige el fiel.
// - Si la vela se consume, la llama se apaga despacio. No se ofrece encender otra (decisión del
//   fundador) y no se nombran causas, donativos ni el 20 % (Apple 3.2.2.iv).
// KPIs: candle_vigil_started y candle_vigil_ended.
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from "react-native-reanimated";

import { api, deviceTimeZone } from "@/src/api";
import { track } from "@/src/analytics";
import { useAuth } from "@/src/auth";
import { Icon } from "@/src/components/ui";
import { useI18n, type Key } from "@/src/i18n";
import { AudioPlayer } from "@/src/ritual/AudioPlayer";
import { CandleFlame } from "@/src/ritual/CandleFlame";
import { useKeepScreenOn } from "@/src/ritual/keep-awake";
import {
  DEFAULT_VIGIL_TIMER,
  DRIFT_EVERY_MS,
  VIGIL_TIMERS,
  driftOffset,
  remainingFraction,
  remainingParts,
  waxLevel,
  type VigilTimer,
} from "@/src/ritual/vigil";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import type { Daily, MyCandle } from "@/src/types";

const CONTROLS_MS = 5_000;
const INTENTION_MS = 10_000;
const FADE_MS = 4_000;
const TICK_MS = 30_000;

type EndReason = "user" | "timer" | "expired";

export default function Vigil() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, lang } = useI18n();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: candles, isLoading } = useQuery({ queryKey: ["candles", "me"], queryFn: () => api<MyCandle[]>("/candles/me") });
  const { data: daily } = useQuery({
    queryKey: ["daily"],
    queryFn: () => api<Daily>(`/daily?tz=${encodeURIComponent(user?.timezone ?? deviceTimeZone())}`),
  });
  const candle = candles?.find((c) => c.id === id);

  const [now, setNow] = useState(() => Date.now());
  const [choice, setChoice] = useState<VigilTimer>(DEFAULT_VIGIL_TIMER);
  const [timer, setTimer] = useState<VigilTimer | null>(null);
  const [timerDone, setTimerDone] = useState(false);
  const [controls, setControls] = useState(false);
  // Cada toque en los controles vuelve a contar los 5 s antes de ocultarlos.
  const [poke, setPoke] = useState(0);
  const keepControls = () => setPoke((p) => p + 1);
  const [showIntention, setShowIntention] = useState(false);
  const [drift, setDrift] = useState(0);

  const fraction = candle ? remainingFraction(candle.litAt, candle.expiresAt, now) : 0;
  const consumed = !!candle && fraction <= 0;
  const keepOn = useKeepScreenOn(timer !== null && !timerDone && !consumed);

  // Reloj: cada 30 s, y justo en el momento en que la vela se consume.
  useEffect(() => {
    if (!candle || consumed) return;
    const left = Date.parse(candle.expiresAt) - now;
    const to = setTimeout(() => setNow(Date.now()), Math.min(TICK_MS, Math.max(0, left)));
    return () => clearTimeout(to);
  }, [candle, consumed, now]);

  // La llama se desplaza unos píxeles cada pocos minutos para no marcar la pantalla.
  useEffect(() => {
    const iv = setInterval(() => setDrift((d) => d + 1), DRIFT_EVERY_MS);
    return () => clearInterval(iv);
  }, []);

  // Analítica: una sola vez al empezar y otra al terminar, con el motivo.
  const startedAt = useRef<number | null>(null);
  const ended = useRef(false);
  const end = useCallback((reason: EndReason) => {
    if (startedAt.current === null || ended.current) return;
    ended.current = true;
    track("candle_vigil_ended", { minutes: Math.round((Date.now() - startedAt.current) / 60_000), reason });
  }, []);
  useEffect(() => () => end("user"), [end]);

  const start = () => {
    if (!candle) return;
    startedAt.current = Date.now();
    setTimer(choice);
    track("candle_vigil_started", { type: candle.type, timer: choice });
  };

  useEffect(() => {
    if (timer === null || consumed) return;
    const to = setTimeout(() => {
      setTimerDone(true);
      end("timer");
    }, timer * 60_000);
    return () => clearTimeout(to);
  }, [timer, consumed, end]);

  useEffect(() => {
    if (consumed) end("expired");
  }, [consumed, end]);

  // Los controles y la intención se ocultan solos.
  useEffect(() => {
    if (!controls) return;
    const to = setTimeout(() => setControls(false), CONTROLS_MS);
    return () => clearTimeout(to);
  }, [controls, poke]);
  useEffect(() => {
    if (!showIntention) return;
    const to = setTimeout(() => setShowIntention(false), INTENTION_MS);
    return () => clearTimeout(to);
  }, [showIntention]);

  // La llama se apaga despacio al consumirse la vela.
  const flame = useSharedValue(1);
  useEffect(() => {
    flame.value = consumed ? withTiming(0, { duration: reduceMotion ? 0 : FADE_MS }) : 1;
  }, [consumed, reduceMotion, flame]);
  const flameStyle = useAnimatedStyle(() => ({ opacity: flame.value }));

  const close = () => {
    end("user");
    router.back();
  };

  const nightPrayer = daily?.nightPrayer;
  const nightAudio = nightPrayer?.audioUrl[lang];

  const left = () => {
    if (!candle) return "";
    const { days, hours, minutes } = remainingParts(Date.parse(candle.expiresAt) - now);
    const part = (n: number, one: Key, many: Key) => `${n} ${t(n === 1 ? one : many)}`;
    const parts =
      days > 0
        ? [part(days, "vigilDay", "vigilDays"), hours > 0 && part(hours, "vigilHour", "vigilHours")]
        : hours > 0
          ? [part(hours, "vigilHour", "vigilHours"), minutes > 0 && part(minutes, "vigilMinute", "vigilMinutes")]
          : [part(minutes, "vigilMinute", "vigilMinutes")];
    return t("vigilLeft").replace("{time}", parts.filter(Boolean).join(` ${t("vigilAnd")} `));
  };

  if (isLoading) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar hidden />
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }

  if (!candle) {
    return (
      <View style={[styles.root, styles.center, { padding: spacing.lg }]}>
        <StatusBar hidden />
        <Text style={styles.message}>{t("vigilNotFound")}</Text>
        <Pressable testID="vigil-close" accessibilityRole="button" onPress={() => router.back()} style={styles.pill}>
          <Text style={styles.pillText}>{t("close")}</Text>
        </Pressable>
      </View>
    );
  }

  const [dx, dy] = driftOffset(drift);
  const variant = candle.type;
  const mourning = candle.category === "difuntos";
  const choosing = timer === null && !consumed;

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <Pressable
        testID="vigil-screen"
        accessibilityRole="button"
        accessibilityLabel={t("vigilShowControls")}
        onPress={() => setControls((v) => !v)}
        disabled={choosing}
        style={[styles.center, { flex: 1, paddingTop: insets.top, paddingBottom: insets.bottom }]}
      >
        <View style={{ transform: [{ translateX: dx }, { translateY: dy }], alignItems: "center" }}>
          <View testID="vigil-candle" style={styles.candle}>
            <View style={styles.layer}>
              <CandleFlame size={180} lit={false} variant={variant} mourning={mourning} level={waxLevel(fraction)} still />
            </View>
            <Animated.View testID="vigil-flame" style={[styles.layer, flameStyle]} pointerEvents="none">
              <CandleFlame size={180} lit variant={variant} mourning={mourning} level={waxLevel(fraction)} still={reduceMotion} />
            </Animated.View>
          </View>
          {consumed ? (
            <>
              <Text testID="vigil-consumed" style={styles.title}>
                {t("vigilConsumed")}
              </Text>
              <Text style={styles.sub}>{t("vigilConsumedSub")}</Text>
            </>
          ) : (
            <>
              <Text style={styles.saint}>{candle.saint.name}</Text>
              <Text testID="vigil-left" style={styles.sub}>
                {left()}
              </Text>
            </>
          )}
          {showIntention && (
            <Text testID="vigil-intention" style={styles.intention}>
              {candle.intention}
            </Text>
          )}
          {timerDone && !consumed && controls && <Text style={styles.note}>{t("vigilTimerDone")}</Text>}
        </View>
      </Pressable>

      {choosing && (
        <View testID="vigil-timer" style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Text style={styles.sheetTitle}>{t("vigilChooseTimer")}</Text>
          <View style={styles.row}>
            {VIGIL_TIMERS.map((m) => (
              <Pressable
                key={m}
                testID={`vigil-timer-${m}`}
                accessibilityRole="radio"
                accessibilityState={{ selected: choice === m }}
                onPress={() => setChoice(m)}
                style={[styles.option, choice === m && styles.optionActive]}
              >
                <Text style={[styles.optionText, choice === m && styles.optionTextActive]}>{t(`vigilTimer${m}`)}</Text>
              </Pressable>
            ))}
          </View>
          {!keepOn && <Text style={styles.note}>{t("vigilNoWakeLock")}</Text>}
          <Pressable testID="vigil-start" accessibilityRole="button" onPress={start} style={styles.startBtn}>
            <Text style={styles.startText}>{t("vigilStart")}</Text>
          </Pressable>
          <Pressable testID="vigil-cancel" accessibilityRole="button" onPress={() => router.back()} style={styles.cancel}>
            <Text style={styles.cancelText}>{t("close")}</Text>
          </Pressable>
        </View>
      )}

      {(controls || consumed) && !choosing && (
        <View testID="vigil-controls" style={[styles.controls, { paddingTop: insets.top + spacing.sm }]} onTouchStart={keepControls}>
          <Pressable testID="vigil-close" accessibilityRole="button" accessibilityLabel={t("close")} onPress={close} style={styles.iconBtn}>
            <Icon name="x" size={22} color={colors.onAltar} />
          </Pressable>
          {!consumed && (
            <Pressable testID="vigil-intention-toggle" accessibilityRole="button" onPress={() => setShowIntention((v) => !v)} style={styles.pill}>
              <Text style={styles.pillText}>{t(showIntention ? "vigilHideIntention" : "vigilShowIntention")}</Text>
            </Pressable>
          )}
        </View>
      )}

      {controls && !choosing && !consumed && !!nightAudio && (
        <View style={[styles.player, { paddingBottom: insets.bottom + spacing.md }]} onTouchStart={keepControls}>
          <AudioPlayer
            url={nightAudio}
            title={t("nightPrayer")}
            route="/prayer?kind=night"
            analyticsContent="night"
            voice={nightPrayer?.audioVoice?.[lang]}
            tone="altar"
            testID="vigil-night-prayer"
          />
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.altarBgDeep },
  center: { alignItems: "center", justifyContent: "center" },
  candle: { width: 180, height: 315, opacity: 0.85 },
  layer: { position: "absolute", top: 0, left: 0 },
  saint: { fontFamily: fonts.display, fontSize: 22, color: c.onAltarMuted, marginTop: spacing.lg, textAlign: "center" },
  title: { fontFamily: fonts.display, fontSize: 24, color: c.gold, marginTop: spacing.lg, textAlign: "center" },
  sub: { fontFamily: fonts.body, fontSize: 16, color: c.onAltarMuted, marginTop: spacing.xs, textAlign: "center" },
  intention: {
    fontFamily: fonts.display,
    fontStyle: "italic",
    fontSize: 18,
    lineHeight: 26,
    color: c.onAltar,
    marginTop: spacing.lg,
    maxWidth: 320,
    textAlign: "center",
  },
  message: { fontFamily: fonts.body, fontSize: 16, color: c.onAltar, textAlign: "center" },
  note: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, marginTop: spacing.md, textAlign: "center" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: c.altarCard,
  },
  sheetTitle: { fontFamily: fonts.display, fontSize: 20, color: c.onAltar, textAlign: "center" },
  row: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, justifyContent: "center" },
  option: { flex: 1, paddingVertical: spacing.sm + 4, borderRadius: radius.pill, borderWidth: 1, borderColor: c.goldDeep, alignItems: "center" },
  optionActive: { backgroundColor: c.gold, borderColor: c.gold },
  optionText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.onAltar },
  optionTextActive: { color: c.onBrandSecondary },
  startBtn: { marginTop: spacing.lg, height: 52, borderRadius: radius.lg, backgroundColor: c.brandSecondary, alignItems: "center", justifyContent: "center" },
  startText: { fontFamily: fonts.bodyBold, fontSize: 17, color: c.onBrandSecondary },
  cancel: { marginTop: spacing.sm, alignItems: "center", paddingVertical: spacing.sm },
  cancelText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onAltarMuted },
  controls: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  iconBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  pill: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: c.goldDeep,
  },
  pillText: { fontFamily: fonts.bodySemibold, fontSize: 15, color: c.gold },
  player: { position: "absolute", left: spacing.md, right: spacing.md, bottom: 0 },
}));
