// Reads on-chain presale state from FootballIPO and maps it to IpoListing[]
// (LIVE), merging in the off-chain player metadata (name/club/avatar).

import { arcPublicClient } from "@/lib/onchain";
import { FOOTBALL_IPO_ABI } from "@/lib/abi";
import { FOOTBALL_IPO_ADDRESS, ON_CHAIN_SALES, IPO_LAUNCH_PRICE, ipoAvatar, type OnChainSale } from "@/lib/ipo";
import { prisma } from "@/lib/prisma";
import { hasDatabase } from "@/lib/config";
import type { IpoListing, Position } from "@/types";

const IPO = FOOTBALL_IPO_ADDRESS as `0x${string}`;

type SaleTuple = readonly [string, bigint, bigint, bigint, boolean]; // playerToken, sharesForSale, endsAt, totalRaised, finalized

/** Static seed sales overlaid with DB rows (admin-created offerings). */
async function getSaleMetas(): Promise<OnChainSale[]> {
  const map = new Map<number, OnChainSale>();
  ON_CHAIN_SALES.forEach((s) => map.set(s.saleId, s));
  if (hasDatabase) {
    try {
      const rows = await prisma.ipoSale.findMany();
      rows.forEach((r) =>
        map.set(r.saleId, {
          saleId: r.saleId,
          playerToken: r.playerToken,
          name: r.name,
          club: r.club,
          position: r.position as Position,
          nat: r.nat,
        })
      );
    } catch {
      // DB unreachable — fall back to static seeds
    }
  }
  return [...map.values()].sort((a, b) => a.saleId - b.saleId);
}

export async function getOnChainIpos(wallet: string | null): Promise<IpoListing[]> {
  if (!FOOTBALL_IPO_ADDRESS) return [];
  const w = wallet && /^0x[a-fA-F0-9]{40}$/.test(wallet) ? (wallet as `0x${string}`) : null;

  const metas = await getSaleMetas();
  const out: IpoListing[] = [];
  for (const meta of metas) {
    try {
      const [sale, clearing] = await Promise.all([
        arcPublicClient.readContract({
          address: IPO,
          abi: FOOTBALL_IPO_ABI,
          functionName: "sales",
          args: [BigInt(meta.saleId)],
        }) as Promise<SaleTuple>,
        arcPublicClient.readContract({
          address: IPO,
          abi: FOOTBALL_IPO_ABI,
          functionName: "clearingPrice",
          args: [BigInt(meta.saleId)],
        }) as Promise<bigint>,
      ]);

      const sharesForSale = Number(sale[1] / 10n ** 18n);
      const endsAtSec = Number(sale[2]);
      const totalRaised = Number(sale[3]) / 1e6;
      const finalized = sale[4];
      const clearingPrice = totalRaised > 0 ? Math.round((Number(clearing) / 1e6) * 100) / 100 : IPO_LAUNCH_PRICE;

      let myContribution = 0;
      let myShares = 0;
      let myClaimed = false;
      if (w) {
        const [contrib, alloc, claimed] = await Promise.all([
          arcPublicClient.readContract({ address: IPO, abi: FOOTBALL_IPO_ABI, functionName: "contributions", args: [BigInt(meta.saleId), w] }) as Promise<bigint>,
          arcPublicClient.readContract({ address: IPO, abi: FOOTBALL_IPO_ABI, functionName: "allocationOf", args: [BigInt(meta.saleId), w] }) as Promise<bigint>,
          arcPublicClient.readContract({ address: IPO, abi: FOOTBALL_IPO_ABI, functionName: "claimed", args: [BigInt(meta.saleId), w] }) as Promise<boolean>,
        ]);
        myContribution = Math.round((Number(contrib) / 1e6) * 100) / 100;
        myShares = Number(alloc / 10n ** 18n);
        myClaimed = claimed;
      }

      out.push({
        id: `ipo_chain_${meta.saleId}`,
        name: meta.name,
        club: meta.club,
        position: meta.position,
        nationalityCode: meta.nat,
        imageUrl: ipoAvatar(meta.name),
        status: "LIVE",
        ipoPrice: IPO_LAUNCH_PRICE,
        endsAt: new Date(endsAtSec * 1000).toISOString(),
        sharesForSale,
        raised: totalRaised,
        clearingPrice,
        isOnChain: true,
        saleId: meta.saleId,
        playerToken: sale[0],
        finalized,
        myContribution,
        myShares,
        myClaimed,
      });
    } catch {
      // skip unreadable sale (RPC hiccup)
    }
  }
  return out;
}
