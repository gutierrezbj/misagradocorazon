// Imagen de un santo. Mientras el catálogo no tenga imágenes con licencia verificada (opción B del
// fundador, 27-nov-2026), imageUrl llega vacía y se muestra un marcador propio: la inicial del
// santo sobre el tono del altar, sin cargar nada de terceros.
import { Text, View, type ImageStyle, type StyleProp } from "react-native";
import { Image } from "expo-image";

import { fonts, makeStyles } from "@/src/theme";

export function SaintImage({ uri, name, style, blurRadius }: { uri?: string | null; name: string; style: StyleProp<ImageStyle>; blurRadius?: number }) {
  const styles = useStyles();
  if (uri) return <Image source={{ uri }} style={style} contentFit="cover" blurRadius={blurRadius} />;
  const initial =
    name
      .replace(/^(San|Santa|Santo|Virgen de|Sagrado)\s+/i, "")
      .trim()
      .charAt(0)
      .toUpperCase() || "†";
  return (
    <View style={[style as object, styles.placeholder]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Text style={styles.initial}>{initial}</Text>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  placeholder: { backgroundColor: c.altarBg, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initial: { fontFamily: fonts.displayBold, fontSize: 32, color: c.gold },
}));
