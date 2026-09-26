import { createServer } from "node:http";

import { createApp } from "./app.ts";
import { env } from "./env.ts";
import { attachChat } from "./modules/misa/chat.ts";

const server = createServer(createApp());
attachChat(server);

server.listen(env.PORT, () => {
  console.log(`API Mi Sagrado Corazón escuchando en :${env.PORT}`);
});
