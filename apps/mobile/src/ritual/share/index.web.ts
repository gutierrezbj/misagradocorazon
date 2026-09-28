// Web (solo pruebas): se genera la misma imagen y se comparte con la API del navegador si admite
// ficheros; si no, se descarga.
import type { RefObject } from "react";
import type { View } from "react-native";
import { captureRef } from "react-native-view-shot";

export const SHARE_URL = "misagradocorazon.com";

export async function shareCard(ref: RefObject<View | null>, dialogTitle: string): Promise<boolean> {
  const dataUri = await captureRef(ref, { format: "png", result: "data-uri", width: 1080, height: 1920 });
  const blob = await (await fetch(dataUri)).blob();
  const file = new File([blob], "mi-vela.png", { type: "image/png" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title: dialogTitle });
    return true;
  }
  const a = document.createElement("a");
  a.href = dataUri;
  a.download = "mi-vela.png";
  a.click();
  return true;
}
