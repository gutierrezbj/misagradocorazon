// Notificaciones push (expo-notifications + Expo Push Service). El servidor decide cuándo enviar
// según la hora local y las preferencias del fiel; aquí solo se pide permiso, se registra el
// dispositivo y se abre la pantalla que indica cada notificación.
import { useEffect, useRef } from "react";
import { Linking, Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useRouter, type Href } from "expo-router";

import { api } from "@/src/api";
import { storage } from "@/src/utils/storage";

const TOKEN_KEY = "msc.push_token";
// Mismo id que usa la API al enviar (apps/api/src/modules/push/service.ts).
const ANDROID_CHANNEL = "default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushPermission = "granted" | "denied" | "undetermined" | "unavailable";

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

export async function pushPermission(): Promise<PushPermission> {
  // Sin dispositivo físico o sin proyecto de EAS no hay token de Expo.
  if (!Device.isDevice || !projectId()) return "unavailable";
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted" ? "granted" : status === "denied" ? "denied" : "undetermined";
}

/**
 * Registra el dispositivo en la API. Con `ask`, pide permiso si aún no se ha pedido.
 * Devuelve el estado del permiso tras el intento.
 */
export async function registerForPush({ ask }: { ask: boolean }): Promise<PushPermission> {
  let permission = await pushPermission();
  if (permission === "unavailable") return permission;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
      name: "Mi Sagrado Corazón",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  if (permission === "undetermined" && ask) {
    const { status } = await Notifications.requestPermissionsAsync();
    permission = status === "granted" ? "granted" : "denied";
  }
  if (permission !== "granted") return permission;

  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  await api("/me/push-tokens", { method: "PUT", body: { token, platform: Platform.OS === "ios" ? "ios" : "android" } });
  await storage.secureSet(TOKEN_KEY, token);
  return permission;
}

/** Al cerrar sesión, antes de invalidar la sesión: el dispositivo deja de recibir avisos de esta cuenta. */
export async function unregisterPush() {
  const token = await storage.secureGet<string>(TOKEN_KEY, "");
  if (!token) return;
  await api("/me/push-tokens", { method: "DELETE", body: { token } }).catch(() => undefined);
  await storage.secureRemove(TOKEN_KEY);
}

/** Si el permiso se denegó, solo se puede activar desde los ajustes del sistema. */
export const openSystemSettings = () => Linking.openSettings();

/** Al tocar una notificación (también con la app cerrada), abre la pantalla que trae en data.url. */
export function usePushNavigation(enabled: boolean) {
  const response = Notifications.useLastNotificationResponse();
  const router = useRouter();
  const handled = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !response) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const url = response.notification.request.content.data?.url;
    if (typeof url === "string" && url.startsWith("/")) router.push(url as Href);
  }, [enabled, response, router]);
}
