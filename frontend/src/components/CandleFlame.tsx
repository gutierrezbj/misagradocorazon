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

type Props = { size?: number; lit?: boolean };

// Teardrop flame path pointing up, inside a `w` x `h` box.
function flamePath(w: number, h: number): string {
  const cx = w / 2;
  return `M ${cx} 0 C ${cx + w * 0.6} ${h * 0.34}, ${cx + w * 0.52} ${h * 0.99}, ${cx} ${h}
          C ${cx - w * 0.52} ${h * 0.99}, ${cx - w * 0.6} ${h * 0.34}, ${cx} 0 Z`;
}

export function CandleFlame({ size = 160, lit = true }: Props) {
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

  // Geometry
  const flameW = size * 0.3;
  const flameH = size * 0.62;
  const bodyW = size * 0.58;
  const bodyH = size * 0.92;
  const glowD = size * 1.25;

  const wrapW = size;
  const wrapH = size * 1.75;
  const bodyTop = wrapH - bodyH;
  const flameTop = bodyTop - flameH + size * 0.03;
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

      {/* Candle body */}
      <View style={[styles.abs, { top: bodyTop, width: bodyW, height: bodyH + 4 }]}>
        <Svg width={bodyW} height={bodyH + 4}>
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
          {/* body */}
          <Rect x={0} y={8} width={bodyW} height={bodyH - 8} rx={bodyW * 0.07} fill="url(#wax)" />
          {/* subtle left highlight */}
          <Rect x={bodyW * 0.14} y={16} width={bodyW * 0.1} height={bodyH - 28} rx={bodyW * 0.05} fill="#FFFFFF" opacity={0.28} />
          {/* top wax rim */}
          <Ellipse cx={bodyW / 2} cy={9} rx={bodyW / 2} ry={9} fill="#E7D6AD" />
          {/* melted pool */}
          <Ellipse cx={bodyW / 2} cy={8} rx={bodyW / 2 - 4} ry={6.5} fill="url(#pool)" />
        </Svg>
      </View>

      {/* Wick */}
      {lit && <View style={[styles.wick, { top: bodyTop - size * 0.05, height: size * 0.07 }]} />}

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
            {/* blue base */}
            <Ellipse cx={flameW / 2} cy={flameH * 0.9} rx={flameW * 0.24} ry={flameH * 0.12} fill="url(#base)" />
            {/* bright core */}
            <G transform={`translate(${innerTx}, ${innerTy}) scale(${innerFlameW / flameW}, ${innerFlameH / flameH})`}>
              <Path d={flamePath(flameW, flameH)} fill="url(#core)" />
            </G>
          </Svg>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "flex-start" },
  abs: { position: "absolute", alignSelf: "center" },
  flameOrigin: { transformOrigin: "center bottom" },
  wick: { position: "absolute", width: 3, borderRadius: 2, alignSelf: "center", backgroundColor: "#3B2415" },
});
