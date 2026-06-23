/* eslint-disable */
const { expect } = require("chai");
const { ethers } = require("hardhat");

const USDC = (n) => BigInt(Math.round(n * 1e6)); // 6 decimals
const SHARES = (n) => BigInt(n) * 10n ** 18n; // 18 decimals

describe("FootballMarket", () => {
  let usdc, market, owner, treasury, user, token;

  beforeEach(async () => {
    [owner, treasury, user] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    const FootballMarket = await ethers.getContractFactory("FootballMarket");
    market = await FootballMarket.deploy(await usdc.getAddress(), treasury.address);
    await market.waitForDeployment();

    const tx = await market.deployPlayerToken("Player X", "$X", USDC(10)); // 10 USDC/share
    const receipt = await tx.wait();
    const ev = receipt.logs
      .map((l) => { try { return market.interface.parseLog(l); } catch { return null; } })
      .find((e) => e && e.name === "PlayerTokenDeployed");
    token = ev.args.playerToken;

    // fund the user with USDC and approve the market
    await usdc.faucet(user.address, USDC(1000));
    await usdc.connect(user).approve(await market.getAddress(), USDC(1000));
  });

  it("rejects a zero treasury at deploy", async () => {
    const FootballMarket = await ethers.getContractFactory("FootballMarket");
    await expect(
      FootballMarket.deploy(await usdc.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(market, "ZeroAddress");
  });

  it("buys shares, charges 0.5% fee, splits fee to treasury + dividend pool", async () => {
    const playerToken = await ethers.getContractAt("PlayerToken", token);

    await market.connect(user).buyShares(token, SHARES(10)); // cost 100 USDC, fee 0.5

    expect(await playerToken.balanceOf(user.address)).to.equal(SHARES(10));
    // fee 0.5 USDC; 10% (0.05) to dividend pool, 0.45 to treasury
    expect(await usdc.balanceOf(treasury.address)).to.equal(USDC(0.45));
    expect(await market.dividendPool()).to.equal(USDC(0.05));
  });

  it("sells shares back for USDC minus fee", async () => {
    const playerToken = await ethers.getContractAt("PlayerToken", token);
    await market.connect(user).buyShares(token, SHARES(10));

    await playerToken.connect(user).approve(await market.getAddress(), SHARES(10));
    const before = await usdc.balanceOf(user.address);
    await market.connect(user).sellShares(token, SHARES(10));
    const after = await usdc.balanceOf(user.address);

    // proceeds 100, fee 0.5 → +99.5 USDC
    expect(after - before).to.equal(USDC(99.5));
    expect(await playerToken.balanceOf(user.address)).to.equal(0n);
  });

  it("only the oracle role can update price", async () => {
    await expect(market.connect(user).updatePrice(token, USDC(12))).to.be.reverted;
    await market.connect(owner).updatePrice(token, USDC(12));
    expect(await market.getPlayerPrice(token)).to.equal(USDC(12));
  });

  it("reverts buying a non-existent market", async () => {
    await expect(
      market.connect(user).buyShares(ethers.ZeroAddress, SHARES(1))
    ).to.be.revertedWithCustomError(market, "MarketNotFound");
  });

  it("lists an external (IPO) token and makes it tradable", async () => {
    // a standalone token owned by `owner`, as an IPO would leave it
    const PlayerToken = await ethers.getContractFactory("PlayerToken");
    const ext = await PlayerToken.deploy("IPO Star Shares", "$STAR", 99, owner.address);
    await ext.waitForDeployment();
    const extAddr = await ext.getAddress();
    await ext.mint(owner.address, SHARES(500_000)); // inventory to seed

    // list at 10 USDC/share, seed 500k shares of inventory
    await ext.approve(await market.getAddress(), SHARES(500_000));
    await market.listExternalToken(extAddr, USDC(10), SHARES(500_000));

    expect(await market.getPlayerPrice(extAddr)).to.equal(USDC(10));
    expect(await ext.balanceOf(await market.getAddress())).to.equal(SHARES(500_000));

    // a user can now buy it on the spot market
    await market.connect(user).buyShares(extAddr, SHARES(10));
    expect(await ext.balanceOf(user.address)).to.equal(SHARES(10));
  });

  it("rejects listing a token that already has a market", async () => {
    await expect(
      market.listExternalToken(token, USDC(10), 0)
    ).to.be.revertedWithCustomError(market, "MarketAlreadyExists");
  });
});
