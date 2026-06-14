// ─────────────────────────────────────────────────────────────
// FPI Pricing Engine
//
// Canonical Football Performance Index price formula:
//
//   Price = BaseValue
//         × (1 + (FormRating + RumorScore − InjuryPenalty) / 100)
//         × (Demand / Supply)              ← bonding curve term
//
//   FormRating    : 0..100  (goals, assists, ratings from API-Football)
//   RumorScore    : 0..50   (parsed by the AI News Agent)
//   InjuryPenalty : 0 healthy, 30 injured
//   Demand/Supply : bonding curve — every BUY nudges the next share
//                   price +0.1%, every SELL −0.1%.
//
// On top of the structural FPI price we layer short-term event
// multipliers (match performance, sentiment, demand pressure) and a
// dampener so a single update can never move price more than ±20%.
// ─────────────────────────────────────────────────────────────

import { clamp } from "@/lib/utils";

export const BONDING_CURVE_STEP = 0.001; // 0.1% per share traded
export const MAX_MOVE_PER_UPDATE = 0.2; // ±20% dampener

export interface PricingInputs {
  baseValue: number;
  formRating: number; // 0..100
  rumorScore: number; // 0..50
  injuryStatus: boolean;
  /** net demand pressure: buys − sells over the window */
  netDemand?: number;
  totalSupply?: number;
}

/** Structural FPI value, ignoring short-term curve pressure. */
export function fpiFairValue(inputs: PricingInputs): number {
  const { baseValue, formRating, rumorScore, injuryStatus } = inputs;
  const injuryPenalty = injuryStatus ? 30 : 0;
  const form = clamp(formRating, 0, 100);
  const rumor = clamp(rumorScore, 0, 50);
  const indexMultiplier = 1 + (form + rumor - injuryPenalty) / 100;
  return Math.max(0.5, baseValue * indexMultiplier);
}

/**
 * Bonding-curve adjusted price after `tradedShares` (signed: + buys, − sells).
 * Each share moves the price geometrically by BONDING_CURVE_STEP.
 */
export function applyBondingCurve(price: number, tradedShares: number): number {
  const factor = Math.pow(1 + BONDING_CURVE_STEP, tradedShares);
  return Math.max(0.5, price * factor);
}

/** Marginal cost to BUY `amount` shares along the bonding curve. */
export function bondingCurveBuyCost(currentPrice: number, amount: number): number {
  // sum of geometric series price * r^0 + r^1 + ... + r^(amount-1)
  const r = 1 + BONDING_CURVE_STEP;
  if (amount <= 0) return 0;
  const total = currentPrice * (Math.pow(r, amount) - 1) / (r - 1);
  return Math.round(total * 100) / 100;
}

/** Proceeds from SELLING `amount` shares along the bonding curve. */
export function bondingCurveSellReturn(currentPrice: number, amount: number): number {
  const r = 1 - BONDING_CURVE_STEP;
  if (amount <= 0) return 0;
  const total = currentPrice * (1 - Math.pow(r, amount)) / (1 - r);
  return Math.round(total * 100) / 100;
}

export interface EventInputs {
  // match performance
  goals?: number;
  assists?: number;
  rating?: number; // match rating 0..10
  redCard?: boolean;
  // sentiment events (booleans / counts)
  transferConfirmed?: boolean;
  transferRumor?: boolean;
  contractRenewal?: boolean;
  injuryConfirmed?: boolean;
  returnFromInjury?: boolean;
  positiveNews?: number; // count of positive stories
  negativeNews?: number; // count of negative stories
  // demand
  buys?: number;
  sells?: number;
  volumeSpike?: boolean;
  // volatility
  age: number;
}

function performanceMultiplier(e: EventInputs): number {
  let m = 1;
  m += (e.goals ?? 0) * 0.02; // +2% per goal
  m += (e.assists ?? 0) * 0.01; // +1% per assist
  if ((e.rating ?? 0) > 8) m += 0.015;
  if (e.rating !== undefined && e.rating < 6) m -= 0.015;
  if (e.redCard) m -= 0.03;
  return m;
}

function sentimentMultiplier(e: EventInputs): number {
  let m = 1;
  if (e.transferConfirmed) m += 0.15;
  if (e.transferRumor) m += 0.05;
  if (e.contractRenewal) m += 0.03;
  if (e.injuryConfirmed) m -= 0.08;
  if (e.returnFromInjury) m += 0.05;
  m += (e.positiveNews ?? 0) * 0.015;
  m -= (e.negativeNews ?? 0) * 0.015;
  return m;
}

function demandMultiplier(e: EventInputs): number {
  const buys = e.buys ?? 0;
  const sells = e.sells ?? 0;
  const total = buys + sells;
  if (total === 0) return 1;
  const ratio = (buys - sells) / total; // -1..1
  let m = 1 + ratio * 0.05; // up to ±5% from order-flow imbalance
  if (e.volumeSpike) m = 1 + ratio * 0.09; // amplify on volume spike
  return m;
}

function volatilityFactor(age: number, rawMove: number): number {
  // young players (<23) move more, established stars less.
  const k = age < 23 ? 1.3 : age > 30 ? 0.75 : 1.0;
  return rawMove * k;
}

export interface PriceUpdateResult {
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  triggerReason: string;
  dampened: boolean;
}

/**
 * Compute the next price for a player given current price plus all event
 * inputs. Applies volatility scaling and a ±20% dampener per update.
 */
export function calculateNewPrice(
  currentPrice: number,
  events: EventInputs
): PriceUpdateResult {
  const perf = performanceMultiplier(events);
  const sent = sentimentMultiplier(events);
  const dem = demandMultiplier(events);

  const combined = perf * sent * dem; // multiplicative
  let rawMove = combined - 1; // fractional change

  rawMove = volatilityFactor(events.age, rawMove);

  // dampen extreme single-update moves
  const dampened = Math.abs(rawMove) > MAX_MOVE_PER_UPDATE;
  const move = clamp(rawMove, -MAX_MOVE_PER_UPDATE, MAX_MOVE_PER_UPDATE);

  const newPrice = Math.max(0.5, Math.round(currentPrice * (1 + move) * 100) / 100);
  const changePercent =
    currentPrice > 0 ? ((newPrice - currentPrice) / currentPrice) * 100 : 0;

  const reasons: string[] = [];
  if ((events.goals ?? 0) > 0) reasons.push(`${events.goals}G`);
  if ((events.assists ?? 0) > 0) reasons.push(`${events.assists}A`);
  if (events.transferConfirmed) reasons.push("TRANSFER_CONFIRMED");
  if (events.transferRumor) reasons.push("TRANSFER_RUMOR");
  if (events.injuryConfirmed) reasons.push("INJURY");
  if ((events.buys ?? 0) + (events.sells ?? 0) > 0) reasons.push("MARKET_DEMAND");
  if (reasons.length === 0) reasons.push("MARKET_DRIFT");

  return {
    oldPrice: currentPrice,
    newPrice,
    changePercent: Math.round(changePercent * 100) / 100,
    triggerReason: reasons.join(","),
    dampened,
  };
}
