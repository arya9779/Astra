import hre from "hardhat";
import { createAstraContracts, stringToBytes32, calculateKarmaAmount } from "../utils/contractInteractions.js";
import { getContractAddresses } from "../utils/config.js";

async function main() {
  console.log("🚀 Astra Contract Interactions Example");
  
  try {
    // Get deployed contract addresses
    const addresses = getContractAddresses('localhost');
    console.log("📋 Using contract addresses:", addresses);

    // Get a test account
    const [deployer, user1, user2] = await hre.viem.getWalletClients();
    console.log("👤 Using accounts:");
    console.log(`Deployer: ${deployer.account.address}`);
    console.log(`User1: ${user1.account.address}`);
    console.log(`User2: ${user2.account.address}`);

    // Create contract interaction instance
    // Note: In a real scenario, you'd use actual private keys from environment variables
    const astra = createAstraContracts(
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Default Hardhat account 0 private key
      "http://127.0.0.1:8545",
      addresses
    );

    console.log("\n🎯 Testing Karma Token Operations...");
    
    // Mint some karma to user1
    const mintAmount = calculateKarmaAmount('CONTENT_VALIDATION');
    console.log(`Minting ${mintAmount} karma to ${user1.account.address}...`);
    
    const mintTx = await astra.mintKarma(
      user1.account.address,
      mintAmount,
      "Content validation reward"
    );
    console.log(`✅ Mint transaction: ${mintTx}`);
    
    // Wait for transaction confirmation
    await astra.waitForTransaction(mintTx);
    
    // Check balance
    const balance = await astra.getKarmaBalance(user1.account.address);
    console.log(`💰 User1 karma balance: ${balance}`);

    console.log("\n🔍 Testing Validation Registry...");
    
    // Record a validation
    const contentHash = stringToBytes32("example-content-hash-123");
    console.log(`Recording validation for content: ${contentHash}`);
    
    const validationTx = await astra.recordValidation(
      contentHash,
      true, // isAuthentic
      "Content verified as authentic"
    );
    console.log(`✅ Validation transaction: ${validationTx}`);
    
    // Wait for transaction confirmation
    await astra.waitForTransaction(validationTx);
    
    // Get validations
    const validations = await astra.getValidations(contentHash);
    console.log(`📊 Validations for content: ${validations.length} validation(s)`);

    console.log("\n🏭 Testing Truth Campaign Factory...");
    
    // Register user2 as a brand
    const registerTx = await astra.registerBrand(user2.account.address);
    console.log(`✅ Brand registration transaction: ${registerTx}`);
    await astra.waitForTransaction(registerTx);

    // Get all campaigns (should be empty initially)
    const campaigns = await astra.getAllCampaigns();
    console.log(`📈 Total campaigns: ${campaigns.length}`);

    console.log("\n✨ All contract interactions completed successfully!");
    
  } catch (error) {
    console.error("❌ Error during contract interactions:", error);
    process.exit(1);
  }
}

// Execute if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;