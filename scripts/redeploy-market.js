/* eslint-disable */
// Redeploy FootballMarket (now with listExternalToken) + FootballFutures, and
// relaunch the spot player tokens on the new market. Keeps the existing
// PriceOracle and FootballIPO (those are independent).
//
//   npx hardhat run scripts/redeploy-market.js --network arcTestnet
//
// Optional: SEED_USDC=2 to seed buyback liquidity into the new market.

const hre = require("hardhat");
const fs = require("fs");

// Must match the spot players in lib/mock-data.ts (slug order below).
const LAUNCH_PLAYERS = [
  { slug: "lamine-yamal", name: "Lamine Yamal Shares", symbol: "$YAMAL", price: 95_000000 },
  { slug: "jude-bellingham", name: "Jude Bellingham Shares", symbol: "$BELLINGHAM", price: 88_000000 },
  { slug: "victor-osimhen", name: "Victor Osimhen Shares", symbol: "$OSIMHEN", price: 72_000000 },
  { slug: "erling-haaland", name: "Erling Haaland Shares", symbol: "$HAALAND", price: 102_000000 },
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  if (!usdc) throw new Error("Set NEXT_PUBLIC_USDC_ADDRESS in .env");

  console.log(`\n🔁 Redeploying market stack with ${deployer.address}`);

  const FootballMarket = await hre.ethers.getContractFactory("FootballMarket");
  const market = await FootballMarket.deploy(usdc, deployer.address);
  await market.waitForDeployment();
  const marketAddr = await market.getAddress();
  console.log("  ✓ FootballMarket:", marketAddr);

  const FootballFutures = await hre.ethers.getContractFactory("FootballFutures");
  const futures = await FootballFutures.deploy(usdc, marketAddr, deployer.address);
  await futures.waitForDeployment();
  const futuresAddr = await futures.getAddress();
  console.log("  ✓ FootballFutures:", futuresAddr);

  const players = [];
  for (const p of LAUNCH_PLAYERS) {
    const receipt = await (await market.deployPlayerToken(p.name, p.symbol, p.price)).wait();
    const ev = receipt.logs
      .map((l) => { try { return market.interface.parseLog(l); } catch { return null; } })
      .find((e) => e && e.name === "PlayerTokenDeployed");
    const token = ev ? ev.args.playerToken : "unknown";
    players.push({ ...p, token });
    console.log(`    ✓ ${p.symbol} -> ${token}`);
  }

  // optional buyback liquidity
  const seed = Number(process.env.SEED_USDC || "0");
  if (seed > 0) {
    const erc20 = await hre.ethers.getContractAt("IERC20", usdc);
    await (await erc20.transfer(marketAddr, BigInt(Math.round(seed * 1e6)))).wait();
    console.log(`  ✓ Seeded ${seed} USDC buyback liquidity`);
  }

  let out = {};
  try { out = JSON.parse(fs.readFileSync("deployments.json", "utf8")); } catch {}
  out.footballMarket = marketAddr;
  out.footballFutures = futuresAddr;
  out.players = players;
  out.marketRedeployedAt = new Date().toISOString();
  fs.writeFileSync("deployments.json", JSON.stringify(out, null, 2));

  console.log("\n✅ Done. Update .env:");
  console.log(`  NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS=${marketAddr}`);
  console.log(`  NEXT_PUBLIC_FOOTBALL_FUTURES_ADDRESS=${futuresAddr}`);
  console.log("\nUpdate the slug→token map in lib/mock-data.ts:");
  players.forEach((p) => console.log(`  "${p.slug}": { address: "${p.token}", tokenId: ${LAUNCH_PLAYERS.indexOf(LAUNCH_PLAYERS.find(x=>x.slug===p.slug))+1} },`));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
