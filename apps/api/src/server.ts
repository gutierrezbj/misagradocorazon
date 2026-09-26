import { createApp } from "./app.ts";
import { env } from "./env.ts";

createApp().listen(env.PORT, () => {
  console.log(`API Mi Sagrado Corazón escuchando en :${env.PORT}`);
});
