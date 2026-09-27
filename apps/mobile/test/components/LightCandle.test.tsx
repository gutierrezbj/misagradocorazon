// SDD-07, cliente: el formulario de la vela valida los campos obligatorios (santo e intención)
// y envía el tipo de vela elegido (US-11).
import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import LightCandle from "@/app/light-candle";
import { renderScreen } from "./render";

type ApiCall = (path: string, options?: { method?: string; body?: Record<string, unknown> }) => Promise<unknown>;
const mockApi = jest.fn<ApiCall>();
let mockUser: { patronSaintId: string | null } = { patronSaintId: "saint_guadalupe" };
let mockParams: { saint?: string } = {};

jest.mock("@/src/api", () => ({ api: (...args: Parameters<ApiCall>) => mockApi(...args) }));
jest.mock("@/src/auth", () => ({ useAuth: () => ({ user: mockUser }) }));
jest.mock("@/src/analytics", () => ({ track: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }), useLocalSearchParams: () => mockParams }));

const SAINTS = [
  { id: "saint_guadalupe", name: "Virgen de Guadalupe", imageUrl: "https://example.com/g.jpg" },
  { id: "saint_judas", name: "San Judas Tadeo", imageUrl: "https://example.com/j.jpg" },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = { patronSaintId: "saint_guadalupe" };
  mockParams = {};
  mockApi.mockImplementation(async (path: string) => (path === "/saints" ? SAINTS : { saint: { name: "Virgen de Guadalupe" } }));
});

const candlePosts = () => mockApi.mock.calls.filter(([path]) => path === "/candles");

test("precios de las tres velas: 0,99 / 1,99 / 2,99 USD", async () => {
  await renderScreen(<LightCandle />);
  await screen.findByTestId("candle-saint-saint_judas");
  for (const price of ["$0.99", "$1.99", "$2.99"]) expect(screen.getByText(price)).toBeTruthy();
  // La permanente dura 7 días y no se renueva sola (SDD-02, 27-sep-2026): nada de precio semanal.
  expect(screen.queryByText(/\/sem|\/wk|cada semana/)).toBeNull();
  expect(screen.getByText("Encendida toda una semana")).toBeTruthy();
});

test("desde el aviso de vela apagada llega elegido el santo de esa vela", async () => {
  mockParams = { saint: "saint_judas" };
  await renderScreen(<LightCandle />);
  await screen.findByTestId("candle-saint-saint_judas");
  await fireEvent.changeText(screen.getByTestId("candle-intention-input"), "Por mi familia");
  await fireEvent.press(screen.getByTestId("light-now-button"));
  await waitFor(() => expect(candlePosts()).toHaveLength(1));
  expect(candlePosts()[0]![1]?.body).toMatchObject({ saintId: "saint_judas" });
});

test("sin intención no se enciende y se avisa", async () => {
  await renderScreen(<LightCandle />);
  await screen.findByTestId("candle-saint-saint_judas");
  await fireEvent.changeText(screen.getByTestId("candle-intention-input"), "   ");
  await fireEvent.press(screen.getByTestId("light-now-button"));
  expect(await screen.findByText("Escribe una intención")).toBeTruthy();
  expect(candlePosts()).toHaveLength(0);
});

test("sin santo no se enciende y se avisa", async () => {
  mockUser = { patronSaintId: null };
  await renderScreen(<LightCandle />);
  await screen.findByTestId("candle-saint-saint_judas");
  await fireEvent.changeText(screen.getByTestId("candle-intention-input"), "Por mi madre");
  // "¿A qué santo?" es también el título de la sección: el aviso añade una segunda aparición.
  expect(screen.getAllByText("¿A qué santo?")).toHaveLength(1);
  await fireEvent.press(screen.getByTestId("light-now-button"));
  await waitFor(() => expect(screen.getAllByText("¿A qué santo?")).toHaveLength(2));
  expect(candlePosts()).toHaveLength(0);
});

test("con todo completo envía santo, intención, tipo y categoría, y muestra la vela encendida", async () => {
  await renderScreen(<LightCandle />);
  await fireEvent.press(await screen.findByTestId("candle-saint-saint_judas"));
  await fireEvent.changeText(screen.getByTestId("candle-intention-input"), "Por el alma de mi abuelo");
  await fireEvent.press(screen.getByTestId("candle-type-solemn"));
  await fireEvent.press(screen.getByTestId("deceased-toggle"));
  await fireEvent.press(screen.getByTestId("light-now-button"));

  await waitFor(() => expect(candlePosts()).toHaveLength(1));
  expect(candlePosts()[0]![1]).toEqual({
    method: "POST",
    body: { saintId: "saint_judas", intention: "Por el alma de mi abuelo", type: "solemn", category: "difuntos" },
  });
  expect(await screen.findByTestId("share-candle-button")).toBeTruthy();
});
