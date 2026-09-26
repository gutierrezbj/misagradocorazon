// SDD-07, cliente: el reproductor reproduce y pausa, y activa el audio en segundo plano.
import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { AudioPlayer } from "@/src/components/AudioPlayer";
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

const renderPlayer = () =>
  render(
    <I18nProvider>
      <AudioPlayer url="https://media.example.com/santo.mp3" title="Santo del día" testID="audio" />
    </I18nProvider>,
  );

beforeEach(() => {
  jest.clearAllMocks();
  Object.assign(mockStatus, { isLoaded: true, isBuffering: false, playing: false, currentTime: 0, duration: 120 });
});

test("play activa el modo de segundo plano y los controles de la pantalla de bloqueo", async () => {
  await renderPlayer();
  await fireEvent.press(screen.getByTestId("audio-toggle"));
  expect(mockSetAudioModeAsync).toHaveBeenCalledWith(expect.objectContaining({ shouldPlayInBackground: true, playsInSilentMode: true }));
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  expect(mockPlayer.setActiveForLockScreen).toHaveBeenCalledWith(
    true,
    expect.objectContaining({ title: "Santo del día" }),
    expect.objectContaining({ showSeekForward: true, showSeekBackward: true }),
  );
});

test("mientras suena, el mismo botón pausa", async () => {
  mockStatus.playing = true;
  await renderPlayer();
  expect(screen.getByLabelText("Pausar")).toBeTruthy();
  await fireEvent.press(screen.getByTestId("audio-toggle"));
  expect(mockPlayer.pause).toHaveBeenCalledTimes(1);
  expect(mockPlayer.play).not.toHaveBeenCalled();
});

test("saltos de 15 s sin salirse del audio", async () => {
  mockStatus.currentTime = 110;
  await renderPlayer();
  await fireEvent.press(screen.getByTestId("audio-forward"));
  expect(mockPlayer.seekTo).toHaveBeenLastCalledWith(120);
  await fireEvent.press(screen.getByTestId("audio-back"));
  expect(mockPlayer.seekTo).toHaveBeenLastCalledWith(95);
});

test("sin cargar, los controles están desactivados", async () => {
  mockStatus.isLoaded = false;
  await renderPlayer();
  await fireEvent.press(screen.getByTestId("audio-toggle"));
  expect(mockPlayer.play).not.toHaveBeenCalled();
});
