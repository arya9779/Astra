import { expect } from "chai";
import hre from "hardhat";

describe("KarmaToken Basic Tests", function () {
  let karmaToken: any;
  let owner: any;
  let user1: any;

  beforeEach(async function () {
    [owner, user1] = await hre.viem.getWalletClients();
    karmaToken = await hre.viem.deployContract("KarmaToken", [owner.account.address]);
  });

  it("Should have correct token details", async function () {
    expect(await karmaToken.read.name()).to.equal("Karma Token");
    expect(await karmaToken.read.symbol()).to.equal("KARMA");
    expect(await karmaToken.read.decimals()).to.equal(0);
  });

  it("Should mint tokens successfully", async function () {
    const amount = BigInt(100);
    const reason = "Test minting";
    
    await karmaToken.write.mint([user1.account.address, amount, reason]);
    
    const balance = await karmaToken.read.balanceOf([user1.account.address]);
    expect(balance).to.equal(amount);
  });

  it("Should burn tokens successfully", async function () {
    const mintAmount = BigInt(100);
    const burnAmount = BigInt(30);
    
    // Mint tokens first
    await karmaToken.write.mint([user1.account.address, mintAmount, "Setup"]);
    
    // Burn tokens
    await karmaToken.write.burn([user1.account.address, burnAmount, "Test burn"]);
    
    const balance = await karmaToken.read.balanceOf([user1.account.address]);
    expect(balance).to.equal(mintAmount - burnAmount);
  });

  it("Should prevent minting to zero address", async function () {
    const zeroAddress = "0x0000000000000000000000000000000000000000";
    
    try {
      await karmaToken.write.mint([zeroAddress, BigInt(100), "Test"]);
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).to.include("KarmaToken: mint to zero address");
    }
  });

  it("Should prevent burning more than balance", async function () {
    const mintAmount = BigInt(50);
    const burnAmount = BigInt(100);
    
    await karmaToken.write.mint([user1.account.address, mintAmount, "Setup"]);
    
    try {
      await karmaToken.write.burn([user1.account.address, burnAmount, "Test"]);
      expect.fail("Should have thrown an error");
    } catch (error: any) {
      expect(error.message).to.include("KarmaToken: insufficient balance to burn");
    }
  });
});