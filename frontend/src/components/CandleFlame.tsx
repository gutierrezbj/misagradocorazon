import React, { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from "react-native-reanimated";

import { useTheme } from "@/src/theme";

type Props = { size?: number; lit?: boolean };

export function CandleFlame({ size = 160, lit = true }: Props) {
  const { colors } = useTheme();
  const flicker = useSharedValue(0);
  const sway = useSharedValue(0);
  const glow = useSharedValue(0);

  useEffect(() => {
    if (!lit) return;
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 480, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.35, { duration: 520, easing: Easing.inOut(Easing.quad) }),
        withTiming(0.8, { duration: 300, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      true,
    );
    sway.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }), -1, true);
    glow.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [lit, flicker, sway, glow]);

  const flameW = size * 0.34;
  const flameH = size * 0.6;

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(sway.value, [0, 1], [-2.5, 2.5]) },
      { rotate: `${interpolate(sway.value, [0, 1], [-3, 3])}deg` },
      { scaleY: interpolate(flicker.value, [0, 1], [0.9, 1.12]) },
      { scaleX: interpolate(flicker.value, [0, 1], [0.96, 1.04]) },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0.16, 0.32]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.85, 1.05]) }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flicker.value, [0, 1], [0.7, 1]),
    transform: [{ scaleY: interpolate(flicker.value, [0, 1], [0.85, 1.05]) }],
  }));

  return (
    <View style={[styles.wrap, { width: size, height: size * 1.5 }]}>
      {lit && (
        <Animated.View
          style={[
            styles.glow,
            glowStyle,
            {
              width: size * 0.85,
              height: size * 0.85,
              borderRadius: size,
              backgroundColor: colors.flameMid,
              top: -size * 0.05,
            },
          ]}
        />
      )}

      {/* Flame */}
      {lit && (
        <Animated.View style={[styles.flameContainer, flameStyle, { top: size * 0.02 }]}>
          <LinearGradient
            colors={[colors.flameCore, colors.flameMid, colors.flameOuter]}
            style={{ width: flameW, height: flameH, borderRadius: flameW, borderTopLeftRadius: flameW, borderTopRightRadius: flameW }}
          />
          <Animated.View
            style={[
              styles.innerFlame,
              innerStyle,
              {
                width: flameW * 0.5,
                height: flameH * 0.6,
                borderRadius: flameW,
                backgroundColor: colors.flameCore,
                bottom: flameH * 0.12,
              },
            ]}
          />
        </Animated.View>
      )}

      {/* Wick */}
      <View style={[styles.wick, { top: size * 0.6, height: size * 0.06, backgroundColor: "#2A1A12" }]} />

      {/* Candle body */}
      <LinearGradient
        colors={[colors.goldSoft, "#F3E6C8", colors.goldDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[
          styles.body,
          {
            width: size * 0.6,
            height: size * 0.8,
            top: size * 0.66,
            borderTopLeftRadius: size * 0.08,
            borderTopRightRadius: size * 0.08,
          },
        ]}
      />
      <View
        style={[
          styles.rim,
          {
            width: size * 0.6,
            top: size * 0.66,
            borderColor: colors.goldDeep,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "flex-start" },
  glow: { position: "absolute", alignSelf: "center" },
  flameContainer: { position: "absolute", alignItems: "center", justifyContent: "flex-end" },
  innerFlame: { position: "absolute", alignSelf: "center" },
  wick: { position: "absolute", width: 3, borderRadius: 2, alignSelf: "center" },
  body: { position: "absolute", alignSelf: "center" },
  rim: { position: "absolute", alignSelf: "center", height: 6, borderTopWidth: 2, borderRadius: 3 },
});
