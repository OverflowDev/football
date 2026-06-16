/* eslint-disable */
// Deploy ONLY FootballFutures, reusing the existing FootballMarket + USDC.
// Non-destructive: does not touch the market or player tokens.
//
//   npx hardhat run scripts/deploy-futures.js --network arcTestnet

const hre = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;

  const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const market = process.env.NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS;
  if (!usdc) throw new Error("Set NEXT_PUBLIC_USDC_ADDRESS in .env");
  if (!market) throw new Error("Set NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS in .env");

  console.log(`\n🚀 Deploying FootballFutures to ${network} with ${deployer.address}`);
  console.log(`   market: ${market}\n   usdc:   ${usdc}`);

  const FootballFutures = await hre.ethers.getContractFactory("FootballFutures");
  const futures = await FootballFutures.deploy(usdc, market, deployer.address);
  await futures.waitForDeployment();
  const addr = await futures.getAddress();
  console.log("  ✓ FootballFutures:", addr);

  // merge into deployments.json if present
  let out = {};
  try {
    out = JSON.parse(fs.readFileSync("deployments.json", "utf8"));
  } catch {}
  out.footballFutures = addr;
  out.futuresDeployedAt = new Date().toISOString();
  fs.writeFileSync("deployments.json", JSON.stringify(out, null, 2));

  console.log("\n✅ Done. Set in your .env:");
  console.log(`  NEXT_PUBLIC_FOOTBALL_FUTURES_ADDRESS=${addr}`);
  console.log("\nThen fund the payout pool (winning P&L is paid from it):");
  console.log(`  FUTURES_FUND_USDC=500 npx hardhat run scripts/fund-futures.js --network ${network}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
