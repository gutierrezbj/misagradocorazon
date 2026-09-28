// Misa en vivo embebida en iOS/Android (el usuario no sale de la app). La versión web está en YouTubeEmbed.web.tsx.
import type { StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";

export function YouTubeEmbed({ videoId, style }: { videoId: string; style?: StyleProp<ViewStyle> }) {
  return <WebView style={style} source={{ uri: `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1` }} allowsFullscreenVideo />;
}
