// Tarjeta vertical para compartir la vela (SDD-05 US-22): vela, santo e intención opcional.
// Cumplimiento Apple 3.2.2.iv: forma parte del flujo de compra, así que no menciona causas,
// donativos ni el 20%. Solo invita a rezar juntos.
import { forwardRef } from "react";
import { Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { CandleFlame, type CandleVariant } from "@/src/components/CandleFlame";
import { useI18n } from "@/src/i18n";
import { SHARE_URL } from "@/src/share";
import { fonts } from "@/src/theme";

type Props = { saintName: string; intention?: string; variant: Exclude<CandleVariant, "pillar">; mourning: boolean };

// Tamaño lógico 9:16; se captura a 1080×1920.
export const SHARE_CARD_W = 270;
export const SHARE_CARD_H = 480;

export const ShareCard = forwardRef<View, Props>(function ShareCard({ saintName, intention, variant, mourning }, ref) {
  const { t } = useI18n();
  return (
    // collapsable={false}: Android necesita la vista real para poder capturarla.
    <View ref={ref} collapsable={false} style={{ width: SHARE_CARD_W, height: SHARE_CARD_H, borderRadius: 18, overflow: "hidden" }} testID="share-card">
      <LinearGradient colors={["#2A1512", "#1C0F0E", "#120908"]} style={{ flex: 1, alignItems: "center", paddingHorizontal: 22, paddingTop: 26, paddingBottom: 22 }}>
        <Text style={{ fontFamily: fonts.displaySemibold, fontSize: 15, color: "#C5A059", letterSpacing: 0.5 }}>Mi Sagrado Corazón</Text>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <CandleFlame size={110} lit variant={variant} mourning={mourning} />
          <Text style={{ fontFamily: fonts.body, fontSize: 14, color: "#B9A895", marginTop: 14, textAlign: "center" }}>{t("shareLitFor")}</Text>
          <Text style={{ fontFamily: fonts.displayBold, fontSize: 26, lineHeight: 32, color: "#E8D9B9", textAlign: "center", marginTop: 4 }}>{saintName}</Text>
          {!!intention && (
            <Text numberOfLines={4} style={{ fontFamily: fonts.display, fontStyle: "italic", fontSize: 16, lineHeight: 23, color: "#FDFBF7", textAlign: "center", marginTop: 12 }}>
              “{intention}”
            </Text>
          )}
        </View>
        <Text style={{ fontFamily: fonts.bodySemibold, fontSize: 15, color: "#FDFBF7", textAlign: "center" }}>{t("sharePrayWithMe")}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 14, color: "#C5A059", marginTop: 4 }}>{SHARE_URL}</Text>
      </LinearGradient>
    </View>
  );
});
