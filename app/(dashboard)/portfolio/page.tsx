"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Wallet } from "lucide-react";
import { TransactionHistory } from "@/components/portfolio/TransactionHistory";
import { FuturesPositions } from "@/components/portfolio/FuturesPositions";
import { OnChainHoldings } from "@/components/portfolio/OnChainHoldings";
import { useTransactions } from "@/hooks/usePortfolio";
import { useStore } from "@/store";

export default function PortfolioPage() {
  const { data: txData } = useTransactions();
  const { isConnected } = useAccount();
  const authenticated = useStore((s) => s.authenticated);
  const ready = isConnected && authenticated;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold">Portfolio</h1>
        <p className="text-sm text-content-secondary">
          Your on-chain holdings, futures positions and trade history
        </p>
      </div>

      {!ready ? (
        <div className="card-surface bg-card p-10 text-center">
          <Wallet className="mx-auto h-8 w-8 text-content-secondary" />
          <p className="mx-auto mt-3 max-w-sm text-sm text-content-secondary">
            Connect and sign in with your wallet to see your on-chain holdings and futures
            positions (settled in USDC on Arc).
          </p>
          <div className="mt-4 flex justify-center">
            <ConnectButton />
          </div>
        </div>
      ) : (
        <>
          {/* on-chain spot holdings */}
          <OnChainHoldings />

          {/* futures positions */}
          <div>
            <h3 className="mb-3 font-display text-sm font-semibold">Futures Positions</h3>
            <FuturesPositions />
          </div>

          {/* trade history */}
          <div>
            <h3 className="mb-3 font-display text-sm font-semibold">Transaction History</h3>
            <TransactionHistory transactions={txData?.transactions ?? []} />
          </div>
        </>
      )}
    </div>
  );
}
