// Mantiene la pantalla encendida mientras `active` (US-31). En el teléfono, expo-keep-awake.
import { useEffect } from "react";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

const TAG = "msc-vigil";

/** Devuelve si el dispositivo puede mantener la pantalla encendida. */
export function useKeepScreenOn(active: boolean): boolean {
  useEffect(() => {
    if (!active) return;
    activateKeepAwakeAsync(TAG).catch(() => undefined);
    return () => {
      void deactivateKeepAwake(TAG);
    };
  }, [active]);
  return true;
}
