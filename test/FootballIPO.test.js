/* eslint-disable */
const { expect } = require("chai");
const { ethers } = require("hardhat");

const USDC = (n) => BigInt(Math.round(n * 1e6));
const SHARES = (n) => BigInt(n) * 10n ** 18n;

describe("FootballIPO", () => {
  let usdc, token, ipo, owner, treasury, alice, bob;
  const POOL = SHARES(1_000_000);

  beforeEach(async () => {
    [owner, treasury, alice, bob] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();

    // a standalone player token, fully minted to the owner
    const PlayerToken = await ethers.getContractFactory("PlayerToken");
    token = await PlayerToken.deploy("Rising Star Shares", "$STAR", 1, owner.address);
    await token.waitForDeployment();
    await token.mint(owner.address, POOL);

    const FootballIPO = await ethers.getContractFactory("FootballIPO");
    ipo = await FootballIPO.deploy(await usdc.getAddress(), treasury.address);
    await ipo.waitForDeployment();

    // fund buyers
    await usdc.faucet(alice.address, USDC(100000));
    await usdc.faucet(bob.address, USDC(100000));
    await usdc.connect(alice).approve(await ipo.getAddress(), USDC(1_000_000));
    await usdc.connect(bob).approve(await ipo.getAddress(), USDC(1_000_000));
  });

  async function openSale(durationSec = 3600) {
    await token.approve(await ipo.getAddress(), POOL);
    const endsAt = (await ethers.provider.getBlock("latest")).timestamp + durationSec;
    await ipo.createSale(await token.getAddress(), POOL, endsAt);
    return endsAt;
  }

  it("rejects zero treasury at deploy", async () => {
    const FootballIPO = await ethers.getContractFactory("FootballIPO");
    await expect(
      FootballIPO.deploy(await usdc.getAddress(), ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(ipo, "ZeroAddress");
  });

  it("pulls pool tokens into the contract on createSale", async () => {
    await openSale();
    expect(await token.balanceOf(await ipo.getAddress())).to.equal(POOL);
  });

  it("clearing price = total raised ÷ shares for sale", async () => {
    await openSale();
    await ipo.connect(alice).deposit(1, USDC(6000)); // 6,000 USDC
    await ipo.connect(bob).deposit(1, USDC(4000)); // 4,000 USDC → 10,000 raised
    // 10,000 USDC / 1,000,000 shares = $0.01/share = 10000 (6dp)
    expect(await ipo.clearingPrice(1)).to.equal(USDC(0.01));
  });

  it("allocates pro-rata and lets buyers claim", async () => {
    await openSale(100);
    await ipo.connect(alice).deposit(1, USDC(7500)); // 75%
    await ipo.connect(bob).deposit(1, USDC(2500)); // 25%

    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine", []);
    await ipo.finalize(1);

    expect(await usdc.balanceOf(treasury.address)).to.equal(USDC(10000));

    await ipo.connect(alice).claim(1);
    await ipo.connect(bob).claim(1);
    expect(await token.balanceOf(alice.address)).to.equal(SHARES(750_000));
    expect(await token.balanceOf(bob.address)).to.equal(SHARES(250_000));
  });

  it("blocks deposits after the deadline and claims before finalize", async () => {
    await openSale(100);
    await ipo.connect(alice).deposit(1, USDC(1000));
    await expect(ipo.connect(alice).claim(1)).to.be.revertedWithCustomError(ipo, "NotFinalized");

    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine", []);
    await expect(ipo.connect(bob).deposit(1, USDC(1000))).to.be.revertedWithCustomError(ipo, "SaleClosed");
  });

  it("prevents double claims", async () => {
    await openSale(100);
    await ipo.connect(alice).deposit(1, USDC(1000));
    await ethers.provider.send("evm_increaseTime", [200]);
    await ethers.provider.send("evm_mine", []);
    await ipo.finalize(1);
    await ipo.connect(alice).claim(1);
    await expect(ipo.connect(alice).claim(1)).to.be.revertedWithCustomError(ipo, "AlreadyClaimed");
  });
});
