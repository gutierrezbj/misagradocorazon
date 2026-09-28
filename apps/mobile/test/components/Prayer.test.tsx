// US-10: la oración cambia según el tiempo litúrgico. La pantalla muestra el tiempo, reza la oración
// que resuelve la API y mide en qué tiempo se reza (KPI sin datos personales).
import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import Prayer from "@/app/prayer";
import { renderScreen } from "./render";

type ApiCall = (path: string, opts?: unknown) => Promise<unknown>;
const mockApi = jest.fn<ApiCall>();
jest.mock("@/src/api", () => ({
  api: (path: string, opts?: unknown) => mockApi(path, opts),
  deviceTimeZone: () => "Europe/Madrid",
}));
const mockTrack = jest.fn();
jest.mock("@/src/analytics", () => ({ track: (...args: unknown[]) => mockTrack(...args) }));
jest.mock("@/src/auth", () => ({ useAuth: () => ({ user: { timezone: "Europe/Madrid" }, refresh: jest.fn() }) }));
const mockBack = jest.fn();
let mockParams: Record<string, string> = { kind: "morning" };
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }), useLocalSearchParams: () => mockParams }));
jest.mock("@/src/components/AudioPlayer", () => ({ AudioPlayer: () => null }));

const daily = (extra: Record<string, unknown>) => ({
  date: "2026-12-01",
  season: "advent",
  saintOfDay: null,
  gospel: { ref: "Lc 1", es: "g", en: "g" },
  meditation: { es: "m", en: "m", audioUrl: { es: null, en: null } },
  morningPrayer: { es: "Ven, Señor Jesús", en: "Come, Lord Jesus", audioUrl: { es: null, en: null }, source: "season" },
  nightPrayer: null,
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { kind: "morning" };
});

test("muestra el tiempo litúrgico y la oración del tiempo; al completar mide el tiempo", async () => {
  mockApi.mockImplementation(async (path) => (path.startsWith("/daily") ? daily({}) : { streak: 3 }));
  await renderScreen(<Prayer />);
  expect(await screen.findByText("Ven, Señor Jesús")).toBeTruthy();
  expect(screen.getByTestId("liturgical-season").props.children).toBe("Tiempo de Adviento");

  await fireEvent.press(screen.getByTestId("complete-prayer-button"));
  await waitFor(() => expect(mockTrack).toHaveBeenCalledWith("prayer_completed", { kind: "morning", season: "advent" }));
  expect(mockApi).toHaveBeenCalledWith("/prayers/complete", { method: "POST", body: { kind: "morning" } });
});

test("sin oración para ese momento avisa en vez de dejar la pantalla vacía", async () => {
  mockParams = { kind: "night" };
  mockApi.mockImplementation(async () => daily({}));
  await renderScreen(<Prayer />);
  expect(await screen.findByText("La oración de hoy aún no está disponible.")).toBeTruthy();
});
