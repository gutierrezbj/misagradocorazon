// Ficha completa de la causa (SDD-02 Pilar 3; especificación §2.3): qué se hará con el dinero y
// presupuesto desglosado, además de responsable, plazo, fotos y avances.
import { beforeEach, expect, jest, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import CauseScreen from "@/app/cause/[id]";
import { renderScreen } from "./render";

type ApiCall = (path: string) => Promise<unknown>;
const mockApi = jest.fn<ApiCall>();
jest.mock("@/src/api", () => ({ api: (path: string) => mockApi(path) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }), useLocalSearchParams: () => ({ id: "c1" }) }));

const cause = {
  id: "c1",
  month: "2026-10",
  name: { es: "Agua para San Juan", en: "Water for San Juan" },
  location: "Oaxaca, México",
  responsible: "Parroquia de San Juan",
  description: { es: "El pueblo no tiene agua potable.", en: "The village has no drinking water." },
  fundsUse: { es: "Perforar un pozo y poner una bomba solar.", en: "Drill a well and install a solar pump." },
  budgetCents: 850_050,
  budgetItems: [
    { concept: { es: "Perforación", en: "Drilling" }, amountCents: 600_000 },
    { concept: { es: "Bomba solar", en: "Solar pump" }, amountCents: 250_050 },
  ],
  photos: ["https://media.example/1.jpg", "https://media.example/2.jpg"],
  timeline: "3 meses",
  status: "voting",
  updates: [],
};

beforeEach(() => {
  jest.clearAllMocks();
});

test("muestra el destino del dinero, cada partida y el total", async () => {
  mockApi.mockResolvedValue(cause);
  await renderScreen(<CauseScreen />);
  expect(await screen.findByText("Agua para San Juan")).toBeTruthy();
  expect(mockApi).toHaveBeenCalledWith("/causes/c1");
  expect(screen.getByTestId("cause-funds-use").props.children).toBe("Perforar un pozo y poner una bomba solar.");
  expect(screen.getByText("Perforación")).toBeTruthy();
  expect(screen.getByText("Bomba solar")).toBeTruthy();
  expect(screen.getByTestId("cause-budget-total").props.children).toMatch(/^\$8.?500[.,]50$/);
  expect(screen.getByText("Parroquia de San Juan")).toBeTruthy();
  expect(screen.getByText("3 meses")).toBeTruthy();
  expect(screen.getByTestId("cause-gallery")).toBeTruthy();
});

test("una causa anterior sin destino del dinero no muestra esa sección vacía", async () => {
  mockApi.mockResolvedValue({ ...cause, fundsUse: null, photos: [cause.photos[0]] });
  await renderScreen(<CauseScreen />);
  await screen.findByText("Agua para San Juan");
  expect(screen.queryByTestId("cause-funds-use")).toBeNull();
  expect(screen.queryByTestId("cause-gallery")).toBeNull();
});

test("si la causa no existe lo dice en vez de quedarse cargando", async () => {
  mockApi.mockRejectedValue(new Error("404"));
  await renderScreen(<CauseScreen />);
  expect(await screen.findByText("Esta causa no está disponible.")).toBeTruthy();
});
