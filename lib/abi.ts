// Minimal ABI for the FootballMarket contract — the subset the frontend
// reads/writes via wagmi. Full ABI is emitted to artifacts/ on compile.

export const FOOTBALL_MARKET_ABI = [
  {
    type: "function",
    name: "getPlayerPrice",
    stateMutability: "view",
    inputs: [{ name: "playerToken", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getUserPortfolio",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "tokens", type: "address[]" },
      { name: "balances", type: "uint256[]" },
    ],
  },
  {
    type: "function",
    name: "buyShares",
    stateMutability: "nonpayable",
    inputs: [
      { name: "playerToken", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "sellShares",
    stateMutability: "nonpayable",
    inputs: [
      { name: "playerToken", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "claimDividends",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "listExternalToken",
    stateMutability: "nonpayable",
    inputs: [
      { name: "playerToken", type: "address" },
      { name: "initialPrice", type: "uint256" },
      { name: "inventory", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updatePrice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "playerToken", type: "address" },
      { name: "newPrice", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updatePrices",
    stateMutability: "nonpayable",
    inputs: [
      { name: "playerTokens", type: "address[]" },
      { name: "newPrices", type: "uint256[]" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "SharesBought",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "playerToken", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "price", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SharesSold",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "playerToken", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "price", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PriceUpdated",
    inputs: [
      { name: "playerToken", type: "address", indexed: true },
      { name: "oldPrice", type: "uint256", indexed: false },
      { name: "newPrice", type: "uint256", indexed: false },
    ],
  },
] as const;

export const FOOTBALL_FUTURES_ABI = [
  {
    type: "function",
    name: "openPosition",
    stateMutability: "nonpayable",
    inputs: [
      { name: "playerToken", type: "address" },
      { name: "isLong", type: "bool" },
      { name: "size", type: "uint256" },
      { name: "leverage", type: "uint8" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "closePosition",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getUserPositions",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "positions",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "playerToken", type: "address" },
      { name: "isLong", type: "bool" },
      { name: "size", type: "uint256" },
      { name: "leverage", type: "uint8" },
      { name: "entryPrice", type: "uint256" },
      { name: "margin", type: "uint256" },
      { name: "open", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "positionValue",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      { name: "pnl", type: "int256" },
      { name: "liquidatable", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "PositionOpened",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "playerToken", type: "address", indexed: true },
      { name: "isLong", type: "bool", indexed: false },
      { name: "size", type: "uint256", indexed: false },
      { name: "leverage", type: "uint8", indexed: false },
      { name: "entryPrice", type: "uint256", indexed: false },
      { name: "margin", type: "uint256", indexed: false },
    ],
  },
] as const;

export const FOOTBALL_IPO_ABI = [
  {
    type: "function",
    name: "nextSaleId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "createSale",
    stateMutability: "nonpayable",
    inputs: [
      { name: "playerToken", type: "address" },
      { name: "sharesForSale", type: "uint256" },
      { name: "endsAt", type: "uint64" },
    ],
    outputs: [{ name: "saleId", type: "uint256" }],
  },
  {
    type: "function",
    name: "sales",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "playerToken", type: "address" },
      { name: "sharesForSale", type: "uint256" },
      { name: "endsAt", type: "uint64" },
      { name: "totalRaised", type: "uint256" },
      { name: "finalized", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "clearingPrice",
    stateMutability: "view",
    inputs: [{ name: "saleId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allocationOf",
    stateMutability: "view",
    inputs: [
      { name: "saleId", type: "uint256" },
      { name: "user", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "contributions",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "claimed",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "saleId", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "finalize",
    stateMutability: "nonpayable",
    inputs: [{ name: "saleId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "saleId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;
