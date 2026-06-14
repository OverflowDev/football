import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const gbpCompact = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
  notation: "compact",
  maximumFractionDigits: 2,
});

const numberFmt = new Intl.NumberFormat("en-GB");
const compactNumber = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 2,
});

/** £1,234.56 */
export function formatCurrency(value: number): string {
  return gbp.format(value ?? 0);
}

/** £1.2M, £980.0K */
export function formatCompactCurrency(value: number): string {
  return gbpCompact.format(value ?? 0);
}

/** 1,234,567 */
export function formatNumber(value: number): string {
  return numberFmt.format(value ?? 0);
}

/** 1.2M */
export function formatCompactNumber(value: number): string {
  return compactNumber.format(value ?? 0);
}

/** +3.42% / -1.10% with explicit sign. */
export function formatPercent(value: number, fractionDigits = 2): string {
  const v = value ?? 0;
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(fractionDigits)}%`;
}

export function formatSigned(value: number): string {
  const v = value ?? 0;
  const sign = v > 0 ? "+" : "";
  return `${sign}${formatCurrency(v)}`;
}

/** Relative time like "3h ago". */
export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Direction helper for coloring. */
export function priceDirection(value: number): "up" | "down" | "flat" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}

export function shortenAddress(address?: string | null): string {
  if (!address) return "";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** ISO-2 country code -> emoji flag. */
export function flagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return "🏳️";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}

export const POSITION_LABELS: Record<string, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

export const POSITION_COLORS: Record<string, string> = {
  GK: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  DEF: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  MID: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  FWD: "bg-rose-500/15 text-rose-400 border-rose-500/30",
};

export const TRADING_FEE_RATE = 0.005; // 0.5%

export function calcFee(amount: number): number {
  return Math.round(amount * TRADING_FEE_RATE * 100) / 100;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
