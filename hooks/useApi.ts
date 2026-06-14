"use client";

import { useQuery } from "@tanstack/react-query";

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function useApi<T>(key: string[], url: string, refetchMs?: number) {
  return useQuery({
    queryKey: key,
    queryFn: () => fetcher<T>(url),
    refetchInterval: refetchMs,
  });
}
