// Tras encender la vela: compartirla por WhatsApp y redes (SDD-05 US-22). La intención no se
// incluye salvo que la persona lo pida: quien reciba la imagen podría leerla (GDPR art. 9).
import { useRef, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ShareCard } from "@/src/components/ShareCard";
import { AppButton, useToast } from "@/src/components/ui";
import type { CandleVariant } from "@/src/components/CandleFlame";
import { useI18n } from "@/src/i18n";
import { shareCard } from "@/src/share";
import { fonts, makeStyles, radius, spacing, useTheme } from "@/src/theme";
import { track } from "@/src/analytics";

type Props = {
  saintName: string;
  intention: string;
  variant: Exclude<CandleVariant, "pillar">;
  mourning: boolean;
  onClose: () => void;
};

export function ShareCandlePanel({ saintName, intention, variant, mourning, onClose }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const toast = useToast();
  const card = useRef<View>(null);
  const [withIntention, setWithIntention] = useState(false);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    setBusy(true);
    try {
      const ok = await shareCard(card, t("shareDialogTitle"));
      if (!ok) toast(t("shareUnavailable"), "error");
      else track("candle_shared", { withIntention });
    } catch {
      toast(t("genericError"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ alignItems: "center", padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
      <Text style={styles.title}>{t("shareTitle")}</Text>
      <Text style={styles.sub}>{t("shareSub")}</Text>
      <View style={styles.cardShadow}>
        <ShareCard ref={card} saintName={saintName} intention={withIntention ? intention : undefined} variant={variant} mourning={mourning} />
      </View>

      <View style={styles.toggleRow}>
        <View style={{ flex: 1, paddingRight: spacing.sm }}>
          <Text style={styles.toggleLabel}>{t("shareIncludeIntention")}</Text>
          <Text style={styles.toggleHint}>{t("shareIncludeIntentionHint")}</Text>
        </View>
        <Switch
          testID="share-include-intention"
          value={withIntention}
          onValueChange={setWithIntention}
          trackColor={{ true: colors.brandSecondary, false: "rgba(253,251,247,0.2)" }}
          thumbColor={colors.surface}
          {...({ activeThumbColor: colors.surface } as object)}
          accessibilityLabel={t("shareIncludeIntention")}
        />
      </View>

      <View style={{ alignSelf: "stretch", gap: spacing.sm }}>
        <AppButton testID="share-candle-now" label={t("shareNow")} icon="share-2" variant="gold" onPress={share} loading={busy} />
        <Pressable testID="share-close" onPress={onClose} style={styles.close} accessibilityRole="button">
          <Text style={styles.closeText}>{t("continue")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const useStyles = makeStyles((c) => ({
  title: { fontFamily: fonts.displayBold, fontSize: 26, color: c.gold, textAlign: "center" },
  sub: { fontFamily: fonts.body, fontSize: 16, color: c.onAltarMuted, textAlign: "center", marginTop: spacing.xs, marginBottom: spacing.lg },
  cardShadow: { borderRadius: 18, borderWidth: 1, borderColor: "rgba(197,160,89,0.35)" },
  toggleRow: { flexDirection: "row", alignItems: "center", alignSelf: "stretch", marginVertical: spacing.lg, padding: spacing.md, borderRadius: radius.lg, backgroundColor: "rgba(253,251,247,0.06)" },
  toggleLabel: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onAltar },
  toggleHint: { fontFamily: fonts.body, fontSize: 14, color: c.onAltarMuted, marginTop: 2 },
  close: { alignItems: "center", paddingVertical: spacing.sm },
  closeText: { fontFamily: fonts.bodySemibold, fontSize: 16, color: c.onAltarMuted },
}));
