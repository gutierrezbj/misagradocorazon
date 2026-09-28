// Pilar 2: grabación posterior para quien no pudo asistir, y sin cuenta atrás a cero cuando no hay
// próxima misa programada.
import { beforeEach, expect, jest, test } from "@jest/globals";
import { Linking } from "react-native";
import { fireEvent, screen } from "@testing-library/react-native";

import Misa from "@/app/(tabs)/misa";
import { renderScreen } from "./render";

type ApiCall = (path: string) => Promise<unknown>;
const mockApi = jest.fn<ApiCall>();

jest.mock("@/src/api", () => ({
  ApiError: (jest.requireActual("@/src/api") as { ApiError: unknown }).ApiError,
  api: (path: string) => mockApi(path),
}));
// Como el hook real, devuelve siempre el mismo array mientras no llegan mensajes.
const mockChat = { messages: [], send: jest.fn() };
jest.mock("@/src/misa/chat", () => ({ useMassChat: () => mockChat }));
const mockTrack = jest.fn();
jest.mock("@/src/analytics", () => ({ track: (...args: unknown[]) => mockTrack(...args) }));
jest.mock("expo-router", () => ({ useFocusEffect: () => undefined }));
jest.mock("@/src/misa/YouTubeEmbed", () => ({
  YouTubeEmbed: ({ videoId }: { videoId: string }) => {
    const { Text: RNText } = jest.requireActual<typeof import("react-native")>("react-native");
    return <RNText testID="youtube">{videoId}</RNText>;
  },
}));

const HOUR = 3_600_000;
const mass = (status: "scheduled" | "live" | "ended", offsetH: number, extra: Record<string, unknown> = {}) => ({
  id: `m-${status}`,
  title: { es: "Misa dominical", en: "Sunday Mass" },
  youtubeUrl: "https://www.youtube.com/watch?v=envivo00001",
  scheduledAt: new Date(Date.now() + offsetH * HOUR).toISOString(),
  durationMin: 120,
  isSpecial: false,
  recordingUrl: null,
  status,
  ...extra,
});
const recording = mass("ended", -24 * 6, { id: "m-rec", recordingUrl: "https://www.youtube.com/watch?v=grabacion01" });

function serve(next: unknown, rec: unknown) {
  mockApi.mockImplementation(async (path) => {
    if (path === "/masses/next") return next;
    if (path === "/masses/latest-recording") return rec;
    return { total: 0, last7d: 0, flames: [] };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

test("sin próxima misa: aviso en vez de una cuenta atrás a cero, y la grabación se ve dentro de la app", async () => {
  serve(null, recording);
  await renderScreen(<Misa />);
  expect(await screen.findByTestId("no-mass")).toBeTruthy();
  expect(screen.queryByText("Próxima misa")).toBeNull();

  const card = await screen.findByTestId("mass-recording");
  expect(screen.getByText("Grabación de la última misa")).toBeTruthy();
  await fireEvent.press(card);
  expect(screen.getByTestId("youtube").props.children).toBe("grabacion01");
  // KPI de producto: cuántos ven la grabación (sin datos personales).
  expect(mockTrack).toHaveBeenCalledWith("recording_opened", { inApp: true });
  // Se puede cerrar y volver a la portada.
  await fireEvent.press(card);
  expect(screen.queryByTestId("youtube")).toBeNull();
});

test("con misa programada: cuenta atrás y, debajo, la grabación de la anterior", async () => {
  serve(mass("scheduled", 48), recording);
  await renderScreen(<Misa />);
  expect(await screen.findByText("Próxima misa")).toBeTruthy();
  expect(await screen.findByTestId("mass-recording")).toBeTruthy();
});

test("en directo no se ofrece la grabación", async () => {
  serve(mass("live", -0.5), recording);
  await renderScreen(<Misa />);
  expect(await screen.findByTestId("youtube")).toBeTruthy();
  expect(screen.queryByTestId("mass-recording")).toBeNull();
});

test("una grabación fuera de YouTube se abre fuera de la app", async () => {
  const open = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
  serve(mass("scheduled", 48), { ...recording, recordingUrl: "https://vimeo.com/123456" });
  await renderScreen(<Misa />);
  await fireEvent.press(await screen.findByTestId("mass-recording"));
  expect(open).toHaveBeenCalledWith("https://vimeo.com/123456");
  expect(mockTrack).toHaveBeenCalledWith("recording_opened", { inApp: false });
  expect(screen.queryByTestId("youtube")).toBeNull();
});
