// SDD-07, cliente: la vela en pantalla (US-31).
// - La cera baja según lo que le queda a la vela.
// - La pantalla se mantiene encendida durante el temporizador y se libera al acabar.
// - La intención está oculta al entrar.
// - Al consumirse, la llama se apaga y no se ofrece encender otra.
import { afterEach, beforeEach, describe, expect, jest, test } from "@jest/globals";
import { act, fireEvent, screen } from "@testing-library/react-native";
import { View as MockView } from "react-native";

import Vigil from "@/app/vigil/[id]";
import { remainingFraction, remainingParts, waxLevel } from "@/src/ritual/vigil";
import { renderScreen } from "./render";

const NOW = Date.parse("2026-12-01T21:00:00Z");
const HOUR = 3_600_000;

type ApiCall = (path: string) => Promise<unknown>;
const mockApi = jest.fn<ApiCall>();
const mockTrack = jest.fn();
const mockBack = jest.fn();
const mockPush = jest.fn();
const mockKeepOn = jest.fn((_active: boolean) => true);

jest.mock("@/src/api", () => ({ api: (path: string) => mockApi(path), deviceTimeZone: () => "Europe/Madrid" }));
jest.mock("@/src/auth", () => ({ useAuth: () => ({ user: { timezone: "Europe/Madrid" } }) }));
jest.mock("@/src/analytics", () => ({ track: (...args: unknown[]) => mockTrack(...args) }));
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack, push: mockPush, replace: mockPush }),
  useLocalSearchParams: () => ({ id: "c1" }),
}));
jest.mock("@/src/ritual/keep-awake", () => ({ useKeepScreenOn: (active: boolean) => mockKeepOn(active) }));
jest.mock("@/src/ritual/AudioPlayer", () => ({ AudioPlayer: ({ testID }: { testID: string }) => <MockView testID={testID} /> }));

let candle: Record<string, unknown>;
const lastKeepOn = () => mockKeepOn.mock.calls.at(-1)?.[0];

beforeEach(() => {
  jest.useFakeTimers({ now: NOW });
  jest.clearAllMocks();
  // Vela solemne (3 días) encendida hace 19 h: le quedan 2 días y 5 horas.
  candle = {
    id: "c1",
    saintId: "s1",
    saint: { id: "s1", name: "Virgen de Guadalupe", imageUrl: "" },
    intention: "Por la salud de mi madre",
    type: "solemn",
    category: "general",
    priceCents: 0,
    litAt: new Date(NOW - 19 * HOUR).toISOString(),
    expiresAt: new Date(NOW + 53 * HOUR).toISOString(),
    active: true,
  };
  mockApi.mockImplementation(async (path) =>
    path === "/candles/me" ? [candle] : { nightPrayer: { es: "", en: "", audioUrl: { es: "https://m/n.mp3" }, source: "day" } },
  );
});
afterEach(() => {
  jest.useRealTimers();
});

const open = async () => {
  await renderScreen(<Vigil />);
  await screen.findByTestId("vigil-timer");
};
const start = async (timer: 30 | 60 | 480 = 60) => {
  await open();
  if (timer !== 60) await fireEvent.press(screen.getByTestId(`vigil-timer-${timer}`));
  await fireEvent.press(screen.getByTestId("vigil-start"));
};
// Avanza el reloj de 10 en 10 s para que los efectos vuelvan a programar sus temporizadores.
const advance = async (ms: number) => {
  for (let done = 0; done < ms; done += 10_000) {
    await act(async () => {
      jest.advanceTimersByTime(Math.min(10_000, ms - done));
    });
  }
};

