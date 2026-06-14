"use client";

import { useApi } from "@/hooks/useApi";
import type { PortfolioSummary, Transaction } from "@/types";

export function usePortfolio() {
  return useApi<{ portfolio: PortfolioSummary }>(
    ["portfolio"],
    "/api/portfolio",
    15000
  );
}

export function useTransactions() {
  return useApi<{ transactions: Transaction[] }>(
    ["transactions"],
    "/api/portfolio/transactions"
  );
}
