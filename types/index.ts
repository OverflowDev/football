// ─────────────────────────────────────────────────────────────
// FPI — shared application types.
// The UI and mock layer work with plain serializable numbers (not
// Prisma Decimal). API routes serialize Decimal -> number at the edge.
// ─────────────────────────────────────────────────────────────

export type Position = "GK" | "DEF" | "MID" | "FWD";
export type TransactionType = "BUY" | "SELL";
export type AlertDirection = "ABOVE" | "BELOW";
export type AgentType = "SCOUT" | "VALUATION" | "PORTFOLIO" | "NEWS";
export type Sentiment = "BULLISH" | "BEARISH" | "NEUTRAL";
export type TradeMode = "VIRTUAL" | "ONCHAIN";
export type TradeKind = "SPOT" | "FUTURES";
export type FuturesSide = "LONG" | "SHORT";
export type PositionStatus = "OPEN" | "CLOSED" | "LIQUIDATED";
export type TimeRange = "1H" | "4H" | "1D" | "1W" | "1M" | "ALL";

export type League =
  | "Premier League"
  | "La Liga"
  | "Serie A"
  | "Bundesliga"
  | "Ligue 1";

export interface Club {
  id: string;
  name: string;
  shortName: string;
  logo: string;
  league: League;
  country: string;
}

export interface PlayerStats {
  season: string;
  matches: number;
  goals: number;
  assists: number;
  minutesPlayed: number;
  yellowCards: number;
  redCards: number;
  rating: number;
  form: number; // 0-100
}

export interface Player {
  id: string;
  apiFootballId: number;
  name: string;
  slug: string;
  position: Position;
  nationality: string;
  nationalityCode: string; // ISO-2 for flag
  age: number;
  club: Club;
  currentPrice: number;
  previousPrice: number;
  priceChange24h: number;
  priceChangePercent24h: number;
  priceChangePercent7d: number;
  marketCap: number;
  totalShares: number;
  sharesAvailable: number;
  volume24h: number;
  baseValue: number;
  formRating: number; // 0-100
  rumorScore: number; // 0-50
  injuryStatus: boolean;
  performanceIndex: number;
  imageUrl: string;
  contractAddress: string | null;
  tokenId: number | null;
  isActive: boolean;
  stats: PlayerStats;
  symbol: string; // e.g. $YAMAL
}

export interface PricePoint {
  time: number; // unix seconds
  price: number;
  volume: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface Holding {
  player: Player;
  shares: number;
  averageBuyPrice: number;
  totalInvested: number;
  currentValue: number;
  pnl: number;
  pnlPercent: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  cashBalance: number;
  totalPnl: number;
  totalPnlPercent: number;
  dayChange: number;
  dayChangePercent: number;
  holdingsCount: number;
  bestPerformer: Holding | null;
  worstPerformer: Holding | null;
  holdings: Holding[];
}

export interface Transaction {
  id: string;
  playerId: string;
  playerName: string;
  playerSymbol: string;
  type: TransactionType;
  shares: number;
  pricePerShare: number;
  totalAmount: number;
  fee: number;
  isOnChain: boolean;
  txHash: string | null;
  createdAt: string;
  // anonymized actor for public order book
  actor?: string;
}

export interface NewsItem {
  id: string;
  playerId: string | null;
  headline: string;
  summary: string;
  source: string;
  url: string;
  sentiment: Sentiment;
  sentimentScore: number; // -10..+10
  priceImpact: number; // percentage
  publishedAt: string;
}

export interface NotificationItem {
  id: string;
  type:
    | "PRICE_ALERT"
    | "TRANSFER_NEWS"
    | "AI_INSIGHT"
    | "DIVIDEND"
    | "TRADE_EXECUTED";
  title: string;
  message: string;
  isRead: boolean;
  playerId: string | null;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  image: string;
  returnPercent: number;
  portfolioValue: number;
  bestPick: string;
  isPremium: boolean;
}

export interface AIInsight {
  fairValue: number;
  currentPrice: number;
  upsidePercent: number;
  verdict: "Undervalued" | "Fair Value" | "Overvalued";
  transferProbability: number; // 0-100
  formTrend: "Rising" | "Declining" | "Stable";
  riskRating: "Low" | "Medium" | "High";
  confidence: "High" | "Medium" | "Low";
  summary: string;
  keyFactors: string[];
  riskFactors: string[];
  recommendation: "STRONG BUY" | "BUY" | "HOLD" | "SELL";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  image: string;
  walletAddress: string | null;
  virtualBalance: number;
  isPremium: boolean;
}

export interface TradeRequest {
  playerId: string;
  shares: number;
  mode: TradeMode;
}

export interface TradeResult {
  success: boolean;
  transaction?: Transaction;
  newBalance?: number;
  newPrice?: number;
  error?: string;
}

export interface FuturesPosition {
  id: string;
  playerId: string;
  player: Player;
  side: FuturesSide;
  size: number; // shares
  leverage: number;
  entryPrice: number;
  markPrice: number; // current price
  margin: number; // collateral locked
  liquidationPrice: number;
  notional: number; // size * entryPrice
  unrealizedPnl: number;
  pnlPercent: number; // vs margin
  status: PositionStatus;
  openedAt: string;
}

export interface FuturesOpenRequest {
  playerId: string;
  side: FuturesSide;
  size: number;
  leverage: number;
}

export interface FuturesResult {
  success: boolean;
  position?: FuturesPosition;
  newBalance?: number;
  realizedPnl?: number;
  error?: string;
}

export type IpoStatus = "UPCOMING" | "LIVE" | "RECENT";

export interface IpoListing {
  id: string;
  name: string;
  club: string;
  position: Position;
  nationalityCode: string;
  imageUrl: string;
  status: IpoStatus;
  ipoPrice: number;
  // upcoming
  listingDate?: string;
  // live
  sharesTotal?: number;
  sharesSold?: number;
  endsAt?: string;
  // recent — links to a tradable player
  slug?: string;
  currentPrice?: number;
  gainPercent?: number;
}

export interface MarketStats {
  totalMarketCap: number;
  totalVolume24h: number;
  activePlayers: number;
  topGainer: Player | null;
  topLoser: Player | null;
  marketSentiment: number; // -100..100
}
