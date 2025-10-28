import { expect } from "chai";
import hre from "hardhat";
import { parseEther, zeroAddress } from "viem";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("TruthCampaignFactory", function () {
  async function deployTruthCampaignFactoryFixture() {
    const [owner, brand1, brand2, user1] = await hre.viem.getWalletClients();
    
    const campaignCreationFee = parseEther("0.01");
    
    const truthCampaignFactory = await hre.viem.deployContract("TruthCampaignFactory", [
      owner.account.address,
      campaignCreationFee,
    ]);
    
    const publicClient = await hre.viem.getPublicClient();
    
    return {
      truthCampaignFactory,
      owner,
      brand1,
      brand2,
      user1,
      publicClient,
      campaignCreationFee,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner and fee", async function () {
      const { truthCampaignFactory, owner, campaignCreationFee } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      expect(await truthCampaignFactory.read.hasRole([DEFAULT_ADMIN_ROLE, owner.account.address])).to.be.true;
      expect(await truthCampaignFactory.read.campaignCreationFee()).to.equal(campaignCreationFee);
    });

    it("Should set default campaign duration limits", async function () {
      const { truthCampaignFactory } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      expect(await truthCampaignFactory.read.minCampaignDuration()).to.equal(BigInt(86400)); // 1 day
      expect(await truthCampaignFactory.read.maxCampaignDuration()).to.equal(BigInt(31536000)); // 365 days
    });

    it("Should initialize with zero campaigns", async function () {
      const { truthCampaignFactory } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      expect(await truthCampaignFactory.read.getTotalCampaigns()).to.equal(BigInt(0));
    });
  });

  describe("Brand Management", function () {
    it("Should register brand", async function () {
      const { truthCampaignFactory, owner, brand1 } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      expect(await truthCampaignFactory.read.isBrand([brand1.account.address])).to.be.true;
    });

    it("Should batch register brands", async function () {
      const { truthCampaignFactory, brand1, brand2 } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      const brands = [brand1.account.address, brand2.account.address];
      await truthCampaignFactory.write.batchRegisterBrands([brands]);
      
      expect(await truthCampaignFactory.read.isBrand([brand1.account.address])).to.be.true;
      expect(await truthCampaignFactory.read.isBrand([brand2.account.address])).to.be.true;
    });

    it("Should remove brand", async function () {
      const { truthCampaignFactory, owner, brand1 } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      // Register brand first
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      expect(await truthCampaignFactory.read.isBrand([brand1.account.address])).to.be.true;
      
      // Remove brand
      await truthCampaignFactory.write.removeBrand([brand1.account.address]);
      expect(await truthCampaignFactory.read.isBrand([brand1.account.address])).to.be.false;
    });

    it("Should revert when non-admin tries to register brand", async function () {
      const { truthCampaignFactory, brand1, user1 } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await expect(
        truthCampaignFactory.write.registerBrand([brand1.account.address], {
          account: user1.account,
        })
      ).to.be.rejected;
    });

    it("Should revert when registering zero address", async function () {
      const { truthCampaignFactory } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await expect(
        truthCampaignFactory.write.registerBrand([zeroAddress])
      ).to.be.rejectedWith("TruthCampaignFactory: invalid brand address");
    });
  });

  describe("Campaign Creation", function () {
    it("Should create campaign with correct parameters", async function () {
      const { truthCampaignFactory, brand1, campaignCreationFee } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      // Register brand first
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      const currentTime = await time.latest();
      const campaignParams = {
        name: "Test Campaign",
        description: "A test campaign",
        karmaReward: BigInt(100),
        totalBudget: BigInt(10000),
        maxParticipants: BigInt(100),
        startTime: BigInt(currentTime + 3600),
        endTime: BigInt(currentTime + 86400),
        requiresValidation: true,
      };
      
      const campaignAddress = await truthCampaignFactory.write.createCampaign([
        campaignParams.name,
        campaignParams.description,
        campaignParams.karmaReward,
        campaignParams.totalBudget,
        campaignParams.maxParticipants,
        campaignParams.startTime,
        campaignParams.endTime,
        campaignParams.requiresValidation,
      ], {
        account: brand1.account,
        value: campaignCreationFee,
      });
      
      expect(await truthCampaignFactory.read.getTotalCampaigns()).to.equal(BigInt(1));
      
      const campaigns = await truthCampaignFactory.read.getAllCampaigns();
      expect(campaigns.length).to.equal(1);
      expect(campaigns[0].name).to.equal(campaignParams.name);
      expect(campaigns[0].brand).to.equal(brand1.account.address);
    });

    it("Should track campaigns by brand", async function () {
      const { truthCampaignFactory, brand1, campaignCreationFee } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      const currentTime = await time.latest();
      
      // Create first campaign
      await truthCampaignFactory.write.createCampaign([
        "Campaign 1",
        "Description 1",
        BigInt(100),
        BigInt(10000),
        BigInt(100),
        BigInt(currentTime + 3600),
        BigInt(currentTime + 86400),
        true,
      ], {
        account: brand1.account,
        value: campaignCreationFee,
      });
      
      // Create second campaign
      await truthCampaignFactory.write.createCampaign([
        "Campaign 2",
        "Description 2",
        BigInt(200),
        BigInt(20000),
        BigInt(200),
        BigInt(currentTime + 7200),
        BigInt(currentTime + 172800),
        false,
      ], {
        account: brand1.account,
        value: campaignCreationFee,
      });
      
      const brandCampaigns = await truthCampaignFactory.read.getCampaignsByBrand([brand1.account.address]);
      expect(brandCampaigns.length).to.equal(2);
    });

    it("Should revert when non-brand tries to create campaign", async function () {
      const { truthCampaignFactory, user1, campaignCreationFee } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      const currentTime = await time.latest();
      
      await expect(
        truthCampaignFactory.write.createCampaign([
          "Test Campaign",
          "Description",
          BigInt(100),
          BigInt(10000),
          BigInt(100),
          BigInt(currentTime + 3600),
          BigInt(currentTime + 86400),
          true,
        ], {
          account: user1.account,
          value: campaignCreationFee,
        })
      ).to.be.rejected;
    });

    it("Should revert with insufficient fee", async function () {
      const { truthCampaignFactory, brand1, campaignCreationFee } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      const currentTime = await time.latest();
      const insufficientFee = campaignCreationFee - BigInt(1);
      
      await expect(
        truthCampaignFactory.write.createCampaign([
          "Test Campaign",
          "Description",
          BigInt(100),
          BigInt(10000),
          BigInt(100),
          BigInt(currentTime + 3600),
          BigInt(currentTime + 86400),
          true,
        ], {
          account: brand1.account,
          value: insufficientFee,
        })
      ).to.be.rejectedWith("TruthCampaignFactory: insufficient fee");
    });

    it("Should revert with invalid campaign parameters", async function () {
      const { truthCampaignFactory, brand1, campaignCreationFee } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      const currentTime = await time.latest();
      
      // Empty name
      await expect(
        truthCampaignFactory.write.createCampaign([
          "",
          "Description",
          BigInt(100),
          BigInt(10000),
          BigInt(100),
          BigInt(currentTime + 3600),
          BigInt(currentTime + 86400),
          true,
        ], {
          account: brand1.account,
          value: campaignCreationFee,
        })
      ).to.be.rejectedWith("TruthCampaignFactory: name required");

      // Zero karma reward
      await expect(
        truthCampaignFactory.write.createCampaign([
          "Test Campaign",
          "Description",
          BigInt(0),
          BigInt(10000),
          BigInt(100),
          BigInt(currentTime + 3600),
          BigInt(currentTime + 86400),
          true,
        ], {
          account: brand1.account,
          value: campaignCreationFee,
        })
      ).to.be.rejectedWith("TruthCampaignFactory: karma reward must be positive");

      // Campaign too short
      await expect(
        truthCampaignFactory.write.createCampaign([
          "Test Campaign",
          "Description",
          BigInt(100),
          BigInt(10000),
          BigInt(100),
          BigInt(currentTime + 3600),
          BigInt(currentTime + 3600 + 3600), // Only 1 hour duration
          true,
        ], {
          account: brand1.account,
          value: campaignCreationFee,
        })
      ).to.be.rejectedWith("TruthCampaignFactory: campaign too short");
    });
  });

  describe("Configuration Management", function () {
    it("Should update campaign creation fee", async function () {
      const { truthCampaignFactory, owner } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      const newFee = parseEther("0.02");
      
      await truthCampaignFactory.write.setCampaignCreationFee([newFee]);
      
      expect(await truthCampaignFactory.read.campaignCreationFee()).to.equal(newFee);
    });

    it("Should update minimum campaign duration", async function () {
      const { truthCampaignFactory, owner } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      const newMinDuration = BigInt(172800); // 2 days
      
      await truthCampaignFactory.write.setMinCampaignDuration([newMinDuration]);
      
      expect(await truthCampaignFactory.read.minCampaignDuration()).to.equal(newMinDuration);
    });

    it("Should update maximum campaign duration", async function () {
      const { truthCampaignFactory, owner } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      const newMaxDuration = BigInt(63072000); // 2 years
      
      await truthCampaignFactory.write.setMaxCampaignDuration([newMaxDuration]);
      
      expect(await truthCampaignFactory.read.maxCampaignDuration()).to.equal(newMaxDuration);
    });

    it("Should revert when non-admin tries to update configuration", async function () {
      const { truthCampaignFactory, user1 } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await expect(
        truthCampaignFactory.write.setCampaignCreationFee([parseEther("0.02")], {
          account: user1.account,
        })
      ).to.be.rejected;
    });

    it("Should revert when setting invalid duration limits", async function () {
      const { truthCampaignFactory } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      // Zero minimum duration
      await expect(
        truthCampaignFactory.write.setMinCampaignDuration([BigInt(0)])
      ).to.be.rejectedWith("TruthCampaignFactory: duration must be positive");

      // Max duration less than min duration
      await expect(
        truthCampaignFactory.write.setMaxCampaignDuration([BigInt(3600)]) // 1 hour (less than default 1 day min)
      ).to.be.rejectedWith("TruthCampaignFactory: max must be greater than min");
    });
  });

  describe("Campaign Queries", function () {
    it("Should get active campaigns", async function () {
      const { truthCampaignFactory, brand1, campaignCreationFee } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      const currentTime = await time.latest();
      
      // Create campaign
      await truthCampaignFactory.write.createCampaign([
        "Active Campaign",
        "Description",
        BigInt(100),
        BigInt(10000),
        BigInt(100),
        BigInt(currentTime + 3600),
        BigInt(currentTime + 86400),
        true,
      ], {
        account: brand1.account,
        value: campaignCreationFee,
      });
      
      const activeCampaigns = await truthCampaignFactory.read.getActiveCampaigns();
      expect(activeCampaigns.length).to.equal(1);
      expect(activeCampaigns[0].name).to.equal("Active Campaign");
      expect(activeCampaigns[0].isActive).to.equal(true);
    });

    it("Should get campaign info by address", async function () {
      const { truthCampaignFactory, brand1, campaignCreationFee } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      const currentTime = await time.latest();
      
      await truthCampaignFactory.write.createCampaign([
        "Test Campaign",
        "Description",
        BigInt(100),
        BigInt(10000),
        BigInt(100),
        BigInt(currentTime + 3600),
        BigInt(currentTime + 86400),
        true,
      ], {
        account: brand1.account,
        value: campaignCreationFee,
      });
      
      const campaigns = await truthCampaignFactory.read.getAllCampaigns();
      const campaignAddress = campaigns[0].campaignAddress;
      
      const campaignInfo = await truthCampaignFactory.read.getCampaignInfo([campaignAddress]);
      expect(campaignInfo.name).to.equal("Test Campaign");
      expect(campaignInfo.brand).to.equal(brand1.account.address);
    });

    it("Should revert when getting info for non-existent campaign", async function () {
      const { truthCampaignFactory, brand1 } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await expect(
        truthCampaignFactory.read.getCampaignInfo([brand1.account.address]) // Using random address
      ).to.be.rejectedWith("TruthCampaignFactory: campaign not found");
    });
  });

  describe("Fee Management", function () {
    it("Should withdraw collected fees", async function () {
      const { truthCampaignFactory, owner, brand1, campaignCreationFee, publicClient } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      const currentTime = await time.latest();
      
      // Create campaign (pays fee)
      await truthCampaignFactory.write.createCampaign([
        "Fee Test Campaign",
        "Description",
        BigInt(100),
        BigInt(10000),
        BigInt(100),
        BigInt(currentTime + 3600),
        BigInt(currentTime + 86400),
        true,
      ], {
        account: brand1.account,
        value: campaignCreationFee,
      });
      
      const initialBalance = await publicClient.getBalance({ address: owner.account.address });
      
      // Withdraw fees
      const hash = await truthCampaignFactory.write.withdrawFees();
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      const finalBalance = await publicClient.getBalance({ address: owner.account.address });
      
      // Balance should increase by fee amount minus gas costs
      expect(finalBalance).to.be.greaterThan(initialBalance);
    });

    it("Should revert withdrawal when no fees collected", async function () {
      const { truthCampaignFactory } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await expect(
        truthCampaignFactory.write.withdrawFees()
      ).to.be.rejectedWith("TruthCampaignFactory: no fees to withdraw");
    });

    it("Should revert when non-admin tries to withdraw fees", async function () {
      const { truthCampaignFactory, user1 } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await expect(
        truthCampaignFactory.write.withdrawFees({
          account: user1.account,
        })
      ).to.be.rejected;
    });
  });

  describe("Pausable Functionality", function () {
    it("Should pause and unpause campaign creation", async function () {
      const { truthCampaignFactory, owner, brand1, campaignCreationFee } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      // Pause the factory
      await truthCampaignFactory.write.pause();
      
      const currentTime = await time.latest();
      
      // Campaign creation should be blocked
      await expect(
        truthCampaignFactory.write.createCampaign([
          "Paused Campaign",
          "Description",
          BigInt(100),
          BigInt(10000),
          BigInt(100),
          BigInt(currentTime + 3600),
          BigInt(currentTime + 86400),
          true,
        ], {
          account: brand1.account,
          value: campaignCreationFee,
        })
      ).to.be.rejected;
      
      // Unpause the factory
      await truthCampaignFactory.write.unpause();
      
      // Campaign creation should work again
      await truthCampaignFactory.write.createCampaign([
        "Unpaused Campaign",
        "Description",
        BigInt(100),
        BigInt(10000),
        BigInt(100),
        BigInt(currentTime + 3600),
        BigInt(currentTime + 86400),
        true,
      ], {
        account: brand1.account,
        value: campaignCreationFee,
      });
      
      expect(await truthCampaignFactory.read.getTotalCampaigns()).to.equal(BigInt(1));
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for campaign creation", async function () {
      const { truthCampaignFactory, brand1, campaignCreationFee, publicClient } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      await truthCampaignFactory.write.registerBrand([brand1.account.address]);
      
      const currentTime = await time.latest();
      
      const hash = await truthCampaignFactory.write.createCampaign([
        "Gas Test Campaign",
        "Description for gas testing",
        BigInt(100),
        BigInt(10000),
        BigInt(100),
        BigInt(currentTime + 3600),
        BigInt(currentTime + 86400),
        true,
      ], {
        account: brand1.account,
        value: campaignCreationFee,
      });
      
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Gas should be reasonable for deploying a new contract (less than 3M gas)
      expect(receipt.gasUsed).to.be.lessThan(BigInt(3000000));
    });

    it("Should have reasonable gas costs for batch brand registration", async function () {
      const { truthCampaignFactory, brand1, brand2, publicClient } = await loadFixture(deployTruthCampaignFactoryFixture);
      
      const brands = [brand1.account.address, brand2.account.address];
      
      const hash = await truthCampaignFactory.write.batchRegisterBrands([brands]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Batch registration should be more efficient than individual registrations
      expect(receipt.gasUsed).to.be.lessThan(BigInt(200000));
    });
  });
});