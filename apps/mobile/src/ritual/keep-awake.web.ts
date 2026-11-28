// Mantiene la pantalla encendida mientras `active` (US-31). En el navegador, la API Screen Wake Lock.
// El navegador la suelta al cambiar de pestaña: se vuelve a pedir al volver a la página.
import { useEffect, useState } from "react";

type WakeLockSentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } };

const wakeLockApi = () => (typeof navigator === "undefined" ? undefined : (navigator as WakeLockNavigator).wakeLock);

/** Devuelve si el navegador puede mantener la pantalla encendida. */
export function useKeepScreenOn(active: boolean): boolean {
  const [supported] = useState(() => !!wakeLockApi());

  useEffect(() => {
    const api = wakeLockApi();
    if (!active || !api) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = () => {
      api
        .request("screen")
        .then((s) => {
          if (cancelled) void s.release().catch(() => undefined);
          else sentinel = s;
        })
        .catch(() => undefined);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);

  return supported;
}
