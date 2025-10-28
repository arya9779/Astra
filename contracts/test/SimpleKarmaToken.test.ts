import { expect } from "chai";
import hre from "hardhat";

describe("KarmaToken - Simple Tests", function () {
  it("Should deploy KarmaToken contract", async function () {
    const [owner] = await hre.viem.getWalletClients();
    
    const karmaToken = await hre.viem.deployContract("KarmaToken", [owner.account.address]);
    
    expect(await karmaToken.read.name()).to.equal("Karma Token");
    expect(await karmaToken.read.symbol()).to.equal("KARMA");
    expect(await karmaToken.read.decimals()).to.equal(0);
  });

  it("Should mint tokens", async function () {
    const [owner, user1] = await hre.viem.getWalletClients();
    
    const karmaToken = await hre.viem.deployContract("KarmaToken", [owner.account.address]);
    
    const amount = BigInt(100);
    const reason = "Test minting";
    
    await karmaToken.write.mint([user1.account.address, amount, reason]);
    
    expect(await karmaToken.read.balanceOf([user1.account.address])).to.equal(amount);
  });

  it("Should burn tokens", async function () {
    const [owner, user1] = await hre.viem.getWalletClients();
    
    const karmaToken = await hre.viem.deployContract("KarmaToken", [owner.account.address]);
    
    const mintAmount = BigInt(100);
    const burnAmount = BigInt(30);
    
    // First mint some tokens
    await karmaToken.write.mint([user1.account.address, mintAmount, "Setup"]);
    
    // Then burn some
    await karmaToken.write.burn([user1.account.address, burnAmount, "Test burn"]);
    
    expect(await karmaToken.read.balanceOf([user1.account.address])).to.equal(mintAmount - burnAmount);
  });
});