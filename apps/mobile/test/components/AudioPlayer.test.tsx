// SDD-07, cliente: el reproductor reproduce y pausa, activa el audio en segundo plano y, al salir de
// la pantalla, el audio sigue sonando en el mini-player ("el mini-player aparece al navegar").
import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { AudioProvider } from "@/src/ritual/audio";
import { AudioPlayer } from "@/src/ritual/AudioPlayer";
import { MiniPlayer } from "@/src/ritual/MiniPlayer";
import { I18nProvider } from "@/src/i18n";

const mockStatus = { isLoaded: true, isBuffering: false, playing: false, currentTime: 0, duration: 120 };
const mockPlayer = {
  play: jest.fn(() => {
    mockStatus.playing = true;
  }),
  pause: jest.fn(() => {
    mockStatus.playing = false;
  }),
  seekTo: jest.fn(async () => undefined),
  replace: jest.fn(),
  setActiveForLockScreen: jest.fn(),
  clearLockScreenControls: jest.fn(),
};
const mockSetAudioModeAsync = jest.fn(async () => undefined);

jest.mock("expo-audio", () => ({
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => ({ ...mockStatus }),
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...(args as [])),
}));
jest.mock("@/src/auth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
const mockPush = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ push: mockPush }) }));
const mockTrack = jest.fn();
jest.mock("@/src/analytics", () => ({ track: (...args: unknown[]) => mockTrack(...args) }));

const URL = "https://media.example.com/santo.mp3";
const App = ({ onScreen = true }: { onScreen?: boolean }) => (
  <I18nProvider>
    <AudioProvider>
      {onScreen && <AudioPlayer url={URL} title="Santo del día" route="/saint/s1" analyticsContent="saint" testID="audio" />}
      <MiniPlayer />
    </AudioProvider>
  </I18nProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockStatus, { isLoaded: true, isBuffering: false, playing: false, currentTime: 0, duration: 120 });
});

test("al entrar en la pantalla carga el audio sin reproducirlo", async () => {
  await render(<App />);
  expect(mockPlayer.replace).toHaveBeenCalledWith({ uri: URL });
  expect(mockPlayer.play).not.toHaveBeenCalled();
  expect(screen.queryByTestId("mini-player")).toBeNull();
});

test("play activa el modo de segundo plano y los controles de la pantalla de bloqueo", async () => {
  await render(<App />);
  await fireEvent.press(screen.getByTestId("audio-toggle"));
  expect(mockSetAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ shouldPlayInBackground: true, playsInSilentMode: true }));
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(
    true,
    expect.objectContaining({ title: "Santo del día" }),
    expect.objectContaining({ showSeekForward: true, showSeekBackward: true }),
  );
  expect(mockTrack).toHaveBeenCalledWith("audio_played", { content: "saint" });
});

test("mientras suena, el mismo botón pausa", async () => {
  await render(<App />);
  await fireEvent.press(screen.getByTestId("audio-toggle"));
  await fireEvent.press(screen.getByTestId("audio-toggle"));
  expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
});

test("saltos de 15 s sin salirse del audio", async () => {
  mockStatus.currentTime = 110;
  await render(<App />);
  await fireEvent.press(screen.getByTestId("audio-forward"));
  expect(mockPlayer.seekTo).toHaveBeenLastCalledWith(120);
  await fireEvent.press(screen.getByTestId("audio-back"));
  expect(mockPlayer.seekTo).toHaveBeenLastCalledWith(95);
});

test("sin cargar, los controles están desactivados", async () => {
  mockStatus.isLoaded = false;
  await render(<App />);
  await fireEvent.press(screen.getByTestId("audio-toggle"));
  expect(mockPlayer.play).not.toHaveBeenCalled();
});

test("al salir de la pantalla sigue sonando en el mini-player, que pausa, vuelve y cierra", async () => {
  const view = await render(<App />);
  await fireEvent.press(screen.getByTestId("audio-toggle"));
  // Se sale de la pantalla del santo: el reproductor único no se libera.
  await view.rerender(<App onScreen={false} />);
  expect(mockPlayer.pause).not.toHaveBeenCalled();
  expect(screen.getByTestId("mini-player")).toBeTruthy();
  expect(screen.getByText("Santo del día")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("mini-player-toggle"));
  expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
  expect(mockTrack).toHaveBeenCalledWith("mini_player_used", { action: "toggle" });

  await fireEvent.press(screen.getByTestId("mini-player-open"));
  expect(mockPush).toHaveBeenCalledWith("/saint/s1");

  await fireEvent.press(screen.getByTestId("mini-player-close"));
  expect(mockPlayer.clearLockScreenControls).toHaveBeenCalledTimes(1);
  expect(screen.queryByTestId("mini-player")).toBeNull();
});

test("otra pantalla con audio no corta el que está sonando hasta que se pulsa su play", async () => {
  const Two = ({ url, title }: { url: string; title: string }) => (
    <I18nProvider>
      <AudioProvider>
        <AudioPlayer url={url} title={title} route="/x" testID="audio" />
        <MiniPlayer />
      </AudioProvider>
    </I18nProvider>
  );
  const view = await render(<Two url={URL} title="Santo del día" />);
  await fireEvent.press(screen.getByTestId("audio-toggle"));
  mockPlayer.replace.mockClear();

  const PRAYER = "https://media.example.com/oracion.mp3";
  await view.rerender(<Two url={PRAYER} title="Oración de la mañana" />);
  expect(mockPlayer.replace).not.toHaveBeenCalled();
  expect(screen.getByText("Santo del día")).toBeTruthy();

  await fireEvent.press(screen.getByTestId("audio-toggle"));
  expect(mockPlayer.replace).toHaveBeenCalledWith({ uri: PRAYER });
  expect(screen.getByText("Oración de la mañana")).toBeTruthy();
});
