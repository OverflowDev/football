"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Transaction } from "@/types";

const PAGE_SIZE = 10;

export function TransactionHistory({ transactions }: { transactions: Transaction[] }) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(transactions.length / PAGE_SIZE));
  const slice = transactions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (transactions.length === 0) {
    return (
      <div className="card-surface bg-card p-10 text-center text-sm text-content-secondary">
        No transactions yet. Make your first trade from the Market.
      </div>
    );
  }

  return (
    <div className="card-surface bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-white/5 text-xs text-content-secondary">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3 text-right">Shares</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Fee</th>
              <th className="px-4 py-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((t) => (
              <tr key={t.id} className="border-b border-white/5">
                <td className="px-4 py-3 text-content-secondary">{formatDate(t.createdAt)}</td>
                <td className="px-4 py-3">
                  <Badge variant={t.type === "BUY" ? "up" : "down"}>{t.type}</Badge>
                </td>
                <td className="px-4 py-3 font-medium">{t.playerSymbol}</td>
                <td className="px-4 py-3 text-right font-mono">{t.shares.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(t.pricePerShare)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatCurrency(t.totalAmount)}</td>
                <td className="px-4 py-3 text-right font-mono text-content-secondary">
                  {formatCurrency(t.fee)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Badge variant={t.isOnChain ? "primary" : "default"}>
                    {t.isOnChain ? "On-chain" : "Virtual"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 px-4 py-3 text-sm">
          <span className="text-content-secondary">
            Page {page + 1} of {pages}
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