describe("cálculos", () => {
  test("lo que queda de la vela, entre 0 y 1", () => {
    const lit = new Date(NOW - HOUR).toISOString();
    const end = new Date(NOW + 3 * HOUR).toISOString();
    expect(remainingFraction(lit, end, NOW)).toBeCloseTo(0.75);
    expect(remainingFraction(lit, end, NOW + 10 * HOUR)).toBe(0);
    expect(remainingFraction(lit, end, NOW - 10 * HOUR)).toBe(1);
  });

  test("la cera baja con el tiempo y siempre queda un resto", () => {
    expect(waxLevel(1)).toBe(1);
    expect(waxLevel(0.5)).toBeCloseTo(0.56);
    expect(waxLevel(0)).toBe(0.12);
  });

  test("días, horas y minutos, redondeando hacia arriba", () => {
    expect(remainingParts(53 * HOUR)).toEqual({ days: 2, hours: 5, minutes: 0 });
    expect(remainingParts(61_000)).toEqual({ days: 0, hours: 0, minutes: 2 });
  });
});

test("al entrar: temporizador de 1 h elegido, la intención oculta y lo que queda", async () => {
  await open();
  expect(screen.getByTestId("vigil-timer-60").props.accessibilityState).toEqual({ selected: true });
  expect(screen.getByTestId("vigil-left")).toHaveTextContent("Quedan: 2 días y 5 horas");
  expect(screen.queryByText("Por la salud de mi madre")).toBeNull();
  expect(lastKeepOn()).toBe(false);
});

test("al empezar mantiene la pantalla encendida y lo mide", async () => {
  await start();
  expect(lastKeepOn()).toBe(true);
  expect(mockTrack).toHaveBeenCalledWith("candle_vigil_started", { type: "solemn", timer: 60 });
});

test("la intención solo se ve al pedirla y se oculta sola a los 10 s", async () => {
  await start();
  await fireEvent.press(screen.getByTestId("vigil-screen"));
  await fireEvent.press(screen.getByTestId("vigil-intention-toggle"));
  expect(screen.getByTestId("vigil-intention")).toHaveTextContent("Por la salud de mi madre");
  await advance(10_000);
  expect(screen.queryByTestId("vigil-intention")).toBeNull();
});

test("los controles traen la oración de la noche y se ocultan solos", async () => {
  await start();
  await fireEvent.press(screen.getByTestId("vigil-screen"));
  expect(screen.getByTestId("vigil-night-prayer")).toBeTruthy();
  await advance(5_000);
  expect(screen.queryByTestId("vigil-controls")).toBeNull();
});

test("al acabar el temporizador la pantalla ya puede apagarse", async () => {
  await start(30);
  await advance(30 * 60_000);
  expect(lastKeepOn()).toBe(false);
  expect(mockTrack).toHaveBeenCalledWith("candle_vigil_ended", { minutes: 30, reason: "timer" });
  // La vela sigue en pantalla.
  expect(screen.getByTestId("vigil-candle")).toBeTruthy();
});

test("si la vela se consume, la llama se apaga y no se ofrece encender otra", async () => {
  candle.expiresAt = new Date(NOW + 2 * 60_000).toISOString();
  await start(480);
  await advance(2 * 60_000);
  expect(screen.getByTestId("vigil-consumed")).toHaveTextContent("Tu vela se ha consumido");
  expect(lastKeepOn()).toBe(false);
  expect(mockTrack).toHaveBeenCalledWith("candle_vigil_ended", { minutes: 2, reason: "expired" });
  expect(screen.queryByText(/encender|light/i)).toBeNull();
  expect(mockPush).not.toHaveBeenCalled();
});

test("cerrar vuelve atrás y se mide una sola vez", async () => {
  await start();
  await advance(12 * 60_000);
  await fireEvent.press(screen.getByTestId("vigil-screen"));
  await fireEvent.press(screen.getByTestId("vigil-close"));
  expect(mockBack).toHaveBeenCalled();
  const ended = mockTrack.mock.calls.filter(([e]) => e === "candle_vigil_ended");
  expect(ended).toEqual([["candle_vigil_ended", { minutes: 12, reason: "user" }]]);
});

test("una vela que ya no está encendida no se abre", async () => {
  mockApi.mockImplementation(async (path) => (path === "/candles/me" ? [] : {}));
  await renderScreen(<Vigil />);
  expect(await screen.findByText("Esta vela ya no está encendida")).toBeTruthy();
});
