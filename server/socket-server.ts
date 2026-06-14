// Standalone Socket.io price server.
// Run with: npx tsx server/socket-server.ts  (port from SOCKET_PORT, default 3001)
//
// Emits live price ticks for all players, periodic ticker snapshots, and
// anonymized trade events. In production the cron `update-prices` route
// would push authoritative prices here; this standalone process simulates
// movement so the realtime UX works in development.

import { createServer } from "http";
import { Server } from "socket.io";
import { PLAYERS, getRecentTrades } from "../lib/mock-data";

const PORT = Number(process.env.SOCKET_PORT || 3001);

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("FPI socket server\n");
});

const io = new Server(httpServer, {
  cors: { origin: "*" },
});

// live price state
const prices = new Map<string, number>();
for (const p of PLAYERS) prices.set(p.id, p.currentPrice);

io.on("connection", (socket) => {
  socket.on("subscribe:player", (playerId: string) => {
    socket.join(`player:${playerId}`);
  });
  socket.on("unsubscribe:player", (playerId: string) => {
    socket.leave(`player:${playerId}`);
  });
});

// random-walk individual prices every ~3s
setInterval(() => {
  const p = PLAYERS[Math.floor(Math.random() * PLAYERS.length)];
  const old = prices.get(p.id) ?? p.currentPrice;
  const drift = (Math.random() - 0.5) * 0.01; // ±0.5%
  const next = Math.max(0.5, Math.round(old * (1 + drift) * 100) / 100);
  prices.set(p.id, next);
  const changePercent = ((next - old) / old) * 100;
  io.emit("price:update", {
    playerId: p.id,
    newPrice: next,
    changePercent: Math.round(changePercent * 100) / 100,
    timestamp: Date.now(),
  });
}, 3000);

// ticker snapshot every 10s (top 20 by market cap)
setInterval(() => {
  const entries = [...PLAYERS]
    .sort((a, b) => b.marketCap - a.marketCap)
    .slice(0, 20)
    .map((p) => ({
      playerId: p.id,
      symbol: p.symbol,
      price: prices.get(p.id) ?? p.currentPrice,
      changePercent: p.priceChangePercent24h,
    }));
  io.emit("market:ticker", entries);
}, 10000);

// anonymized trade feed every ~5s
setInterval(() => {
  const [t] = getRecentTrades(undefined, 1);
  if (t) {
    io.emit("trade:executed", {
      playerId: t.playerId,
      type: t.type,
      shares: t.shares,
      price: t.pricePerShare,
    });
  }
}, 5000);

httpServer.listen(PORT, () => {
  console.log(`⚡ FPI socket server listening on :${PORT}`);
});
