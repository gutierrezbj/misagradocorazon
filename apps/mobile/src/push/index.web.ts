// En web no hay notificaciones push (el producto son las apps de las tiendas).
export type PushPermission = "granted" | "denied" | "undetermined" | "unavailable";
export const pushPermission = async (): Promise<PushPermission> => "unavailable";
export const registerForPush = async (_: { ask: boolean }): Promise<PushPermission> => "unavailable";
export const unregisterPush = async () => undefined;
export const openSystemSettings = async () => undefined;
export const usePushNavigation = (_enabled: boolean) => undefined;
