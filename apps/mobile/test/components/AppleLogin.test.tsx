// Apple 5.1.1(v): tras entrar con Apple, el código de autorización va a la API (para poder revocar
// al borrar la cuenta), nunca al login. Si ese envío falla, el login sigue adelante.
import { beforeEach, expect, jest, test } from "@jest/globals";
import { Pressable, Text } from "react-native";
import { fireEvent, render, screen } from "@testing-library/react-native";

import { AuthProvider, useAuth } from "@/src/auth";

type Call = (path: string, init?: { method?: string; body?: unknown }) => Promise<unknown>;
const mockApi = jest.fn<Call>();
const mockAuthRequest = jest.fn<(path: string, body: Record<string, unknown>) => Promise<void>>();
let mockCredential: Record<string, unknown> | null = null;

jest.mock("@/src/api", () => ({
  ...jest.requireActual<object>("@/src/api"),
  api: (path: string, init?: { method?: string; body?: unknown }) => mockApi(path, init),
  authRequest: (path: string, body: Record<string, unknown>) => mockAuthRequest(path, body),
  loadToken: async () => null,
  clearToken: async () => undefined,
  signOutRequest: async () => undefined,
}));
jest.mock("@/src/social", () => ({
  signInWithApple: async () => mockCredential,
  signInWithGoogle: async () => null,
  socialSignOut: async () => undefined,
}));
jest.mock("@/src/push", () => ({ unregisterPush: async () => undefined }));
jest.mock("@/src/analytics", () => ({ applyAnalyticsConsent: async () => undefined }));

const user = { id: "u1", analyticsConsent: false };

function Probe() {
  const { loginWithProvider, user: current } = useAuth();
  return (
    <>
      <Pressable testID="apple" onPress={() => void loginWithProvider("apple")} />
      <Text testID="who">{current?.id ?? "none"}</Text>
    </>
  );
}

beforeEach(() => {
  mockApi.mockReset();
  mockAuthRequest.mockReset();
  mockAuthRequest.mockResolvedValue(undefined);
  mockCredential = { provider: "apple", idToken: { token: "id-token", nonce: "n" }, authorizationCode: "code-1" };
});

test("el login recibe solo el ID token y el código va aparte a la API", async () => {
  mockApi.mockImplementation(async (path) => (path === "/me" ? user : { stored: true }));
  await render(<AuthProvider><Probe /></AuthProvider>);
  await fireEvent.press(screen.getByTestId("apple"));
  await screen.findByText("u1");

  expect(mockAuthRequest).toHaveBeenCalledWith("/auth/sign-in/social", { provider: "apple", idToken: { token: "id-token", nonce: "n" } });
  expect(mockApi).toHaveBeenCalledWith("/me/apple-authorization", { method: "POST", body: { code: "code-1" } });
});

test("si guardar el código falla, la sesión se abre igual", async () => {
  mockApi.mockImplementation(async (path) => {
    if (path === "/me/apple-authorization") throw new Error("Network request failed");
    return user;
  });
  await render(<AuthProvider><Probe /></AuthProvider>);
  await fireEvent.press(screen.getByTestId("apple"));
  expect(await screen.findByText("u1")).toBeTruthy();
});

test("si Apple no da código, no se llama a la API", async () => {
  mockCredential = { provider: "apple", idToken: { token: "id-token" } };
  mockApi.mockImplementation(async () => user);
  await render(<AuthProvider><Probe /></AuthProvider>);
  await fireEvent.press(screen.getByTestId("apple"));
  await screen.findByText("u1");
  expect(mockApi.mock.calls.map(([p]) => p)).not.toContain("/me/apple-authorization");
});
