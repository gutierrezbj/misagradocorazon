// Compartir la vela como imagen (SDD-05 US-22): se captura la tarjeta y se abre el menú nativo
// de compartir (WhatsApp, estados, Instagram…). El enlace va impreso en la propia imagen.
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";

export const SHARE_URL = "misagradocorazon.com";

/** false si el dispositivo no permite compartir. */
export async function shareCard(ref: RefObject<View | null>, dialogTitle: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  // 1080×1920: formato vertical de estados e historias.
  const uri = await captureRef(ref, { format: "png", quality: 1, result: "tmpfile", width: 1080, height: 1920 });
  await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle });
  return true;
}
