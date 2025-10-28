import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther, zeroAddress } from "viem";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("KarmaToken", function () {
  async function deployKarmaTokenFixture() {
    const [owner, user1, user2, minter, burner] = await hre.viem.getWalletClients();
    
    const karmaToken = await hre.viem.deployContract("KarmaToken", [owner.account.address]);
    
    const publicClient = await hre.viem.getPublicClient();
    
    return {
      karmaToken,
      owner,
      user1,
      user2,
      minter,
      burner,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { karmaToken, owner } = await loadFixture(deployKarmaTokenFixture);
      
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      expect(await karmaToken.read.hasRole([DEFAULT_ADMIN_ROLE, owner.account.address])).to.be.true;
    });

    it("Should have correct token details", async function () {
      const { karmaToken } = await loadFixture(deployKarmaTokenFixture);
      
      expect(await karmaToken.read.name()).to.equal("Karma Token");
      expect(await karmaToken.read.symbol()).to.equal("KARMA");
      expect(await karmaToken.read.decimals()).to.equal(0);
    });

    it("Should grant initial roles to owner", async function () {
      const { karmaToken, owner } = await loadFixture(deployKarmaTokenFixture);
      
      expect(await karmaToken.read.isMinter([owner.account.address])).to.be.true;
      expect(await karmaToken.read.isBurner([owner.account.address])).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should mint tokens to user", async function () {
      const { karmaToken, owner, user1 } = await loadFixture(deployKarmaTokenFixture);
      
      const amount = BigInt(100);
      const reason = "Test minting";
      
      await karmaToken.write.mint([user1.account.address, amount, reason]);
      
      expect(await karmaToken.read.balanceOf([user1.account.address])).to.equal(amount);
      expect(await karmaToken.read.totalSupply()).to.equal(amount);
    });

    it("Should emit KarmaMinted event", async function () {
      const { karmaToken, user1, publicClient } = await loadFixture(deployKarmaTokenFixture);
      
      const amount = BigInt(50);
      const reason = "Event test";
      
      const hash = await karmaToken.write.mint([user1.account.address, amount, reason]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Check that the transaction was successful
      expect(receipt.status).to.equal("success");
    });

    it("Should revert when minting to zero address", async function () {
      const { karmaToken } = await loadFixture(deployKarmaTokenFixture);
      
      await expect(
        karmaToken.write.mint([zeroAddress, BigInt(100), "Test"])
      ).to.be.rejectedWith("KarmaToken: mint to zero address");
    });

    it("Should revert when minting zero amount", async function () {
      const { karmaToken, user1 } = await loadFixture(deployKarmaTokenFixture);
      
      await expect(
        karmaToken.write.mint([user1.account.address, BigInt(0), "Test"])
      ).to.be.rejectedWith("KarmaToken: mint amount must be positive");
    });

    it("Should revert when non-minter tries to mint", async function () {
      const { karmaToken, user1, user2 } = await loadFixture(deployKarmaTokenFixture);
      
      await expect(
        karmaToken.write.mint([user1.account.address, BigInt(100), "Test"], {
          account: user2.account,
        })
      ).to.be.rejected;
    });
  });

  describe("Burning", function () {
    it("Should burn tokens from user", async function () {
      const { karmaToken, user1 } = await loadFixture(deployKarmaTokenFixture);
      
      const mintAmount = BigInt(100);
      const burnAmount = BigInt(30);
      
      // First mint some tokens
      await karmaToken.write.mint([user1.account.address, mintAmount, "Setup"]);
      
      // Then burn some
      await karmaToken.write.burn([user1.account.address, burnAmount, "Test burn"]);
      
      expect(await karmaToken.read.balanceOf([user1.account.address])).to.equal(mintAmount - burnAmount);
      expect(await karmaToken.read.totalSupply()).to.equal(mintAmount - burnAmount);
    });

    it("Should allow self-burning", async function () {
      const { karmaToken, user1 } = await loadFixture(deployKarmaTokenFixture);
      
      const mintAmount = BigInt(100);
      const burnAmount = BigInt(25);
      
      // Mint tokens to user1
      await karmaToken.write.mint([user1.account.address, mintAmount, "Setup"]);
      
      // User1 burns their own tokens
      await karmaToken.write.burnSelf([burnAmount], {
        account: user1.account,
      });
      
      expect(await karmaToken.read.balanceOf([user1.account.address])).to.equal(mintAmount - burnAmount);
    });

    it("Should revert when burning more than balance", async function () {
      const { karmaToken, user1 } = await loadFixture(deployKarmaTokenFixture);
      
      const mintAmount = BigInt(50);
      const burnAmount = BigInt(100);
      
      await karmaToken.write.mint([user1.account.address, mintAmount, "Setup"]);
      
      await expect(
        karmaToken.write.burn([user1.account.address, burnAmount, "Test"])
      ).to.be.rejectedWith("KarmaToken: insufficient balance to burn");
    });

    it("Should revert when non-burner tries to burn", async function () {
      const { karmaToken, user1, user2 } = await loadFixture(deployKarmaTokenFixture);
      
      await karmaToken.write.mint([user1.account.address, BigInt(100), "Setup"]);
      
      await expect(
        karmaToken.write.burn([user1.account.address, BigInt(50), "Test"], {
          account: user2.account,
        })
      ).to.be.rejected;
    });
  });

  describe("Batch Minting", function () {
    it("Should batch mint to multiple users", async function () {
      const { karmaToken, user1, user2 } = await loadFixture(deployKarmaTokenFixture);
      
      const recipients = [user1.account.address, user2.account.address];
      const amounts = [BigInt(100), BigInt(200)];
      const reason = "Batch test";
      
      await karmaToken.write.batchMint([recipients, amounts, reason]);
      
      expect(await karmaToken.read.balanceOf([user1.account.address])).to.equal(BigInt(100));
      expect(await karmaToken.read.balanceOf([user2.account.address])).to.equal(BigInt(200));
      expect(await karmaToken.read.totalSupply()).to.equal(BigInt(300));
    });

    it("Should revert on array length mismatch", async function () {
      const { karmaToken, user1, user2 } = await loadFixture(deployKarmaTokenFixture);
      
      const recipients = [user1.account.address, user2.account.address];
      const amounts = [BigInt(100)]; // Mismatched length
      
      await expect(
        karmaToken.write.batchMint([recipients, amounts, "Test"])
      ).to.be.rejectedWith("KarmaToken: arrays length mismatch");
    });
  });

  describe("Access Control", function () {
    it("Should grant and revoke minter role", async function () {
      const { karmaToken, owner, minter } = await loadFixture(deployKarmaTokenFixture);
      
      const MINTER_ROLE = await karmaToken.read.MINTER_ROLE();
      
      // Grant minter role
      await karmaToken.write.grantRole([MINTER_ROLE, minter.account.address]);
      expect(await karmaToken.read.isMinter([minter.account.address])).to.be.true;
      
      // Revoke minter role
      await karmaToken.write.revokeRole([MINTER_ROLE, minter.account.address]);
      expect(await karmaToken.read.isMinter([minter.account.address])).to.be.false;
    });

    it("Should grant and revoke burner role", async function () {
      const { karmaToken, owner, burner } = await loadFixture(deployKarmaTokenFixture);
      
      const BURNER_ROLE = await karmaToken.read.BURNER_ROLE();
      
      // Grant burner role
      await karmaToken.write.grantRole([BURNER_ROLE, burner.account.address]);
      expect(await karmaToken.read.isBurner([burner.account.address])).to.be.true;
      
      // Revoke burner role
      await karmaToken.write.revokeRole([BURNER_ROLE, burner.account.address]);
      expect(await karmaToken.read.isBurner([burner.account.address])).to.be.false;
    });
  });

  describe("Pausable", function () {
    it("Should pause and unpause transfers", async function () {
      const { karmaToken, owner, user1, user2 } = await loadFixture(deployKarmaTokenFixture);
      
      // Mint some tokens
      await karmaToken.write.mint([user1.account.address, BigInt(100), "Setup"]);
      
      // Pause the contract
      await karmaToken.write.pause();
      
      // Transfers should be blocked
      await expect(
        karmaToken.write.transfer([user2.account.address, BigInt(50)], {
          account: user1.account,
        })
      ).to.be.rejected;
      
      // Unpause the contract
      await karmaToken.write.unpause();
      
      // Transfers should work again
      await karmaToken.write.transfer([user2.account.address, BigInt(50)], {
        account: user1.account,
      });
      
      expect(await karmaToken.read.balanceOf([user2.account.address])).to.equal(BigInt(50));
    });

    it("Should block minting when paused", async function () {
      const { karmaToken, user1 } = await loadFixture(deployKarmaTokenFixture);
      
      await karmaToken.write.pause();
      
      await expect(
        karmaToken.write.mint([user1.account.address, BigInt(100), "Test"])
      ).to.be.rejected;
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for minting", async function () {
      const { karmaToken, user1, publicClient } = await loadFixture(deployKarmaTokenFixture);
      
      const hash = await karmaToken.write.mint([user1.account.address, BigInt(100), "Gas test"]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Gas should be reasonable (less than 100k for a mint)
      expect(receipt.gasUsed).to.be.lessThan(BigInt(100000));
    });

    it("Should have reasonable gas costs for batch minting", async function () {
      const { karmaToken, user1, user2, publicClient } = await loadFixture(deployKarmaTokenFixture);
      
      const recipients = [user1.account.address, user2.account.address];
      const amounts = [BigInt(100), BigInt(200)];
      
      const hash = await karmaToken.write.batchMint([recipients, amounts, "Batch gas test"]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Batch minting should be more efficient than individual mints
      expect(receipt.gasUsed).to.be.lessThan(BigInt(200000));
    });
  });
});