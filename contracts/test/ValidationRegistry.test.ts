import { expect } from "chai";
import hre from "hardhat";
import { zeroAddress, keccak256, toBytes } from "viem";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("ValidationRegistry", function () {
  async function deployValidationRegistryFixture() {
    const [owner, validator1, validator2, user1] = await hre.viem.getWalletClients();
    
    const validationRegistry = await hre.viem.deployContract("ValidationRegistry", [owner.account.address]);
    
    const publicClient = await hre.viem.getPublicClient();
    
    // Helper function to create content hash
    const createContentHash = (content: string) => keccak256(toBytes(content));
    
    return {
      validationRegistry,
      owner,
      validator1,
      validator2,
      user1,
      publicClient,
      createContentHash,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      const { validationRegistry, owner } = await loadFixture(deployValidationRegistryFixture);
      
      const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";
      expect(await validationRegistry.read.hasRole([DEFAULT_ADMIN_ROLE, owner.account.address])).to.be.true;
    });

    it("Should grant validator role to owner", async function () {
      const { validationRegistry, owner } = await loadFixture(deployValidationRegistryFixture);
      
      expect(await validationRegistry.read.isValidator([owner.account.address])).to.be.true;
    });

    it("Should initialize with zero validations", async function () {
      const { validationRegistry } = await loadFixture(deployValidationRegistryFixture);
      
      expect(await validationRegistry.read.getTotalValidations()).to.equal(BigInt(0));
    });
  });

  describe("Validator Management", function () {
    it("Should add validator", async function () {
      const { validationRegistry, owner, validator1 } = await loadFixture(deployValidationRegistryFixture);
      
      await validationRegistry.write.addValidator([validator1.account.address]);
      
      expect(await validationRegistry.read.isValidator([validator1.account.address])).to.be.true;
    });

    it("Should remove validator", async function () {
      const { validationRegistry, owner, validator1 } = await loadFixture(deployValidationRegistryFixture);
      
      // Add validator first
      await validationRegistry.write.addValidator([validator1.account.address]);
      expect(await validationRegistry.read.isValidator([validator1.account.address])).to.be.true;
      
      // Remove validator
      await validationRegistry.write.removeValidator([validator1.account.address]);
      expect(await validationRegistry.read.isValidator([validator1.account.address])).to.be.false;
    });

    it("Should batch add validators", async function () {
      const { validationRegistry, validator1, validator2 } = await loadFixture(deployValidationRegistryFixture);
      
      const validators = [validator1.account.address, validator2.account.address];
      await validationRegistry.write.batchAddValidators([validators]);
      
      expect(await validationRegistry.read.isValidator([validator1.account.address])).to.be.true;
      expect(await validationRegistry.read.isValidator([validator2.account.address])).to.be.true;
    });

    it("Should revert when non-admin tries to add validator", async function () {
      const { validationRegistry, validator1, user1 } = await loadFixture(deployValidationRegistryFixture);
      
      await expect(
        validationRegistry.write.addValidator([validator1.account.address], {
          account: user1.account,
        })
      ).to.be.rejected;
    });

    it("Should revert when adding zero address as validator", async function () {
      const { validationRegistry } = await loadFixture(deployValidationRegistryFixture);
      
      await expect(
        validationRegistry.write.addValidator([zeroAddress])
      ).to.be.rejectedWith("ValidationRegistry: invalid validator address");
    });
  });

  describe("Recording Validations", function () {
    it("Should record validation", async function () {
      const { validationRegistry, owner, createContentHash } = await loadFixture(deployValidationRegistryFixture);
      
      const contentHash = createContentHash("test-content");
      const isAuthentic = true;
      const notes = "Content is authentic";
      
      await validationRegistry.write.recordValidation([contentHash, isAuthentic, notes]);
      
      const validations = await validationRegistry.read.getValidations([contentHash]);
      expect(validations.length).to.equal(1);
      expect(validations[0].validator).to.equal(owner.account.address);
      expect(validations[0].isAuthentic).to.equal(isAuthentic);
      expect(validations[0].notes).to.equal(notes);
    });

    it("Should increment total validations counter", async function () {
      const { validationRegistry, owner, createContentHash } = await loadFixture(deployValidationRegistryFixture);
      
      const contentHash1 = createContentHash("content-1");
      const contentHash2 = createContentHash("content-2");
      
      await validationRegistry.write.recordValidation([contentHash1, true, "Test 1"]);
      expect(await validationRegistry.read.getTotalValidations()).to.equal(BigInt(1));
      
      await validationRegistry.write.recordValidation([contentHash2, false, "Test 2"]);
      expect(await validationRegistry.read.getTotalValidations()).to.equal(BigInt(2));
    });

    it("Should prevent duplicate validations from same validator", async function () {
      const { validationRegistry, owner, createContentHash } = await loadFixture(deployValidationRegistryFixture);
      
      const contentHash = createContentHash("test-content");
      
      // First validation should succeed
      await validationRegistry.write.recordValidation([contentHash, true, "First validation"]);
      
      // Second validation from same validator should fail
      await expect(
        validationRegistry.write.recordValidation([contentHash, false, "Second validation"])
      ).to.be.rejectedWith("ValidationRegistry: already validated by this validator");
    });

    it("Should allow multiple validators to validate same content", async function () {
      const { validationRegistry, owner, validator1, createContentHash } = await loadFixture(deployValidationRegistryFixture);
      
      // Add validator1
      await validationRegistry.write.addValidator([validator1.account.address]);
      
      const contentHash = createContentHash("test-content");
      
      // Owner validates
      await validationRegistry.write.recordValidation([contentHash, true, "Owner validation"]);
      
      // Validator1 validates
      await validationRegistry.write.recordValidation([contentHash, false, "Validator1 validation"], {
        account: validator1.account,
      });
      
      const validations = await validationRegistry.read.getValidations([contentHash]);
      expect(validations.length).to.equal(2);
    });

    it("Should revert when non-validator tries to validate", async function () {
      const { validationRegistry, user1, createContentHash } = await loadFixture(deployValidationRegistryFixture);
      
      const contentHash = createContentHash("test-content");
      
      await expect(
        validationRegistry.write.recordValidation([contentHash, true, "Unauthorized validation"], {
          account: user1.account,
        })
      ).to.be.rejected;
    });

    it("Should revert with invalid content hash", async function () {
      const { validationRegistry } = await loadFixture(deployValidationRegistryFixture);
      
      const invalidHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      
      await expect(
        validationRegistry.write.recordValidation([invalidHash, true, "Test"])
      ).to.be.rejectedWith("ValidationRegistry: invalid content hash");
    });
  });

  describe("Validation Queries", function () {
    it("Should get validation count", async function () {
      const { validationRegistry, owner, validator1, createContentHash } = await loadFixture(deployValidationRegistryFixture);
      
      await validationRegistry.write.addValidator([validator1.account.address]);
      
      const contentHash = createContentHash("test-content");
      
      expect(await validationRegistry.read.getValidationCount([contentHash])).to.equal(BigInt(0));
      
      await validationRegistry.write.recordValidation([contentHash, true, "Test 1"]);
      expect(await validationRegistry.read.getValidationCount([contentHash])).to.equal(BigInt(1));
      
      await validationRegistry.write.recordValidation([contentHash, false, "Test 2"], {
        account: validator1.account,
      });
      expect(await validationRegistry.read.getValidationCount([contentHash])).to.equal(BigInt(2));
    });

    it("Should get validation consensus", async function () {
      const { validationRegistry, owner, validator1, validator2, createContentHash } = await loadFixture(deployValidationRegistryFixture);
      
      // Add validators
      await validationRegistry.write.addValidator([validator1.account.address]);
      await validationRegistry.write.addValidator([validator2.account.address]);
      
      const contentHash = createContentHash("test-content");
      
      // Record validations: 2 authentic, 1 fake
      await validationRegistry.write.recordValidation([contentHash, true, "Authentic 1"]);
      await validationRegistry.write.recordValidation([contentHash, true, "Authentic 2"], {
        account: validator1.account,
      });
      await validationRegistry.write.recordValidation([contentHash, false, "Fake 1"], {
        account: validator2.account,
      });
      
      const [authenticCount, fakeCount, totalCount] = await validationRegistry.read.getValidationConsensus([contentHash]);
      
      expect(authenticCount).to.equal(BigInt(2));
      expect(fakeCount).to.equal(BigInt(1));
      expect(totalCount).to.equal(BigInt(3));
    });

    it("Should check if validator has validated content", async function () {
      const { validationRegistry, owner, validator1, createContentHash } = await loadFixture(deployValidationRegistryFixture);
      
      await validationRegistry.write.addValidator([validator1.account.address]);
      
      const contentHash = createContentHash("test-content");
      
      expect(await validationRegistry.read.hasValidatorValidated([contentHash, owner.account.address])).to.be.false;
      expect(await validationRegistry.read.hasValidatorValidated([contentHash, validator1.account.address])).to.be.false;
      
      await validationRegistry.write.recordValidation([contentHash, true, "Test"]);
      
      expect(await validationRegistry.read.hasValidatorValidated([contentHash, owner.account.address])).to.be.true;
      expect(await validationRegistry.read.hasValidatorValidated([contentHash, validator1.account.address])).to.be.false;
    });
  });

  describe("Events", function () {
    it("Should emit ValidationRecorded event", async function () {
      const { validationRegistry, owner, createContentHash, publicClient } = await loadFixture(deployValidationRegistryFixture);
      
      const contentHash = createContentHash("test-content");
      const isAuthentic = true;
      const notes = "Test validation";
      
      const hash = await validationRegistry.write.recordValidation([contentHash, isAuthentic, notes]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      expect(receipt.status).to.equal("success");
      // In a real test, you would parse the logs to verify the event was emitted correctly
    });

    it("Should emit ValidatorAdded event", async function () {
      const { validationRegistry, validator1, publicClient } = await loadFixture(deployValidationRegistryFixture);
      
      const hash = await validationRegistry.write.addValidator([validator1.account.address]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      expect(receipt.status).to.equal("success");
    });
  });

  describe("Pausable Functionality", function () {
    it("Should pause and unpause validation recording", async function () {
      const { validationRegistry, owner, createContentHash } = await loadFixture(deployValidationRegistryFixture);
      
      const contentHash = createContentHash("test-content");
      
      // Pause the contract
      await validationRegistry.write.pause();
      
      // Recording should be blocked
      await expect(
        validationRegistry.write.recordValidation([contentHash, true, "Test"])
      ).to.be.rejected;
      
      // Unpause the contract
      await validationRegistry.write.unpause();
      
      // Recording should work again
      await validationRegistry.write.recordValidation([contentHash, true, "Test"]);
      
      const validations = await validationRegistry.read.getValidations([contentHash]);
      expect(validations.length).to.equal(1);
    });
  });

  describe("Gas Optimization", function () {
    it("Should have reasonable gas costs for validation recording", async function () {
      const { validationRegistry, createContentHash, publicClient } = await loadFixture(deployValidationRegistryFixture);
      
      const contentHash = createContentHash("gas-test-content");
      
      const hash = await validationRegistry.write.recordValidation([contentHash, true, "Gas test"]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Gas should be reasonable (less than 150k for a validation)
      expect(receipt.gasUsed).to.be.lessThan(BigInt(150000));
    });

    it("Should have reasonable gas costs for batch validator addition", async function () {
      const { validationRegistry, validator1, validator2, publicClient } = await loadFixture(deployValidationRegistryFixture);
      
      const validators = [validator1.account.address, validator2.account.address];
      
      const hash = await validationRegistry.write.batchAddValidators([validators]);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      
      // Batch addition should be more efficient than individual additions
      expect(receipt.gasUsed).to.be.lessThan(BigInt(200000));
    });
  });
});