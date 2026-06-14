"use client";

import { io, type Socket } from "socket.io-client";

// Event payload contracts shared between server and client.
export interface PriceUpdatePayload {
  playerId: string;
  newPrice: number;
  changePercent: number;
  timestamp: number;
}

export interface TickerEntry {
  playerId: string;
  symbol: string;
  price: number;
  changePercent: number;
}

export interface TradeExecutedPayload {
  playerId: string;
  type: "BUY" | "SELL";
  shares: number;
  price: number;
}

export interface ServerToClientEvents {
  "price:update": (payload: PriceUpdatePayload) => void;
  "market:ticker": (entries: TickerEntry[]) => void;
  "trade:executed": (payload: TradeExecutedPayload) => void;
  "notification:new": (payload: { userId: string; notification: unknown }) => void;
}

export interface ClientToServerEvents {
  "subscribe:player": (playerId: string) => void;
  "unsubscribe:player": (playerId: string) => void;
}

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> | null {
  if (typeof window === "undefined") return null;
  const url = process.env.NEXT_PUBLIC_SOCKET_URL;
  // No socket server configured -> the useSocket hook drives a local
  // simulator instead, so return null here.
  if (!url) return null;
  if (!socket) {
    socket = io(url, {
      transports: ["websocket"],
      autoConnect: true,
      reconnection: true,
    });
  }
  return socket;
}
