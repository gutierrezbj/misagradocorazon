// En web no existe WebView: la misa se embebe con un iframe. Metro elige este fichero en la plataforma web.
import { createElement } from "react";
import type { StyleProp, ViewStyle } from "react-native";

export function YouTubeEmbed({ videoId }: { videoId: string; style?: StyleProp<ViewStyle> }) {
  return createElement("iframe", {
    src: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`,
    style: { border: 0, width: "100%", aspectRatio: "16 / 10", display: "block" },
    allow: "autoplay; encrypted-media; picture-in-picture",
    allowFullScreen: true,
    title: "YouTube",
  });
}
