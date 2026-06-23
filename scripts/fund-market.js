/* eslint-disable */
// Seed USDC liquidity into the FootballMarket so early SELLs can be paid out.
// The market pays sellers from its own USDC balance; buys refill it over time.
//
// Usage:
//   FUND_USDC=100 npx hardhat run scripts/fund-market.js --network arcTestnet
// (defaults to 100 USDC). Requires the deployer to hold that much testnet USDC.

const hre = require("hardhat");

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const market = process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS;
  const usdcAddr = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  if (!market) throw new Error("Set NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS in .env");
  if (!usdcAddr) throw new Error("Set NEXT_PUBLIC_USDC_ADDRESS in .env");

  const amountHuman = Number(process.env.FUND_USDC || "100");
  const gasBuffer = Number(process.env.GAS_BUFFER_USDC || "3"); // keep some USDC for gas
  const usdc = new hre.ethers.Contract(usdcAddr, ERC20_ABI, signer);
  const decimals = await usdc.decimals().catch(() => 6);

  const bal = await usdc.balanceOf(signer.address);
  const balHuman = Number(hre.ethers.formatUnits(bal, decimals));
  console.log(`Deployer ${signer.address}`);
  console.log(`USDC balance: ${balHuman}`);

  // Best-effort: never spend the gas buffer; seed min(requested, balance - buffer).
  let seedHuman = amountHuman;
  const maxSeed = Math.floor((balHuman - gasBuffer) * 1e6) / 1e6;
  if (maxSeed <= 0) {
    throw new Error(
      `Balance too low to seed (have ${balHuman}, keep ${gasBuffer} for gas). ` +
        `Top up at https://faucet.circle.com (Arc Testnet).`
    );
  }
  if (seedHuman > maxSeed) {
    console.warn(`⚠️  Seeding ${maxSeed} USDC (capped to balance − ${gasBuffer} gas buffer; requested ${amountHuman}).`);
    seedHuman = maxSeed;
  }
  const amount = hre.ethers.parseUnits(String(seedHuman), decimals);

  console.log(`Transferring ${seedHuman} USDC -> FootballMarket ${market} …`);
  const tx = await usdc.transfer(market, amount);
  await tx.wait();

  const marketBal = await usdc.balanceOf(market);
  console.log(`✅ Done. Market USDC balance is now ${hre.ethers.formatUnits(marketBal, decimals)}`);
  console.log(`   tx: ${tx.hash}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
