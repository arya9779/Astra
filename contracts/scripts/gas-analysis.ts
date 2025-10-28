import hre from "hardhat";

async function main() {
  console.log("🔍 Gas Analysis for Astra Smart Contracts");
  
  const [owner, user1, user2] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  
  console.log("\n📊 Deploying contracts and measuring gas usage...");
  
  // Deploy KarmaToken
  console.log("\n1. KarmaToken Contract:");
  const karmaToken = await hre.viem.deployContract("KarmaToken", [owner.account.address]);
  console.log(`   ✅ Deployed at: ${karmaToken.address}`);
  
  // Test minting gas cost
  const mintTx = await karmaToken.write.mint([user1.account.address, BigInt(100), "Gas test"]);
  const mintReceipt = await publicClient.waitForTransactionReceipt({ hash: mintTx });
  console.log(`   💰 Mint gas used: ${mintReceipt.gasUsed}`);
  
  // Test burning gas cost
  const burnTx = await karmaToken.write.burn([user1.account.address, BigInt(50), "Gas test"]);
  const burnReceipt = await publicClient.waitForTransactionReceipt({ hash: burnTx });
  console.log(`   🔥 Burn gas used: ${burnReceipt.gasUsed}`);
  
  // Deploy ValidationRegistry
  console.log("\n2. ValidationRegistry Contract:");
  const validationRegistry = await hre.viem.deployContract("ValidationRegistry", [owner.account.address]);
  console.log(`   ✅ Deployed at: ${validationRegistry.address}`);
  
  // Test validation recording gas cost
  const contentHash = "0x1234567890123456789012345678901234567890123456789012345678901234";
  const validateTx = await validationRegistry.write.recordValidation([contentHash, true, "Gas test"]);
  const validateReceipt = await publicClient.waitForTransactionReceipt({ hash: validateTx });
  console.log(`   📝 Validation gas used: ${validateReceipt.gasUsed}`);
  
  // Deploy TruthCampaignFactory
  console.log("\n3. TruthCampaignFactory Contract:");
  const campaignFactory = await hre.viem.deployContract("TruthCampaignFactory", [
    owner.account.address,
    BigInt("10000000000000000") // 0.01 ETH
  ]);
  console.log(`   ✅ Deployed at: ${campaignFactory.address}`);
  
  // Register brand
  const registerTx = await campaignFactory.write.registerBrand([user1.account.address]);
  const registerReceipt = await publicClient.waitForTransactionReceipt({ hash: registerTx });
  console.log(`   👤 Brand registration gas used: ${registerReceipt.gasUsed}`);
  
  // Create campaign
  const currentTime = Math.floor(Date.now() / 1000);
  const createCampaignTx = await campaignFactory.write.createCampaign([
    "Gas Test Campaign",
    "Testing gas usage",
    BigInt(100),
    BigInt(10000),
    BigInt(100),
    BigInt(currentTime + 3600),
    BigInt(currentTime + 86400),
    false
  ], {
    account: user1.account,
    value: BigInt("10000000000000000")
  });
  const createCampaignReceipt = await publicClient.waitForTransactionReceipt({ hash: createCampaignTx });
  console.log(`   🏭 Campaign creation gas used: ${createCampaignReceipt.gasUsed}`);
  
  console.log("\n✨ Gas analysis completed!");
  
  // Summary
  console.log("\n📋 Gas Usage Summary:");
  console.log(`   KarmaToken mint: ${mintReceipt.gasUsed} gas`);
  console.log(`   KarmaToken burn: ${burnReceipt.gasUsed} gas`);
  console.log(`   ValidationRegistry record: ${validateReceipt.gasUsed} gas`);
  console.log(`   Brand registration: ${registerReceipt.gasUsed} gas`);
  console.log(`   Campaign creation: ${createCampaignReceipt.gasUsed} gas`);
  
  // Test basic functionality
  console.log("\n🧪 Testing Basic Functionality:");
  
  // Check balances
  const balance = await karmaToken.read.balanceOf([user1.account.address]);
  console.log(`   User1 Karma balance: ${balance}`);
  
  // Check validation count
  const validationCount = await validationRegistry.read.getValidationCount([contentHash]);
  console.log(`   Validation count for content: ${validationCount}`);
  
  // Check campaign count
  const campaignCount = await campaignFactory.read.getTotalCampaigns();
  console.log(`   Total campaigns created: ${campaignCount}`);
  
  console.log("\n✅ All contracts deployed and tested successfully!");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Error:", error);
      process.exit(1);
    });
}

export default main;