import { expect } from "chai";
import hre from "hardhat";
import { zeroAddress, parseEther } from "viem";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("TruthCampaign", function () {
  async function deployTruthCampaignFixture() {
    const [admin, brand, validator1, validator2, user1, user2] = await hre.viem.getWalletClients();
    
    const currentTime = await time.latest();
    const startTime = BigInt(currentTime + 3600); // 1 hour from now
    const endTime = BigInt(currentTime + 86400); // 24 hours from now
    
    const campaignParams = {
      name: "Test Campaign",
      description: "A test truth campaign",
      brand: brand.account.address,
      karmaReward: BigInt(100),
      totalBudget: BigInt(10000),
      maxParticipants: BigInt(100),
      startTime,
      endTime,
      requiresValidation: true,
      admin: admin.account.address,
    };
    
    const truthCampaign = await hre.viem.deployContract("TruthCampaign", [
      campaignParams.name,
      campaignParams.description,
      campaignParams.brand,
      campaignParams.karmaReward,
      campaignParams.totalBudget,
      campaignParams.maxParticipants,
      campaignParams.startTime,
      campaignParams.endTime,
      campaignParams.requiresValidation,
      campaignParams.admin,
    ]);
    
    const publicClient = await hre.viem.getPublicClient();
    
    return {
      truthCampaign,
      admin,
      brand,
      validator1,
      validator2,
      user1,
      user2,
      publicClient,
      campaignParams,
      currentTime,
    };
  }

  describe("Deployment", function () {
    it("Should set campaign parameters correctly", async function () {
      const { truthCampaign, campaignParams } = await loadFixture(deployTruthCampaignFixture);
      
      const campaignInfo = await truthCampaign.read.getCampaignInfo();
      
      expect(campaignInfo[0]).to.equal(campaignParams.name); // name
      expect(campaignInfo[1]).to.equal(campaignParams.description); // description
      expect(campaignInfo[2]).to.equal(campaignParams.brand); // brand
      expect(campaignInfo[3]).to.equal(campaignParams.karmaReward); // karmaReward
      expect(campaignInfo[4]).to.equal(campaignParams.totalBudget); // totalBudget
      expect(campaignInfo[5]).to.equal(campaignParams.totalBudget); // remainingBudget
      expect(campaignInfo[6]).to.equal(campaignParams.maxParticipants); // maxParticipants
      expect(campaignInfo[7]).to.equal(BigInt(0)); // currentParticipants
      expect(campaignInfo[10]).to.equal(true); // isActive
      expect(campaignInfo[11]).to.equal(campaignParams.requiresValidation); // requiresValidation
    });

    it("Should grant correct roles", async function () {
      const { truthCampaign, admin, brand } = await loadFixture(deployTruthCampaignFixture);
      
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      const BRAND_ROLE = await truthCampaign.read.BRAND_ROLE();
      
      expect(await truthCampaign.read.hasRole([DEFAULT_ADMIN_ROLE, admin.account.address])).to.be.true;
      expect(await truthCampaign.read.hasRole([BRAND_ROLE, brand.account.address])).to.be.true;
    });

    it("Should revert with invalid parameters", async function () {
      const [admin, brand] = await hre.viem.getWalletClients();
      const currentTime = await time.latest();
      
      // Invalid brand address
      await expect(
        hre.viem.deployContract("TruthCampaign", [
          "Test",
          "Description",
          zeroAddress,
          BigInt(100),
          BigInt(1000),
          BigInt(10),
          BigInt(currentTime + 3600),
          BigInt(currentTime + 86400),
          false,
          admin.account.address,
        ])
      ).to.be.rejectedWith("TruthCampaign: invalid brand address");

      // Zero karma reward
      await expect(
        hre.viem.deployContract("TruthCampaign", [
          "Test",
          "Description",
          brand.account.address,
          BigInt(0),
          BigInt(1000),
          BigInt(10),
          BigInt(currentTime + 3600),
          BigInt(currentTime + 86400),
          false,
          admin.account.address,
        ])
      ).to.be.rejectedWith("TruthCampaign: karma reward must be positive");

      // Insufficient budget
      await expect(
        hre.viem.deployContract("TruthCampaign", [
          "Test",
          "Description",
          brand.account.address,
          BigInt(1000),
          BigInt(100),
          BigInt(10),
          BigInt(currentTime + 3600),
          BigInt(currentTime + 86400),
          false,
          admin.account.address,
        ])
      ).to.be.rejectedWith("TruthCampaign: insufficient budget");
    });
  });

  describe("Participation", function () {
    it("Should allow participation when campaign is active", async function () {
      const { truthCampaign, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      // Fast forward to campaign start time
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      
      const contentHash = "test-content-hash-123";
      
      await truthCampaign.write.participate([contentHash], {
        account: user1.account,
      });
      
      const participation = await truthCampaign.read.getParticipation([user1.account.address]);
      expect(participation[0]).to.equal(user1.account.address); // participant
      expect(participation[2]).to.equal(contentHash); // contentHash
      expect(participation[3]).to.equal(false); // isValidated (requires validation)
      expect(participation[4]).to.equal(false); // hasClaimedReward
    });

    it("Should auto-validate when validation not required", async function () {
      const [admin, brand, user1] = await hre.viem.getWalletClients();
      const currentTime = await time.latest();
      
      // Deploy campaign without validation requirement
      const noValidationCampaign = await hre.viem.deployContract("TruthCampaign", [
        "No Validation Campaign",
        "Test campaign",
        brand.account.address,
        BigInt(100),
        BigInt(10000),
        BigInt(100),
        BigInt(currentTime + 100),
        BigInt(currentTime + 86400),
        false, // requiresValidation = false
        admin.account.address,
      ]);
      
      // Fast forward to campaign start
      await time.increaseTo(currentTime + 100);
      
      await noValidationCampaign.write.participate(["test-hash"], {
        account: user1.account,
      });
      
      const participation = await noValidationCampaign.read.getParticipation([user1.account.address]);
      expect(participation[3]).to.equal(true); // isValidated
      expect(participation[4]).to.equal(true); // hasClaimedReward
      expect(participation[5]).to.equal(BigInt(100)); // karmaEarned
    });

    it("Should revert participation before campaign starts", async function () {
      const { truthCampaign, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      await expect(
        truthCampaign.write.participate(["test-hash"], {
          account: user1.account,
        })
      ).to.be.rejectedWith("TruthCampaign: campaign not started");
    });

    it("Should revert participation after campaign ends", async function () {
      const { truthCampaign, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      // Fast forward past campaign end time
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.endTime + BigInt(1)));
      
      await expect(
        truthCampaign.write.participate(["test-hash"], {
          account: user1.account,
        })
      ).to.be.rejectedWith("TruthCampaign: campaign ended");
    });

    it("Should prevent duplicate participation", async function () {
      const { truthCampaign, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      
      // First participation
      await truthCampaign.write.participate(["test-hash-1"], {
        account: user1.account,
      });
      
      // Second participation should fail
      await expect(
        truthCampaign.write.participate(["test-hash-2"], {
          account: user1.account,
        })
      ).to.be.rejectedWith("TruthCampaign: already participated");
    });

    it("Should revert with empty content hash", async function () {
      const { truthCampaign, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      
      await expect(
        truthCampaign.write.participate([""], {
          account: user1.account,
        })
      ).to.be.rejectedWith("TruthCampaign: content hash required");
    });
  });

  describe("Validation", function () {
    it("Should validate participation", async function () {
      const { truthCampaign, admin, validator1, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      // Add validator
      await truthCampaign.write.addValidator([validator1.account.address]);
      
      // Start campaign and participate
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      await truthCampaign.write.participate(["test-hash"], {
        account: user1.account,
      });
      
      // Validate participation
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: validator1.account,
      });
      
      const participation = await truthCampaign.read.getParticipation([user1.account.address]);
      expect(participation[6]).to.equal(BigInt(1)); // validations count
    });

    it("Should require multiple validations for consensus", async function () {
      const { truthCampaign, admin, validator1, validator2, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      // Add validators
      await truthCampaign.write.addValidator([validator1.account.address]);
      await truthCampaign.write.addValidator([validator2.account.address]);
      
      // Start campaign and participate
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      await truthCampaign.write.participate(["test-hash"], {
        account: user1.account,
      });
      
      // First validation (not enough for consensus)
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: validator1.account,
      });
      
      let participation = await truthCampaign.read.getParticipation([user1.account.address]);
      expect(participation[3]).to.equal(false); // not yet validated
      
      // Second validation (still not enough)
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: validator2.account,
      });
      
      participation = await truthCampaign.read.getParticipation([user1.account.address]);
      expect(participation[3]).to.equal(false); // still not validated
      
      // Third validation (admin) - should reach consensus
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: admin.account,
      });
      
      participation = await truthCampaign.read.getParticipation([user1.account.address]);
      expect(participation[3]).to.equal(true); // now validated
    });

    it("Should prevent duplicate validation from same validator", async function () {
      const { truthCampaign, validator1, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      await truthCampaign.write.addValidator([validator1.account.address]);
      
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      await truthCampaign.write.participate(["test-hash"], {
        account: user1.account,
      });
      
      // First validation
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: validator1.account,
      });
      
      // Second validation from same validator should fail
      await expect(
        truthCampaign.write.validateParticipation([user1.account.address, false], {
          account: validator1.account,
        })
      ).to.be.rejectedWith("TruthCampaign: already validated by this validator");
    });

    it("Should revert validation for non-participant", async function () {
      const { truthCampaign, validator1, user2 } = await loadFixture(deployTruthCampaignFixture);
      
      await truthCampaign.write.addValidator([validator1.account.address]);
      
      await expect(
        truthCampaign.write.validateParticipation([user2.account.address, true], {
          account: validator1.account,
        })
      ).to.be.rejectedWith("TruthCampaign: participant not found");
    });
  });

  describe("Reward Claiming", function () {
    it("Should allow reward claiming after validation", async function () {
      const { truthCampaign, admin, validator1, validator2, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      // Setup validators and participation
      await truthCampaign.write.addValidator([validator1.account.address]);
      await truthCampaign.write.addValidator([validator2.account.address]);
      
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      await truthCampaign.write.participate(["test-hash"], {
        account: user1.account,
      });
      
      // Get enough validations for consensus
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: admin.account,
      });
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: validator1.account,
      });
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: validator2.account,
      });
      
      // Claim reward
      await truthCampaign.write.claimReward({
        account: user1.account,
      });
      
      const participation = await truthCampaign.read.getParticipation([user1.account.address]);
      expect(participation[4]).to.equal(true); // hasClaimedReward
      expect(participation[5]).to.equal(BigInt(100)); // karmaEarned
      
      // Check remaining budget
      const campaignInfo = await truthCampaign.read.getCampaignInfo();
      expect(campaignInfo[5]).to.equal(BigInt(9900)); // remainingBudget
    });

    it("Should prevent double claiming", async function () {
      const { truthCampaign, admin, validator1, validator2, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      // Setup and validate participation
      await truthCampaign.write.addValidator([validator1.account.address]);
      await truthCampaign.write.addValidator([validator2.account.address]);
      
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      await truthCampaign.write.participate(["test-hash"], {
        account: user1.account,
      });
      
      // Get consensus
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: admin.account,
      });
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: validator1.account,
      });
      await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: validator2.account,
      });
      
      // First claim
      await truthCampaign.write.claimReward({
        account: user1.account,
      });
      
      // Second claim should fail
      await expect(
        truthCampaign.write.claimReward({
          account: user1.account,
        })
      ).to.be.rejectedWith("TruthCampaign: reward already claimed");
    });

    it("Should revert claiming without validation", async function () {
      const { truthCampaign, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      await truthCampaign.write.participate(["test-hash"], {
        account: user1.account,
      });
      
      await expect(
        truthCampaign.write.claimReward({
          account: user1.account,
        })
      ).to.be.rejectedWith("TruthCampaign: participation not validated");
    });
  });

  describe("Campaign Management", function () {
    it("Should end campaign", async function () {
      const { truthCampaign, brand } = await loadFixture(deployTruthCampaignFixture);
      
      await truthCampaign.write.endCampaign({
        account: brand.account,
      });
      
      const campaignInfo = await truthCampaign.read.getCampaignInfo();
      expect(campaignInfo[10]).to.equal(false); // isActive
    });

    it("Should allow admin to end campaign", async function () {
      const { truthCampaign, admin } = await loadFixture(deployTruthCampaignFixture);
      
      await truthCampaign.write.endCampaign({
        account: admin.account,
      });
      
      const campaignInfo = await truthCampaign.read.getCampaignInfo();
      expect(campaignInfo[10]).to.equal(false); // isActive
    });

    it("Should revert when unauthorized user tries to end campaign", async function () {
      const { truthCampaign, user1 } = await loadFixture(deployTruthCampaignFixture);
      
      await expect(
        truthCampaign.write.endCampaign({
          account: user1.account,
        })
      ).to.be.rejectedWith("TruthCampaign: unauthorized");
    });

    it("Should check if accepting participants", async function () {
      const { truthCampaign } = await loadFixture(deployTruthCampaignFixture);
      
      // Before start time
      expect(await truthCampaign.read.isAcceptingParticipants()).to.equal(false);
      
      // During campaign
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      expect(await truthCampaign.read.isAcceptingParticipants()).to.equal(true);
      
      // After end time
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.endTime + BigInt(1)));
      expect(await truthCampaign.read.isAcceptingParticipants()).to.equal(false);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for participation", async function () {
      const { truthCampaign, user1, publicClient } = await loadFixture(deployTruthCampaignFixture);
      
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      
      const hash = await truthCampaign.write.participate(["gas-test-hash"], {
        account: user1.account,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Gas should be reasonable (less than 200k for participation)
      expect(receipt.gasUsed).to.be.lessThan(BigInt(200000));
    });

    it("Should have reasonable gas costs for validation", async function () {
      const { truthCampaign, admin, validator1, user1, publicClient } = await loadFixture(deployTruthCampaignFixture);
      
      await truthCampaign.write.addValidator([validator1.account.address]);
      
      await time.increaseTo(await truthCampaign.read.campaign().then(c => c.startTime));
      await truthCampaign.write.participate(["test-hash"], {
        account: user1.account,
      });
      
      const hash = await truthCampaign.write.validateParticipation([user1.account.address, true], {
        account: validator1.account,
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Gas should be reasonable (less than 150k for validation)
      expect(receipt.gasUsed).to.be.lessThan(BigInt(150000));
    });
  });
});