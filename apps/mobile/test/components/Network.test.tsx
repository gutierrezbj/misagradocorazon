// SDD-07 (checklist): la app no falla sin conexión; avisa y el mensaje de error es el correcto.
import { beforeEach, expect, jest, test } from "@jest/globals";
import { screen } from "@testing-library/react-native";

import { ApiError } from "@/src/api";
import { errorKey } from "@/src/errors";
import { OfflineBanner, isOnline } from "@/src/network";
import { renderScreen } from "./render";

let mockNetwork = { isConnected: true as boolean | undefined, isInternetReachable: true as boolean | null | undefined };
jest.mock("expo-network", () => ({ useNetworkState: () => mockNetwork, addNetworkStateListener: () => ({ remove: () => undefined }) }));

beforeEach(() => {
  mockNetwork = { isConnected: true, isInternetReachable: true };
});

test("con red no hay aviso; sin red aparece", async () => {
  await renderScreen(<OfflineBanner />);
  expect(screen.queryByTestId("offline-banner")).toBeNull();
  mockNetwork = { isConnected: false, isInternetReachable: false };
  await renderScreen(<OfflineBanner />);
  expect(screen.getByText(/Sin conexión/)).toBeTruthy();
});

test("al arrancar el sistema aún no sabe si hay internet (null): no se considera sin conexión", () => {
  expect(isOnline({ isConnected: true, isInternetReachable: null } as never)).toBe(true);
  expect(isOnline({ isConnected: true, isInternetReachable: false } as never)).toBe(false);
});

test("cada error lleva a su mensaje", () => {
  expect(errorKey(new TypeError("Network request failed"))).toBe("networkError");
  expect(errorKey(new ApiError(429, "rate_limited", "x"))).toBe("tooFast");
  expect(errorKey(new ApiError(429, "auth_error", "x"))).toBe("tooFast");
  expect(errorKey(new ApiError(500, "internal", "x"))).toBe("genericError");
});
