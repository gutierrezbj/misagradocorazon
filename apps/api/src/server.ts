import "./instrument.ts";
import { createServer } from "node:http";

import { createApp } from "./app.ts";
import { prisma } from "./db.ts";
import { env } from "./env.ts";
import { attachChat } from "./modules/misa/chat.ts";

const server = createServer(createApp());
const io = attachChat(server);

server.listen(env.PORT, () => {
  console.log(`API Mi Sagrado Corazón escuchando en :${env.PORT}`);
});

// Railway envía SIGTERM al redesplegar: se dejan de aceptar conexiones, se cierran los sockets
// del chat y la base de datos, y se sale. Si algo se cuelga, se sale igualmente a los 10 s.
let stopping = false;
function shutdown(signal: string) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: cerrando la API`);
  setTimeout(() => process.exit(1), 10_000).unref();
  void io.close();
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
