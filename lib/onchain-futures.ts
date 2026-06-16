// Reads a wallet's on-chain futures positions directly from FootballFutures —
// the source of truth. The DB keeps no futures state.

import { arcPublicClient } from "@/lib/onchain";
import { FOOTBALL_FUTURES_ABI } from "@/lib/abi";
import { DEPLOYED_TOKEN_LIST } from "@/lib/mock-data";
import { marketData } from "@/lib/market-data";
import { liquidationPrice } from "@/lib/futures-math";
import type { FuturesPosition, FuturesSide } from "@/types";

const FUTURES = process.env.NEXT_PUBLIC_FOOTBALL_FUTURES_ADDRESS as `0x${string}` | undefined;

interface RawPosition {
  owner: string;
  playerToken: string;
  isLong: boolean;
  size: bigint;
  leverage: number;
  entryPrice: bigint;
  margin: bigint;
  open: boolean;
}

export async function getOnChainPositions(wallet: string): Promise<FuturesPosition[]> {
  if (!FUTURES || !/^0x[a-fA-F0-9]{40}$/.test(wallet)) return [];

  let ids: readonly bigint[];
  try {
    ids = (await arcPublicClient.readContract({
      address: FUTURES,
      abi: FOOTBALL_FUTURES_ABI,
      functionName: "getUserPositions",
      args: [wallet as `0x${string}`],
    })) as readonly bigint[];
  } catch {
    return [];
  }

  // token address -> player (for name/symbol + live mark price)
  const players = await marketData.getPlayers();
  const bySlug = new Map(players.map((p) => [p.slug, p]));
  const tokenToSlug = new Map(
    DEPLOYED_TOKEN_LIST.map((t) => [t.address.toLowerCase(), t.slug])
  );

  const out: FuturesPosition[] = [];
  for (const id of ids) {
    try {
      const [pos, value] = await Promise.all([
        arcPublicClient.readContract({
          address: FUTURES,
          abi: FOOTBALL_FUTURES_ABI,
          functionName: "positions",
          args: [id],
        }) as Promise<unknown>,
        arcPublicClient.readContract({
          address: FUTURES,
          abi: FOOTBALL_FUTURES_ABI,
          functionName: "positionValue",
          args: [id],
        }) as Promise<readonly [bigint, boolean]>,
      ]);

      const p = pos as unknown as RawPosition;
      if (!p.open) continue;

      const slug = tokenToSlug.get(p.playerToken.toLowerCase());
      const player = slug ? bySlug.get(slug) : undefined;
      if (!player) continue;

      const side: FuturesSide = p.isLong ? "LONG" : "SHORT";
      const size = Number(p.size / 10n ** 18n);
      const entryPrice = Number(p.entryPrice) / 1e6;
      const margin = Number(p.margin) / 1e6;
      const pnl = Number(value[0]) / 1e6;
      const pnlPercent = margin > 0 ? Math.round((pnl / margin) * 10000) / 100 : 0;

      out.push({
        id: id.toString(),
        playerId: player.id,
        player,
        side,
        size,
        leverage: p.leverage,
        entryPrice,
        markPrice: player.currentPrice,
        margin,
        liquidationPrice: liquidationPrice(entryPrice, side, p.leverage),
        notional: Math.round(size * entryPrice * 100) / 100,
        unrealizedPnl: Math.round(pnl * 100) / 100,
        pnlPercent,
        status: "OPEN",
        openedAt: "",
      });
    } catch {
      // skip unreadable position
    }
  }
  return out;
}
