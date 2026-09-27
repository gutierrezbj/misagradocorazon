// SDD-07, cliente: el onboarding guarda el santo patrón elegido (US-02).
import { beforeEach, expect, jest, test } from "@jest/globals";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import Onboarding from "@/app/onboarding";
import { renderScreen } from "./render";

type ApiCall = (path: string, options?: { method?: string; body?: Record<string, unknown> }) => Promise<unknown>;
const mockApi = jest.fn<ApiCall>();
const mockSetUser = jest.fn();

jest.mock("@/src/api", () => ({
  ApiError: (jest.requireActual("@/src/api") as { ApiError: unknown }).ApiError,
  api: (...args: Parameters<ApiCall>) => mockApi(...args),
  deviceTimeZone: () => "America/Los_Angeles",
}));
jest.mock("@/src/auth", () => ({ useAuth: () => ({ setUser: mockSetUser }) }));
jest.mock("@/src/push", () => ({ registerForPush: jest.fn(async () => "granted") }));
jest.mock("@/src/analytics", () => ({ applyAnalyticsConsent: jest.fn(async () => undefined), track: jest.fn() }));

const SAINTS = [
  { id: "saint_guadalupe", name: "Virgen de Guadalupe", imageUrl: "https://example.com/g.jpg" },
  { id: "saint_judas", name: "San Judas Tadeo", imageUrl: "https://example.com/j.jpg" },
];
const UPDATED = { id: "u1", onboarded: true, patronSaintId: "saint_judas", analyticsConsent: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.mockImplementation(async (path: string) => (path.startsWith("/saints") ? SAINTS : UPDATED));
});

test("guarda el santo patrón elegido, los horarios, el idioma y la zona horaria", async () => {
  await renderScreen(<Onboarding />);
  await fireEvent.press(await screen.findByTestId("saint-saint_judas"));
  await fireEvent.press(screen.getByTestId("finish-onboarding-button"));

  await waitFor(() => expect(mockSetUser).toHaveBeenCalledWith(UPDATED));
  const put = mockApi.mock.calls.find(([path]) => path === "/me/onboarding");
  expect(put?.[1]).toMatchObject({
    method: "PUT",
    body: {
      patronSaintId: "saint_judas",
      morningTime: "07:30",
      nightTime: "21:30",
      language: "es",
      timezone: "America/Los_Angeles",
      // El consentimiento de analítica empieza desactivado (ADR-011).
      analyticsConsent: false,
    },
  });
});

test("sin santo patrón no se guarda nada", async () => {
  await renderScreen(<Onboarding />);
  await screen.findByTestId("saint-saint_judas");
  await fireEvent.press(screen.getByTestId("finish-onboarding-button"));
  expect(mockApi.mock.calls.some(([path]) => path === "/me/onboarding")).toBe(false);
  expect(mockSetUser).not.toHaveBeenCalled();
});

test("activar la analítica se guarda como consentimiento explícito", async () => {
  await renderScreen(<Onboarding />);
  await fireEvent.press(await screen.findByTestId("saint-saint_guadalupe"));
  await fireEvent(screen.getByTestId("analytics-consent"), "valueChange", true);
  await fireEvent.press(screen.getByTestId("finish-onboarding-button"));
  await waitFor(() => expect(mockSetUser).toHaveBeenCalled());
  const put = mockApi.mock.calls.find(([path]) => path === "/me/onboarding");
  expect(put?.[1]?.body).toMatchObject({ patronSaintId: "saint_guadalupe", analyticsConsent: true });
});
