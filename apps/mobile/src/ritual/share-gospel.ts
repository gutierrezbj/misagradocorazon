// Compartir el evangelio del día (SDD-05 US-25) con la hoja nativa del sistema (WhatsApp, etc.).
// Solo el texto litúrgico del día en el idioma del fiel: sin datos personales ni intenciones.
import { Share } from "react-native";

import { SHARE_URL } from "@/src/ritual/share";

export function gospelMessage(ref: string, text: string, appLine: string) {
  return `${ref}\n\n${text.trim()}\n\n${appLine} · ${SHARE_URL}`;
}

/**
 * true si la persona llegó a compartir (en Android no se sabe: se cuenta al abrir la hoja).
 * En web (solo pruebas) Share.share no devuelve resultado y cancelar lanza AbortError.
 */
export async function shareGospel(message: string, title: string): Promise<boolean> {
  try {
    const res = (await Share.share({ message, title }, { dialogTitle: title })) as { action?: string } | undefined;
    return res?.action !== Share.dismissedAction;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") return false;
    throw e;
  }
}
