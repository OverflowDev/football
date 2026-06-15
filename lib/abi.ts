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
