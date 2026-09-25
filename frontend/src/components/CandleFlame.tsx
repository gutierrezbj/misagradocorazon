import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Path, Rect, Ellipse, G, Defs, RadialGradient, LinearGradient, Stop } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";

export type CandleVariant = "pillar" | "basic" | "solemn" | "permanent";
type Props = { size?: number; lit?: boolean; variant?: CandleVariant; mourning?: boolean };

// Teardrop flame path pointing up, inside a `w` x `h` box.
function flamePath(w: number, h: number): string {
  const cx = w / 2;
  return `M ${cx} 0 C ${cx + w * 0.6} ${h * 0.34}, ${cx + w * 0.52} ${h * 0.99}, ${cx} ${h}
          C ${cx - w * 0.52} ${h * 0.99}, ${cx - w * 0.6} ${h * 0.34}, ${cx} 0 Z`;
}

export function CandleFlame({ size = 160, lit = true, variant = "pillar", mourning = false }: Props) {
  const flicker = useSharedValue(0);
  const sway = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!lit) return;
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.45, { duration: 380, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.85, { duration: 260, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.6, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    sway.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    glow.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [lit, flicker, sway, glow]);

  const isGlass = variant !== "pillar";

  const wrapW = size;
  const wrapH = size * 1.75;

  // Flame size (smaller for glass votives so it rises from the rim)
  const flameW = isGlass ? size * 0.24 : size * 0.3;
  const flameH = isGlass ? size * 0.5 : size * 0.62;
  const glowD = size * 1.25;

  // Vessel geometry
  const cfg = {
    basic: { w: 0.5, h: 0.62 },
    solemn: { w: 0.54, h: 0.78 },
    permanent: { w: 0.56, h: 0.92 },
  } as const;
  const vc = isGlass ? cfg[variant as "basic" | "solemn" | "permanent"] : { w: 0.58, h: 0.92 };
  const bodyW = size * vc.w;
  const bodyH = size * vc.h;
  const bodyTop = wrapH - bodyH;

  // Flame sits at rim (glass) or on wick (pillar)
  const flameTop = bodyTop - flameH + (isGlass ? size * 0.06 : size * 0.03);
  const glowTop = flameTop + flameH * 0.4 - glowD / 2;

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(sway.value, [0, 1], [-2, 2]) },
      { rotate: `${interpolate(sway.value, [0, 1], [-2.5, 2.5])}deg` },
      { scaleY: interpolate(flicker.value, [0, 1], [0.92, 1.14]) },
      { scaleX: interpolate(flicker.value, [0, 1], [0.97, 1.03]) },
    ],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flicker.value, [0, 1], [0.55, 0.9]),
    transform: [
      { translateX: interpolate(sway.value, [0, 1], [-2, 2]) },
      { scale: interpolate(glow.value, [0, 1], [0.92, 1.06]) },
    ],
  }));

  const innerFlameW = flameW * 0.5;
  const innerFlameH = flameH * 0.58;
  const innerTx = (flameW - innerFlameW) / 2;
  const innerTy = flameH - innerFlameH - flameH * 0.04;

  return (
    <View style={[styles.wrap, { width: wrapW, height: wrapH }]}>
      {/* Soft radial glow */}
      {lit && (
        <Animated.View style={[styles.abs, { top: glowTop, width: glowD, height: glowD }, glowStyle]}>
          <Svg width={glowD} height={glowD}>
            <Defs>
              <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
                <Stop offset="0%" stopColor="#FFCE70" stopOpacity={0.75} />
                <Stop offset="35%" stopColor="#E8901E" stopOpacity={0.35} />
                <Stop offset="70%" stopColor="#C5A059" stopOpacity={0.12} />
                <Stop offset="100%" stopColor="#C5A059" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Ellipse cx={glowD / 2} cy={glowD / 2} rx={glowD / 2} ry={glowD / 2} fill="url(#glow)" />
          </Svg>
        </Animated.View>
      )}

      {/* Vessel */}
      <View style={[styles.abs, { top: bodyTop, width: bodyW, height: bodyH + 4 }]}>
        {isGlass ? (
          <GlassVotive w={bodyW} h={bodyH} variant={variant as "basic" | "solemn" | "permanent"} lit={lit} mourning={mourning} />
        ) : (
          <WaxPillar w={bodyW} h={bodyH} />
        )}
      </View>

      {/* Wick (pillar only; glass wick is inside the vessel) */}
      {lit && !isGlass && <View style={[styles.wick, { top: bodyTop - size * 0.05, height: size * 0.07 }]} />}

      {/* Flame */}
      {lit && (
        <Animated.View style={[styles.abs, styles.flameOrigin, { top: flameTop, width: flameW, height: flameH }, flameStyle]}>
          <Svg width={flameW} height={flameH}>
            <Defs>
              <RadialGradient id="flame" cx="50%" cy="74%" r="62%">
                <Stop offset="0%" stopColor="#FFF3C8" />
                <Stop offset="30%" stopColor="#FFC24D" />
                <Stop offset="62%" stopColor="#F07E12" />
                <Stop offset="88%" stopColor="#C0350A" />
                <Stop offset="100%" stopColor="#7A1500" />
              </RadialGradient>
              <RadialGradient id="core" cx="50%" cy="78%" r="55%">
                <Stop offset="0%" stopColor="#FFFDF6" />
                <Stop offset="55%" stopColor="#FFE9A8" />
                <Stop offset="100%" stopColor="#FFC24D" stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="base" cx="50%" cy="90%" r="40%">
                <Stop offset="0%" stopColor="#8FB7FF" stopOpacity={0.85} />
                <Stop offset="100%" stopColor="#8FB7FF" stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Path d={flamePath(flameW, flameH)} fill="url(#flame)" />
            <Ellipse cx={flameW / 2} cy={flameH * 0.9} rx={flameW * 0.24} ry={flameH * 0.12} fill="url(#base)" />
            <G transform={`translate(${innerTx}, ${innerTy}) scale(${innerFlameW / flameW}, ${innerFlameH / flameH})`}>
              <Path d={flamePath(flameW, flameH)} fill="url(#core)" />
            </G>
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

function WaxPillar({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w} height={h + 4}>
      <Defs>
        <LinearGradient id="wax" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0%" stopColor="#D8C49A" />
          <Stop offset="22%" stopColor="#F6ECD4" />
          <Stop offset="52%" stopColor="#FFFBF0" />
          <Stop offset="80%" stopColor="#EADCBB" />
          <Stop offset="100%" stopColor="#C9B183" />
        </LinearGradient>
        <RadialGradient id="pool" cx="50%" cy="50%" r="55%">
          <Stop offset="0%" stopColor="#FFE6A8" stopOpacity={0.95} />
          <Stop offset="100%" stopColor="#C9A24E" stopOpacity={0.15} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={8} width={w} height={h - 8} rx={w * 0.07} fill="url(#wax)" />
      <Rect x={w * 0.14} y={16} width={w * 0.1} height={h - 28} rx={w * 0.05} fill="#FFFFFF" opacity={0.28} />
      <Ellipse cx={w / 2} cy={9} rx={w / 2} ry={9} fill="#E7D6AD" />
      <Ellipse cx={w / 2} cy={8} rx={w / 2 - 4} ry={6.5} fill="url(#pool)" />
    </Svg>
  );
}

function GlassVotive({
  w,
  h,
  variant,
  lit,
  mourning,
}: {
  w: number;
  h: number;
  variant: "basic" | "solemn" | "permanent";
  lit: boolean;
  mourning?: boolean;
}) {
  const rimY = 10;
  const gold = "#C5A059";
  const goldDeep = "#9A7B3C";
  const hasBands = variant === "solemn" || variant === "permanent";
  const hasPedestal = variant === "permanent";
  const pedestalH = hasPedestal ? h * 0.1 : 0;
  const glassBottom = h - pedestalH;
  const crossColor = mourning ? "#8A6A2E" : gold;

  // cross geometry (thin, flat, no relief) — only on solemn & permanent
  const crossCx = w / 2;
  const crossCy = rimY + (glassBottom - rimY) * 0.44;
  const crossVH = (glassBottom - rimY) * 0.26;
  const crossHW = crossVH * 0.5;
  const barT = Math.max(1.6, w * 0.018);

  return (
    <Svg width={w} height={h + 4}>
      <Defs>
        {mourning ? (
          <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#B58A44" />
            <Stop offset="18%" stopColor="#E7CE94" />
            <Stop offset="44%" stopColor="#FBEFD2" />
            <Stop offset="54%" stopColor="#FFFAEE" />
            <Stop offset="66%" stopColor="#F1E2B6" />
            <Stop offset="86%" stopColor="#D9BE82" />
            <Stop offset="100%" stopColor="#B58E44" />
          </LinearGradient>
        ) : (
          <LinearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#4A0000" />
            <Stop offset="18%" stopColor="#8B0000" />
            <Stop offset="42%" stopColor="#D32F2F" />
            <Stop offset="52%" stopColor="#F0524B" />
            <Stop offset="62%" stopColor="#C62828" />
            <Stop offset="84%" stopColor="#7A0000" />
            <Stop offset="100%" stopColor="#3F0000" />
          </LinearGradient>
        )}
        <RadialGradient id="inner" cx="50%" cy="22%" r="60%">
          <Stop offset="0%" stopColor="#FFE39A" stopOpacity={lit ? 0.95 : 0.15} />
          <Stop offset="45%" stopColor="#FF8A3D" stopOpacity={lit ? 0.5 : 0.1} />
          <Stop offset="100%" stopColor={mourning ? "#B58E44" : "#8B0000"} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="waxpool" cx="50%" cy="50%" r="60%">
          <Stop offset="0%" stopColor="#FFEFC0" stopOpacity={lit ? 1 : 0.4} />
          <Stop offset="100%" stopColor="#E8A24E" stopOpacity={0.2} />
        </RadialGradient>
      </Defs>

      {hasPedestal && (
        <>
          <Rect x={w * 0.12} y={glassBottom} width={w * 0.76} height={pedestalH} rx={4} fill={gold} />
          <Rect x={w * 0.12} y={glassBottom} width={w * 0.76} height={pedestalH * 0.4} fill="#E8D9B9" opacity={0.5} />
        </>
      )}

      <Rect x={0} y={rimY} width={w} height={glassBottom - rimY} rx={w * 0.12} fill="url(#glass)" />
      <Rect x={2} y={rimY + 2} width={w - 4} height={glassBottom - rimY - 4} rx={w * 0.11} fill="url(#inner)" />
      <Rect x={w * 0.15} y={rimY + 6} width={w * 0.08} height={Math.max(0, glassBottom - rimY - 20)} rx={w * 0.04} fill="#FFFFFF" opacity={0.22} />
      <Rect x={w * 0.74} y={rimY + 10} width={w * 0.05} height={Math.max(0, glassBottom - rimY - 34)} rx={w * 0.03} fill="#FFFFFF" opacity={0.1} />

      {/* thin flat gold cross (solemn & permanent) */}
      {hasBands && (
        <>
          <Rect x={crossCx - barT / 2} y={crossCy - crossVH / 2} width={barT} height={crossVH} rx={barT / 2} fill={crossColor} opacity={0.9} />
          <Rect x={crossCx - crossHW / 2} y={crossCy - crossVH * 0.16} width={crossHW} height={barT} rx={barT / 2} fill={crossColor} opacity={0.9} />
        </>
      )}

      {hasBands && (
        <>
          <Rect x={0} y={glassBottom - 16} width={w} height={7} fill={gold} />
          <Rect x={0} y={glassBottom - 9} width={w} height={2} fill={goldDeep} />
        </>
      )}
      {variant === "permanent" && <Rect x={0} y={rimY + 6} width={w} height={5} fill={gold} opacity={0.9} />}

      <Ellipse cx={w / 2} cy={rimY} rx={w / 2} ry={rimY} fill={mourning ? "#8A6A2E" : "#4A0000"} />
      <Ellipse cx={w / 2} cy={rimY} rx={w / 2} ry={rimY} fill="none" stroke={hasBands ? gold : mourning ? goldDeep : "#B71C1C"} strokeWidth={hasBands ? 2.5 : 1.5} />
      <Ellipse cx={w / 2} cy={rimY} rx={w / 2 - 6} ry={rimY - 4} fill="url(#waxpool)" />
      <Rect x={w / 2 - 1.2} y={rimY - 8} width={2.4} height={9} rx={1} fill="#3B2415" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "flex-start" },
  abs: { position: "absolute", alignSelf: "center" },
  flameOrigin: { transformOrigin: "center bottom" },
  wick: { position: "absolute", width: 3, borderRadius: 2, alignSelf: "center", backgroundColor: "#3B2415" },
});
