/* eslint-disable */
// Open ONE new presale on the EXISTING FootballIPO contract (no redeploy).
// Deploys a fresh PlayerToken, mints the pool, approves, and createSale()s it.
//
// Pass the player via env vars, then run:
//   IPO_NAME="Lamine Yamal" IPO_SYMBOL='$YAMAL2' IPO_CLUB="FC Barcelona" \
//   IPO_POS=FWD IPO_NAT=es IPO_POOL=1000000 IPO_DAYS=7 npm run add:ipo
//
// Defaults: IPO_POOL=1000000 shares, IPO_DAYS=7, IPO_POS=FWD.

const hre = require("hardhat");
const fs = require("fs");

const SHARES = (n) => BigInt(n) * 10n ** 18n;

async function main() {
  const ipoAddr = process.env.NEXT_PUBLIC_FOOTBALL_IPO_ADDRESS;
  if (!ipoAddr) throw new Error("Set NEXT_PUBLIC_FOOTBALL_IPO_ADDRESS in .env");

  const name = process.env.IPO_NAME;
  const symbol = process.env.IPO_SYMBOL;
  if (!name || !symbol) throw new Error("Set IPO_NAME and IPO_SYMBOL");

  const club = process.env.IPO_CLUB || "";
  const pos = process.env.IPO_POS || "FWD";
  const nat = process.env.IPO_NAT || "";
  const poolWhole = Number(process.env.IPO_POOL || "1000000");
  const days = Number(process.env.IPO_DAYS || "7");
  const pool = SHARES(poolWhole);

  const [deployer] = await hre.ethers.getSigners();
  const ipo = await hre.ethers.getContractAt("FootballIPO", ipoAddr);

  console.log(`\n🪙 Opening presale for "${name}" on FootballIPO ${ipoAddr}`);

  // 1. fresh share token, full pool minted to deployer
  const PlayerToken = await hre.ethers.getContractFactory("PlayerToken");
  const tokenId = Math.floor(Date.now() / 1000) % 1_000_000;
  const token = await PlayerToken.deploy(`${name} Shares`, symbol, tokenId, deployer.address);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  await (await token.mint(deployer.address, pool)).wait();

  // 2. approve + open the sale
  await (await token.approve(ipoAddr, pool)).wait();
  const endsAt = Math.floor(Date.now() / 1000) + days * 86400;
  const receipt = await (await ipo.createSale(tokenAddr, pool, endsAt)).wait();
  const ev = receipt.logs
    .map((l) => { try { return ipo.interface.parseLog(l); } catch { return null; } })
    .find((e) => e && e.name === "SaleCreated");
  const saleId = ev ? Number(ev.args.saleId) : null;

  // record into deployments.json
  let out = {};
  try { out = JSON.parse(fs.readFileSync("deployments.json", "utf8")); } catch {}
  out.ipoSales = out.ipoSales || [];
  out.ipoSales.push({ symbol, token: tokenAddr, saleId, sharesForSale: pool.toString(), endsAt });
  fs.writeFileSync("deployments.json", JSON.stringify(out, null, 2));

  console.log(`  ✓ sale #${saleId} ${symbol} -> token ${tokenAddr} (closes in ${days}d)`);
  console.log("\n👉 Add this line to ON_CHAIN_SALES in lib/ipo.ts, then redeploy the frontend:\n");
  console.log(
    `  { saleId: ${saleId}, playerToken: "${tokenAddr}", name: "${name}", club: "${club}", position: "${pos}", nat: "${nat}" },`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
