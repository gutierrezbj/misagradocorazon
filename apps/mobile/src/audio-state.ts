// Estado del reproductor único (src/audio.tsx), sin dependencias nativas: lo usan las pantallas de
// pestañas para dejar sitio al mini-player.
import { createContext, useContext } from "react";
import type { AudioStatus } from "expo-audio";

import type { AnalyticsEvents } from "@/src/analytics";

export type AudioTrack = {
  url: string;
  /** Título en el mini-player y en la pantalla de bloqueo. */
  title: string;
  artworkUrl?: string;
  /** Pantalla a la que vuelve el mini-player (p. ej. "/prayer?kind=morning"). */
  route: string;
  /** Qué se escucha, para la analítica (solo con consentimiento). */
  content?: AnalyticsEvents["audio_played"]["content"];
};

export type AudioCtxValue = {
  /** Pista cargada en el reproductor (suene o no). */
  loaded: AudioTrack | null;
  /** true desde que se pulsa reproducir hasta que se cierra: es lo que muestra el mini-player. */
  active: boolean;
  status: AudioStatus;
  /** Carga una pista sin reproducirla (para mostrar su duración), salvo que otra esté activa. */
  prepare: (t: AudioTrack) => void;
  play: (t: AudioTrack) => Promise<void>;
  pause: () => void;
  seekTo: (seconds: number) => void;
  reload: () => void;
  /** Para el audio, quita los controles de la pantalla de bloqueo y oculta el mini-player. */
  close: () => void;
};

export const AudioCtx = createContext<AudioCtxValue | null>(null);

// Alto del mini-player sobre la barra de pestañas (en iOS 26 lo coloca el sistema: 0). Las pantallas
// de pestañas lo suman a su margen inferior para que el mini-player no tape el final.
export const MINI_PLAYER_HEIGHT = 64;
export function useMiniPlayerInset(nativeTabs: boolean) {
  const active = useContext(AudioCtx)?.active ?? false;
  return active && !nativeTabs ? MINI_PLAYER_HEIGHT + 8 : 0;
}

export function useAudio() {
  const ctx = useContext(AudioCtx);
  if (!ctx) throw new Error("useAudio fuera de AudioProvider");
  return ctx;
}
