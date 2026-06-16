"use client";

import { useApi } from "@/hooks/useApi";
import type { Transaction } from "@/types";

export function useTransactions() {
  return useApi<{ transactions: Transaction[] }>(
    ["transactions"],
    "/api/portfolio/transactions"
  );
}
