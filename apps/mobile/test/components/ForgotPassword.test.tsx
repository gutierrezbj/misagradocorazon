// SDD-05 US-24: recuperar la contraseña con un código de 6 dígitos por email.
import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import ForgotPassword from "@/app/(auth)/forgot-password";
import { renderScreen } from "./render";

type Req = (path: string, body: Record<string, string>) => Promise<void>;
const mockReq = jest.fn<Req>();
jest.mock("@/src/api", () => {
  const actual = jest.requireActual<typeof import("@/src/api")>("@/src/api");
  return { ApiError: actual.ApiError, passwordResetRequest: (p: string, b: Record<string, string>) => mockReq(p, b) };
});
const mockTrack = jest.fn();
jest.mock("@/src/analytics", () => ({ track: (...args: unknown[]) => mockTrack(...args) }));
// Mock oficial de la librería del teclado (módulo nativo).
jest.mock("react-native-keyboard-controller", () => jest.requireActual("react-native-keyboard-controller/jest"));
const mockBack = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: mockBack }) }));

const { ApiError } = jest.requireActual<typeof import("@/src/api")>("@/src/api");

beforeEach(() => {
  jest.clearAllMocks();
  mockReq.mockResolvedValue(undefined);
});

async function toCodeStep() {
  await renderScreen(<ForgotPassword />);
  await fireEvent.changeText(screen.getByTestId("reset-email-input"), "  Rosa@Example.com ");
  await fireEvent.press(screen.getByTestId("send-code-button"));
  await screen.findByTestId("reset-code-input");
}

test("pide el código con el email normalizado y, con él, cambia la contraseña", async () => {
  await toCodeStep();
  expect(mockReq).toHaveBeenCalledWith("/auth/email-otp/request-password-reset", { email: "rosa@example.com" });
  expect(mockTrack).toHaveBeenCalledWith("password_reset_requested");
  // Sin revelar si la cuenta existe.
  expect(screen.getByText(/Si hay una cuenta con ese correo/)).toBeTruthy();

  await fireEvent.changeText(screen.getByTestId("reset-code-input"), "12a34 56");
  expect(screen.getByTestId("reset-code-input").props.value).toBe("123456");
  await fireEvent.changeText(screen.getByTestId("reset-password-input"), "NuevaClave2026!");
  await fireEvent.press(screen.getByTestId("change-password-button"));
  await waitFor(() => expect(mockBack).toHaveBeenCalled());
  expect(mockReq).toHaveBeenLastCalledWith("/auth/email-otp/reset-password", { email: "rosa@example.com", otp: "123456", password: "NuevaClave2026!" });
  expect(mockTrack).toHaveBeenCalledWith("password_reset_completed");
});

test("un código incorrecto se explica y no sale de la pantalla", async () => {
  await toCodeStep();
  mockReq.mockRejectedValueOnce(new ApiError(400, "INVALID_OTP", "Invalid OTP"));
  await fireEvent.changeText(screen.getByTestId("reset-code-input"), "000000");
  await fireEvent.changeText(screen.getByTestId("reset-password-input"), "NuevaClave2026!");
  await fireEvent.press(screen.getByTestId("change-password-button"));
  expect(await screen.findByText("El código no es correcto.")).toBeTruthy();
  expect(mockBack).not.toHaveBeenCalled();
});

test("una contraseña corta no llega a enviarse", async () => {
  await toCodeStep();
  mockReq.mockClear();
  await fireEvent.changeText(screen.getByTestId("reset-code-input"), "123456");
  await fireEvent.changeText(screen.getByTestId("reset-password-input"), "corta");
  await fireEvent.press(screen.getByTestId("change-password-button"));
  expect(await screen.findByText("La contraseña debe tener al menos 8 caracteres")).toBeTruthy();
  expect(mockReq).not.toHaveBeenCalled();
});
