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
  const usdc = new hre.ethers.Contract(usdcAddr, ERC20_ABI, signer);
  const decimals = await usdc.decimals().catch(() => 6);
  const amount = hre.ethers.parseUnits(String(amountHuman), decimals);

  const bal = await usdc.balanceOf(signer.address);
  console.log(`Deployer ${signer.address}`);
  console.log(`USDC balance: ${hre.ethers.formatUnits(bal, decimals)}`);
  if (bal < amount) {
    throw new Error(
      `Not enough USDC. Need ${amountHuman}, have ${hre.ethers.formatUnits(bal, decimals)}. ` +
        `Get more at https://faucet.circle.com (Arc Testnet).`
    );
  }

  console.log(`Transferring ${amountHuman} USDC -> FootballMarket ${market} …`);
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
