// Un solo reproductor de audio para toda la app (SDD-05 US-06; SDD-07: "el mini-player aparece al
// navegar"). El audio sigue sonando al salir de su pantalla, con la app en segundo plano o con el
// teléfono bloqueado, y el mini-player de las pestañas permite pausarlo, cerrarlo o volver a él.
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";

import { track as trackEvent } from "@/src/analytics";
import { AudioCtx, type AudioCtxValue, type AudioTrack } from "@/src/ritual/audio-state";
import { useAuth } from "@/src/auth";

export { MINI_PLAYER_HEIGHT, useAudio, useMiniPlayerInset, type AudioTrack } from "@/src/ritual/audio-state";

// Una sola vez por sesión. "doNotMix" es obligatorio para los controles de la pantalla de bloqueo.
let audioModeReady: Promise<void> | null = null;
function ensureAudioMode() {
  audioModeReady ??= setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "doNotMix",
  }).catch(() => {
    audioModeReady = null;
  });
  return audioModeReady;
}

export function AudioProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const [loaded, setLoaded] = useState<AudioTrack | null>(null);
  const [active, setActive] = useState(false);
  const loadedUrl = useRef<string | null>(null);
  const lockScreenUrl = useRef<string | null>(null);
  const trackedUrl = useRef<string | null>(null);
  const { user } = useAuth();

  const load = useCallback(
    (t: AudioTrack) => {
      if (loadedUrl.current !== t.url) {
        player.replace({ uri: t.url });
        loadedUrl.current = t.url;
      }
      setLoaded(t);
    },
    [player],
  );

  const prepare = useCallback(
    (t: AudioTrack) => {
      if (!active) load(t);
    },
    [active, load],
  );

  const play = useCallback(
    async (t: AudioTrack) => {
      await ensureAudioMode();
      const same = loadedUrl.current === t.url;
      load(t);
      setActive(true);
      // Terminado: vuelve a empezar.
      if (same && status.duration > 0 && status.currentTime >= status.duration - 0.5) await player.seekTo(0);
      player.play();
      if (t.content && trackedUrl.current !== t.url) {
        trackedUrl.current = t.url;
        trackEvent("audio_played", { content: t.content });
      }
      if (lockScreenUrl.current !== t.url) {
        player.setActiveForLockScreen(
          true,
          { title: t.title, artist: "Mi Sagrado Corazón", ...(t.artworkUrl && { artworkUrl: t.artworkUrl }) },
          { showSeekForward: true, showSeekBackward: true },
        );
        lockScreenUrl.current = t.url;
      }
    },
    [load, player, status.currentTime, status.duration],
  );

  const stop = useCallback(() => {
    player.pause();
    if (lockScreenUrl.current) player.clearLockScreenControls();
    lockScreenUrl.current = null;
    trackedUrl.current = null;
  }, [player]);

  const close = useCallback(() => {
    stop();
    setActive(false);
  }, [stop]);

  // Al cerrar sesión o borrar la cuenta no sigue sonando nada: el mini-player se oculta en el mismo
  // render (estado) y el reproductor se para en el efecto (sistema externo).
  const signedIn = !!user;
  const [wasSignedIn, setWasSignedIn] = useState(signedIn);
  if (signedIn !== wasSignedIn) {
    setWasSignedIn(signedIn);
    if (!signedIn) setActive(false);
  }
  useEffect(() => {
    if (!signedIn) stop();
  }, [signedIn, stop]);

  const value = useMemo<AudioCtxValue>(
    () => ({
      loaded,
      active,
      status,
      prepare,
      play,
      pause: () => player.pause(),
      seekTo: (s) => void player.seekTo(s),
      reload: () => {
        if (loaded) player.replace({ uri: loaded.url });
      },
      close,
    }),
    [loaded, active, status, prepare, play, player, close],
  );
  return <AudioCtx.Provider value={value}>{children}</AudioCtx.Provider>;
}
