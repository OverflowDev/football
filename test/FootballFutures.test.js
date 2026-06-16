/* eslint-disable */
const { expect } = require("chai");
const { ethers } = require("hardhat");

const USDC = (n) => BigInt(Math.round(n * 1e6)); // 6 decimals
const SHARES = (n) => BigInt(n) * 10n ** 18n; // 18 decimals

describe("FootballFutures", () => {
  let usdc, market, futures, owner, treasury, trader, token;

  beforeEach(async () => {
    [owner, treasury, trader] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const FootballMarket = await ethers.getContractFactory("FootballMarket");
    market = await FootballMarket.deploy(await usdc.getAddress(), treasury.address);
    await market.waitForDeployment();

    const tx = await market.deployPlayerToken("Player X", "$X", USDC(10)); // $10/share
    const receipt = await tx.wait();
    const ev = receipt.logs
      .map((l) => { try { return market.interface.parseLog(l); } catch { return null; } })
      .find((e) => e && e.name === "PlayerTokenDeployed");
    token = ev.args.playerToken;

    const FootballFutures = await ethers.getContractFactory("FootballFutures");
    futures = await FootballFutures.deploy(await usdc.getAddress(), await market.getAddress(), treasury.address);
    await futures.waitForDeployment();

    // fund the trader + the pool
    await usdc.faucet(trader.address, USDC(10000));
    await usdc.connect(trader).approve(await futures.getAddress(), USDC(1_000_000));
    await usdc.faucet(owner.address, USDC(100000));
    await usdc.approve(await futures.getAddress(), USDC(1_000_000));
    await futures.fundPool(USDC(50000));
  });

  it("rejects invalid leverage and zero size", async () => {
    await expect(futures.connect(trader).openPosition(token, true, SHARES(10), 0)).to.be.revertedWithCustomError(futures, "InvalidLeverage");
    await expect(futures.connect(trader).openPosition(token, true, SHARES(10), 20)).to.be.revertedWithCustomError(futures, "InvalidLeverage");
    await expect(futures.connect(trader).openPosition(token, true, 0, 2)).to.be.revertedWithCustomError(futures, "ZeroSize");
  });

  it("opens a long: pulls margin + fee, charges 0.5% to treasury", async () => {
    // 10 shares @ $10 = $100 notional, 2x → margin $50, fee $0.50
    const before = await usdc.balanceOf(trader.address);
    await futures.connect(trader).openPosition(token, true, SHARES(10), 2);
    const after = await usdc.balanceOf(trader.address);
    expect(before - after).to.equal(USDC(50.5));
    expect(await usdc.balanceOf(treasury.address)).to.equal(USDC(0.5));

    const pos = await futures.positions(1);
    expect(pos.owner).to.equal(trader.address);
    expect(pos.isLong).to.equal(true);
    expect(pos.margin).to.equal(USDC(50));
  });

  it("long profits when price rises (closes with margin + pnl)", async () => {
    await futures.connect(trader).openPosition(token, true, SHARES(10), 2); // margin 50
    await market.updatePrice(token, USDC(13)); // +$3/share × 10 = +$30 pnl
    const before = await usdc.balanceOf(trader.address);
    await futures.connect(trader).closePosition(1);
    const after = await usdc.balanceOf(trader.address);
    expect(after - before).to.equal(USDC(80)); // 50 margin + 30 pnl
  });

  it("short profits when price falls", async () => {
    await futures.connect(trader).openPosition(token, false, SHARES(10), 2); // short, margin 50
    await market.updatePrice(token, USDC(7)); // -$3 → short +$30
    const before = await usdc.balanceOf(trader.address);
    await futures.connect(trader).closePosition(1);
    const after = await usdc.balanceOf(trader.address);
    expect(after - before).to.equal(USDC(80));
  });

  it("liquidates an underwater position (payout 0)", async () => {
    await futures.connect(trader).openPosition(token, true, SHARES(10), 2); // margin 50, liq when -$50 → price 5
    await market.updatePrice(token, USDC(4)); // -$6×10 = -$60 loss > 50 margin
    const [pnl, liq] = await futures.positionValue(1);
    expect(liq).to.equal(true);
    await expect(futures.connect(owner).liquidate(1)).to.emit(futures, "PositionLiquidated");
    // closing a liquidated (now closed) position reverts
    await expect(futures.connect(trader).closePosition(1)).to.be.revertedWithCustomError(futures, "NotOpen");
  });

  it("cannot close someone else's position", async () => {
    await futures.connect(trader).openPosition(token, true, SHARES(10), 2);
    await expect(futures.connect(owner).closePosition(1)).to.be.revertedWithCustomError(futures, "NotOwner");
  });

  it("rejects a zero treasury at deploy", async () => {
    const FootballFutures = await ethers.getContractFactory("FootballFutures");
    await expect(
      FootballFutures.deploy(await usdc.getAddress(), await market.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(futures, "ZeroAddress");
  });
});
