// Chat de misa en tiempo real (Socket.IO, ADR-014). Historial por REST y mensajes nuevos por socket.
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { api, BASE, getMemToken } from "@/src/api";
import type { ChatMessage } from "@/src/types";

type SendResult = { ok: boolean; status?: "approved" | "pending"; error?: string };

export function useMassChat(massId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!massId) return;
    let cancelled = false;

    api<ChatMessage[]>(`/masses/${massId}/chat`)
      .then((history) => !cancelled && setMessages(history))
      .catch(() => undefined);

    const token = getMemToken();
    const socket = io(BASE, { transports: ["websocket"], auth: token ? { token } : {} });
    socketRef.current = socket;
    socket.on("connect", () => {
      setConnected(true);
      socket.emit("chat:join", { massId });
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("chat:message", (m: ChatMessage) =>
      setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m].slice(-200))),
    );
    socket.on("chat:removed", ({ id }: { id: string }) => setMessages((prev) => prev.filter((p) => p.id !== id)));

    return () => {
      cancelled = true;
      socket.disconnect();
      socketRef.current = null;
    };
  }, [massId]);

  const send = useCallback(
    (text: string) =>
      new Promise<SendResult>((resolve) => {
        const socket = socketRef.current;
        if (!socket || !massId) return resolve({ ok: false, error: "not_connected" });
        socket.timeout(5000).emit("chat:send", { massId, text }, (err: Error | null, res: SendResult) =>
          resolve(err ? { ok: false, error: "timeout" } : res),
        );
      }),
    [massId],
  );

  return { messages, connected, send };
}
