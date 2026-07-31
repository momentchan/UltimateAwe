/**
 * Standalone WebSocket signal relay for Ultimate a-We.
 * Unity + display web both connect as clients; relay broadcasts JSON text frames.
 *
 * Usage: node tools/signal-relay/server.mjs
 * Env:   PORT=8765 (default)
 */
import { WebSocketServer } from "ws";

const PORT = Number(process.env.PORT) || 8765;

const wss = new WebSocketServer({ port: PORT, host: "0.0.0.0" });

function broadcast(raw, except) {
  for (const client of wss.clients) {
    if (client !== except && client.readyState === 1) {
      client.send(raw);
    }
  }
}

wss.on("connection", (socket, req) => {
  const from = req.socket.remoteAddress;
  console.log(`[relay] + client ${from} (n=${wss.clients.size})`);

  socket.on("message", (data, isBinary) => {
    if (isBinary) return;
    const raw = String(data);
    // Forward to everyone else (sender already knows what it sent)
    broadcast(raw, socket);
  });

  socket.on("close", () => {
    console.log(`[relay] - client ${from} (n=${wss.clients.size})`);
  });
});

console.log(`[relay] listening ws://0.0.0.0:${PORT}`);
console.log(`[relay] Unity:  ws://<this-machine-lan-ip>:${PORT}`);
console.log(`[relay] Web:    via Vite proxy /signal (or ?ws=...)`);
