// Entorno común de los tests de componentes: módulos nativos sustituidos por sus mocks oficiales.
import { jest } from "@jest/globals";
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("react-native-worklets", () => require("react-native-worklets/src/mock"));
// El mock oficial no trae useReducedMotion (la vela en pantalla, US-31): sin "reducir movimiento".
jest.mock("react-native-reanimated", () => ({ ...require("react-native-reanimated/mock"), useReducedMotion: () => false }));
jest.mock("react-native-safe-area-context", () => require("react-native-safe-area-context/jest/mock").default);
