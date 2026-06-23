/* eslint-disable */
// Deploy FootballIPO and open on-chain presales for the live offerings.
// For each offering it deploys a fresh PlayerToken, mints the pool to the
// deployer, approves the IPO contract, and createSale()s it.
//
//   npx hardhat run scripts/deploy-ipo.js --network arcTestnet

const hre = require("hardhat");
const fs = require("fs");

const SHARES = (n) => BigInt(n) * 10n ** 18n;
const DAYS = (d) => Math.floor(Date.now() / 1000) + d * 86400;

// live presale players (must match lib/ipo.ts metadata order)
const SALES = [
  { name: "Rodrigo Mora Shares", symbol: "$MORA", pool: SHARES(1_000_000), endsInDays: 5 },
  { name: "Mathys Tel Shares", symbol: "$TEL", pool: SHARES(1_000_000), endsInDays: 6 },
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const usdc = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  if (!usdc) throw new Error("Set NEXT_PUBLIC_USDC_ADDRESS in .env");

  console.log(`\n🚀 Deploying FootballIPO with ${deployer.address}`);

  const FootballIPO = await hre.ethers.getContractFactory("FootballIPO");
  const ipo = await FootballIPO.deploy(usdc, deployer.address);
  await ipo.waitForDeployment();
  const ipoAddr = await ipo.getAddress();
  console.log("  ✓ FootballIPO:", ipoAddr);

  const PlayerToken = await hre.ethers.getContractFactory("PlayerToken");
  const opened = [];
  let tokenId = 100;
  for (const s of SALES) {
    const token = await PlayerToken.deploy(s.name, s.symbol, tokenId++, deployer.address);
    await token.waitForDeployment();
    const tokenAddr = await token.getAddress();
    await (await token.mint(deployer.address, s.pool)).wait();
    await (await token.approve(ipoAddr, s.pool)).wait();

    const endsAt = DAYS(s.endsInDays);
    const tx = await ipo.createSale(tokenAddr, s.pool, endsAt);
    const receipt = await tx.wait();
    const ev = receipt.logs
      .map((l) => { try { return ipo.interface.parseLog(l); } catch { return null; } })
      .find((e) => e && e.name === "SaleCreated");
    const saleId = ev ? Number(ev.args.saleId) : null;
    opened.push({ symbol: s.symbol, token: tokenAddr, saleId, sharesForSale: s.pool.toString(), endsAt });
    console.log(`    ✓ sale #${saleId} ${s.symbol} -> token ${tokenAddr} (closes in ${s.endsInDays}d)`);
  }

  let out = {};
  try { out = JSON.parse(fs.readFileSync("deployments.json", "utf8")); } catch {}
  out.footballIPO = ipoAddr;
  out.ipoSales = opened;
  out.ipoDeployedAt = new Date().toISOString();
  fs.writeFileSync("deployments.json", JSON.stringify(out, null, 2));

  console.log("\n✅ Done. Set in your .env:");
  console.log(`  NEXT_PUBLIC_FOOTBALL_IPO_ADDRESS=${ipoAddr}`);
  console.log("\nSales (wire these into lib/ipo.ts ON_CHAIN_SALES):");
  console.log(JSON.stringify(opened, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
