// US-35: la casilla de novedades del registro sale sin marcar, y registrarse no depende de ella.
import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import LoginScreen from "@/app/(auth)/login";
import RegisterScreen from "@/app/(auth)/registro";
import { renderScreen } from "./render";

type Register = (email: string, password: string, name: string, opts?: { newsConsent?: boolean }) => Promise<void>;
const mockRegister = jest.fn<Register>();
let mockParams: Record<string, string> = {};
jest.mock("@/src/auth", () => ({
  useAuth: () => ({ register: mockRegister, login: jest.fn(), loginWithProvider: jest.fn() }),
}));
jest.mock("@/src/features", () => ({ useFeatures: () => ({ passwordReset: false, candlesFree: true }) }));
jest.mock("@/src/components/SocialButtons", () => ({ SocialButtons: () => null }));
jest.mock("@/src/ritual/CandleFlame", () => ({ CandleFlame: () => null }));
jest.mock("@/src/legal", () => ({ LegalLinks: () => null }));
jest.mock("react-native-keyboard-controller", () => jest.requireActual("react-native-keyboard-controller/jest"));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }), useLocalSearchParams: () => mockParams }));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockRegister.mockResolvedValue(undefined);
});

async function fill() {
  await fireEvent.changeText(screen.getByTestId("name-input"), "Rosa");
  await fireEvent.changeText(screen.getByTestId("email-input"), "rosa@example.com");
  await fireEvent.changeText(screen.getByTestId("password-input"), "Oracion2026!");
}

test("/registro abre el alta con la casilla sin marcar y registra sin novedades", async () => {
  await renderScreen(<RegisterScreen />);
  expect(screen.getByTestId("news-consent").props.value).toBe(false);
  expect(screen.getByText("Quiero recibir novedades y ayudar a mejorar la app")).toBeTruthy();
  await fill();
  await fireEvent.press(screen.getByTestId("submit-auth-button"));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith("rosa@example.com", "Oracion2026!", "Rosa", { newsConsent: false }));
});

test("si la marca, el registro lleva el permiso", async () => {
  mockParams = { registro: "1" };
  await renderScreen(<LoginScreen />);
  await fill();
  await fireEvent(screen.getByTestId("news-consent"), "valueChange", true);
  await fireEvent.press(screen.getByTestId("submit-auth-button"));
  await waitFor(() => expect(mockRegister).toHaveBeenCalledWith("rosa@example.com", "Oracion2026!", "Rosa", { newsConsent: true }));
});

test("el acceso normal no enseña la casilla", async () => {
  await renderScreen(<LoginScreen />);
  expect(screen.queryByTestId("news-consent")).toBeNull();
});
