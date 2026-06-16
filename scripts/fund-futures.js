/* eslint-disable */
// Seed the FootballFutures USDC payout pool (winning P&L is paid from it).
//   FUTURES_FUND_USDC=500 npx hardhat run scripts/fund-futures.js --network arcTestnet

const hre = require("hardhat");

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  const [signer] = await hre.ethers.getSigners();
  const usdcAddr = process.env.NEXT_PUBLIC_USDC_ADDRESS;
  const futuresAddr = process.env.NEXT_PUBLIC_FOOTBALL_FUTURES_ADDRESS;
  if (!usdcAddr) throw new Error("Set NEXT_PUBLIC_USDC_ADDRESS");
  if (!futuresAddr) throw new Error("Set NEXT_PUBLIC_FOOTBALL_FUTURES_ADDRESS");

  const amountHuman = Number(process.env.FUTURES_FUND_USDC || "500");
  const usdc = new hre.ethers.Contract(usdcAddr, ERC20_ABI, signer);
  const decimals = await usdc.decimals().catch(() => 6);
  const amount = hre.ethers.parseUnits(String(amountHuman), decimals);

  const futures = await hre.ethers.getContractAt("FootballFutures", futuresAddr);
  await (await usdc.approve(futuresAddr, amount)).wait();
  await (await futures.fundPool(amount)).wait();

  const bal = await usdc.balanceOf(futuresAddr);
  console.log(`✅ Funded pool. FootballFutures USDC balance: ${hre.ethers.formatUnits(bal, decimals)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
