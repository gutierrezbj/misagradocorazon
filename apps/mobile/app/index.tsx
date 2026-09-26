import { View, Text, Image } from "react-native";
import { useTheme, fonts } from "@/src/theme";

export default function Index() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.altarBg, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontFamily: fonts.displayBold, fontSize: 40, color: colors.gold, textAlign: "center" }}>
        Mi Sagrado{"\n"}Corazón
      </Text>
    </View>
  );
}
