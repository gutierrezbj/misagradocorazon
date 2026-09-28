// SDD-05 US-26: la ficha del santo muestra su iconografía, en el idioma del fiel, solo si está escrita.
import { beforeEach, expect, jest, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import SaintDetail from "@/app/saint/[id]";
import { renderScreen } from "./render";

const mockApi = jest.fn<(path: string) => Promise<unknown>>();
jest.mock("@/src/api", () => ({ api: (path: string) => mockApi(path) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), push: jest.fn() }), useLocalSearchParams: () => ({ id: "saint_rosa" }) }));
jest.mock("@/src/ritual/AudioPlayer", () => ({ AudioPlayer: () => null }));

const saint = (iconography: { es: string; en: string }) => ({
  id: "saint_rosa",
  name: "Santa Rosa de Lima",
  feastDate: "08-23",
  imageUrl: "https://media.example/rosa.jpg",
  audioUrl: { es: null, en: null },
  history: { es: "Primera santa de América.", en: "First saint of the Americas." },
  patronages: { es: "", en: "" },
  iconography,
  prayer: { es: "", en: "" },
  isPatronCatalog: true,
});

beforeEach(() => {
  jest.clearAllMocks();
});

test("con iconografía escrita, se muestra su sección", async () => {
  mockApi.mockResolvedValue(saint({ es: "Hábito dominico y corona de rosas", en: "Dominican habit and a crown of roses" }));
  await renderScreen(<SaintDetail />);
  expect(await screen.findByText("Iconografía")).toBeTruthy();
  expect(screen.getByText("Hábito dominico y corona de rosas")).toBeTruthy();
});

test("sin iconografía, la sección no aparece vacía", async () => {
  mockApi.mockResolvedValue(saint({ es: "", en: "" }));
  await renderScreen(<SaintDetail />);
  expect(await screen.findByText("Primera santa de América.")).toBeTruthy();
  expect(screen.queryByText("Iconografía")).toBeNull();
});
