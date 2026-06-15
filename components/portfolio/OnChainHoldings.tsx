"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { Link2, ExternalLink } from "lucide-react";
import { PlayerAvatar } from "@/components/shared/PlayerAvatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useApi } from "@/hooks/useApi";
import { useStore } from "@/store";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { OnChainHolding } from "@/types";

/**
 * On-chain holdings, read live from the chain (the source of truth for
 * settled positions). Shown only when a wallet is connected.
 */
export function OnChainHoldings() {
  const { isConnected, address } = useAccount();
  const authenticated = useStore((s) => s.authenticated);
  const enabled = isConnected && authenticated;

  const { data, isLoading } = useApi<{ holdings: OnChainHolding[] }>(
    ["onchain-holdings", address ?? ""],
    "/api/portfolio/onchain",
    enabled ? 20000 : undefined
  );

  if (!enabled) return null;

  const holdings = data?.holdings ?? [];

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
        <Link2 className="h-4 w-4 text-primary" /> On-Chain Holdings
        <span className="text-[10px] font-normal text-content-secondary">read live from Arc</span>
      </h3>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : holdings.length === 0 ? (
        <div className="card-surface bg-card p-6 text-center text-sm text-content-secondary">
          No on-chain holdings in this wallet yet. Use the <strong>On-Chain</strong> tab on a
          tokenized player to buy shares in USDC.
        </div>
      ) : (
        <div className="overflow-x-auto card-surface bg-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b border-white/5 text-xs text-content-secondary">
              <tr>
                <th className="px-4 py-3">Player</th>
                <th className="px-4 py-3 text-right">Shares (wallet)</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Value</th>
                <th className="px-4 py-3 text-right">Token</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h) => (
                <tr key={h.player.id} className="border-b border-white/5">
                  <td className="px-4 py-3">
                    <Link href={`/market/${h.player.slug}`} className="flex items-center gap-2">
                      <PlayerAvatar src={h.player.imageUrl} name={h.player.name} size="sm" />
                      <div>
                        <p className="font-medium">{h.player.name}</p>
                        <p className="text-xs text-content-secondary">{h.player.symbol}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">{formatNumber(h.shares)}</td>
                  <td className="px-4 py-3 text-right font-mono">{formatCurrency(h.player.currentPrice)}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold">{formatCurrency(h.currentValue)}</td>
                  <td className="px-4 py-3 text-right">
                    {h.player.contractAddress && (
                      <a
                        href={`https://testnet.arcscan.app/token/${h.player.contractAddress}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        view <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
