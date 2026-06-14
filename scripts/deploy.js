/* eslint-disable */
// Hardhat deploy script for the FPI contracts.
// Usage:
//   npx hardhat run scripts/deploy.js --network baseSepolia
//   npx hardhat run scripts/deploy.js --network base
//
// On testnets it deploys a MockUSDC; on mainnet it expects NEXT_PUBLIC_USDC_ADDRESS.

const hre = require("hardhat");
const fs = require("fs");

// Known USDC addresses per network. On Arc, USDC is the NATIVE gas token and is
// exposed as a system ERC-20 (6-decimal interface) — never deploy a mock there.
const KNOWN_USDC = {
  arcTestnet: "0x3600000000000000000000000000000000000000",
  arc: process.env.NEXT_PUBLIC_USDC_ADDRESS || "",
  base: process.env.NEXT_PUBLIC_USDC_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

// Networks that have a real USDC already — skip MockUSDC deployment.
const HAS_NATIVE_USDC = new Set(["arc", "arcTestnet", "base"]);

// A few launch players to bootstrap the market.
const LAUNCH_PLAYERS = [
  { name: "Lamine Yamal Shares", symbol: "$YAMAL", price: 95_000000 },
  { name: "Jude Bellingham Shares", symbol: "$BELLINGHAM", price: 88_000000 },
  { name: "Victor Osimhen Shares", symbol: "$OSIMHEN", price: 72_000000 },
  { name: "Erling Haaland Shares", symbol: "$HAALAND", price: 102_000000 },
];

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const network = hre.network.name;
  console.log(`\n🚀 Deploying FPI to ${network} with ${deployer.address}`);

  // 1. USDC — prefer an explicit env override, then the known per-network USDC.
  let usdcAddress =
    process.env.NEXT_PUBLIC_USDC_ADDRESS || KNOWN_USDC[network] || "";

  if (!usdcAddress && !HAS_NATIVE_USDC.has(network)) {
    // Local / Base Sepolia etc. — spin up a faucet MockUSDC for testing.
    console.log("  Deploying MockUSDC…");
    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("  ✓ MockUSDC:", usdcAddress);
  }
  if (!usdcAddress) {
    throw new Error(
      `USDC address required for "${network}". Set NEXT_PUBLIC_USDC_ADDRESS in .env.`
    );
  }
  if (HAS_NATIVE_USDC.has(network)) {
    console.log(`  ✓ Using native USDC at ${usdcAddress} (gas token on Arc)`);
  }

  // 2. PriceOracle
  console.log("  Deploying PriceOracle…");
  const PriceOracle = await hre.ethers.getContractFactory("PriceOracle");
  const oracle = await PriceOracle.deploy(deployer.address);
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("  ✓ PriceOracle:", oracleAddress);

  // 3. FootballMarket
  console.log("  Deploying FootballMarket…");
  const FootballMarket = await hre.ethers.getContractFactory("FootballMarket");
  const market = await FootballMarket.deploy(usdcAddress, deployer.address);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("  ✓ FootballMarket:", marketAddress);

  // 4. Launch a few player tokens
  console.log("  Launching player tokens…");
  const deployed = [];
  for (const p of LAUNCH_PLAYERS) {
    const tx = await market.deployPlayerToken(p.name, p.symbol, p.price);
    const receipt = await tx.wait();
    const evt = receipt.logs
      .map((l) => {
        try {
          return market.interface.parseLog(l);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "PlayerTokenDeployed");
    const tokenAddr = evt ? evt.args.playerToken : "unknown";
    deployed.push({ ...p, token: tokenAddr });
    console.log(`    ✓ ${p.symbol} -> ${tokenAddr}`);
  }

  const out = {
    network,
    deployer: deployer.address,
    usdc: usdcAddress,
    priceOracle: oracleAddress,
    footballMarket: marketAddress,
    players: deployed,
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync("deployments.json", JSON.stringify(out, null, 2));
  console.log("\n✅ Done. Wrote deployments.json");
  console.log("\nSet in your .env:");
  console.log(`  NEXT_PUBLIC_FOOTBALL_MARKET_ADDRESS=${marketAddress}`);
  console.log(`  NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
