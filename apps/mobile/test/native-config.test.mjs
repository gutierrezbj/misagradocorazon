// Permisos nativos mínimos (GDPR: datos mínimos; revisión de Google Play y App Store).
// La app no lee ni escribe en el almacenamiento compartido (la tarjeta de la vela va a la caché
// y se comparte con expo-sharing), no dibuja sobre otras apps, no graba audio y no usa Face ID.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const { expo } = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));

test("Android bloquea los permisos que añade la plantilla y la app no usa", () => {
  for (const p of ["READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE", "SYSTEM_ALERT_WINDOW"]) {
    assert.ok(expo.android.blockedPermissions?.includes(`android.permission.${p}`), `falta bloquear ${p}`);
  }
});

test("el audio no pide micrófono y sí reproduce en segundo plano", () => {
  const audio = expo.plugins.find((p) => Array.isArray(p) && p[0] === "expo-audio");
  assert.ok(audio, "falta el plugin expo-audio");
  assert.equal(audio[1].microphonePermission, false);
  assert.equal(audio[1].recordAudioAndroid, false);
  assert.equal(audio[1].enableBackgroundPlayback, true);
});

test("iOS no declara Face ID: la sesión se guarda en el llavero sin biometría", () => {
  const store = expo.plugins.find((p) => Array.isArray(p) && p[0] === "expo-secure-store");
  assert.ok(store, "falta el plugin expo-secure-store con opciones");
  assert.equal(store[1].faceIDPermission, false);
});
