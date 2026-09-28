// SDD-05 US-25: compartir el evangelio del día con la hoja nativa, en el idioma del fiel y sin
// datos personales.
import { beforeEach, expect, jest, test } from "@jest/globals";
import { Share } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import Gospel from "@/app/gospel";
import { gospelMessage } from "@/src/ritual/share-gospel";
import { renderScreen } from "./render";

const mockApi = jest.fn<(path: string) => Promise<unknown>>();
jest.mock("@/src/api", () => ({ api: (path: string) => mockApi(path), deviceTimeZone: () => "Europe/Madrid" }));
const mockTrack = jest.fn();
jest.mock("@/src/analytics", () => ({ track: (...args: unknown[]) => mockTrack(...args) }));
jest.mock("@/src/auth", () => ({ useAuth: () => ({ user: { timezone: "Europe/Madrid", name: "Rosario Castellanos" } }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("@/src/ritual/AudioPlayer", () => ({ AudioPlayer: () => null }));

const daily = {
  date: "2026-09-28",
  season: "ordinary",
  saintOfDay: null,
  gospel: { ref: "Lc 9, 46-50", es: "Surgió entre los discípulos una discusión...", en: "An argument arose among the disciples..." },
  meditation: { es: "m", en: "m", audioUrl: { es: null, en: null } },
  morningPrayer: null,
  nightPrayer: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.mockResolvedValue(daily);
});

test("el mensaje lleva la cita, el evangelio y el nombre de la app", () => {
  expect(gospelMessage("Lc 9, 46-50", "  Texto  ", "Evangelio de hoy en Mi Sagrado Corazón")).toBe(
    "Lc 9, 46-50\n\nTexto\n\nEvangelio de hoy en Mi Sagrado Corazón · misagradocorazon.com",
  );
});

test("compartir abre la hoja nativa con el evangelio en su idioma y sin datos personales", async () => {
  const share = jest.spyOn(Share, "share").mockResolvedValue({ action: Share.sharedAction });
  await renderScreen(<Gospel />);
  await fireEvent.press(await screen.findByTestId("share-gospel"));
  await waitFor(() => expect(mockTrack).toHaveBeenCalledWith("gospel_shared"));
  const [content] = share.mock.calls[0]!;
  const message = (content as { message: string }).message;
  expect(message).toContain("Lc 9, 46-50");
  expect(message).toContain("Surgió entre los discípulos");
  expect(message).not.toContain("Rosario");
});

test("si la persona cierra la hoja sin compartir, no se cuenta", async () => {
  jest.spyOn(Share, "share").mockResolvedValue({ action: Share.dismissedAction });
  await renderScreen(<Gospel />);
  await fireEvent.press(await screen.findByTestId("share-gospel"));
  await waitFor(() => expect(Share.share).toHaveBeenCalled());
  expect(mockTrack).not.toHaveBeenCalled();
});

test("en web la hoja no devuelve resultado: cuenta como compartido y no muestra error", async () => {
  jest.spyOn(Share, "share").mockResolvedValue(undefined as never);
  await renderScreen(<Gospel />);
  await fireEvent.press(await screen.findByTestId("share-gospel"));
  await waitFor(() => expect(mockTrack).toHaveBeenCalledWith("gospel_shared"));
  expect(screen.queryByText("No se pudo compartir.")).toBeNull();
});

test("cancelar en web (AbortError) no es un error", async () => {
  const abort = Object.assign(new Error("cancelado"), { name: "AbortError" });
  jest.spyOn(Share, "share").mockRejectedValue(abort);
  await renderScreen(<Gospel />);
  await fireEvent.press(await screen.findByTestId("share-gospel"));
  await waitFor(() => expect(Share.share).toHaveBeenCalled());
  expect(screen.queryByText("No se pudo compartir.")).toBeNull();
  expect(mockTrack).not.toHaveBeenCalled();
});
