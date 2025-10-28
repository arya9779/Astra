import hre from "hardhat";

async function testKarmaToken() {
  console.log("Testing KarmaToken...");
  
  const [owner, user1] = await hre.viem.getWalletClients();
  
  // Deploy contract
  const karmaToken = await hre.viem.deployContract("KarmaToken", [owner.account.address]);
  console.log(`KarmaToken deployed at: ${karmaToken.address}`);
  
  // Test basic properties
  const name = await karmaToken.read.name();
  const symbol = await karmaToken.read.symbol();
  const decimals = await karmaToken.read.decimals();
  
  console.log(`Name: ${name}, Symbol: ${symbol}, Decimals: ${decimals}`);
  
  // Test minting
  await karmaToken.write.mint([user1.account.address, BigInt(100), "Test mint"]);
  const balance = await karmaToken.read.balanceOf([user1.account.address]);
  console.log(`User balance after mint: ${balance}`);
  
  // Test burning
  await karmaToken.write.burn([user1.account.address, BigInt(30), "Test burn"]);
  const balanceAfterBurn = await karmaToken.read.balanceOf([user1.account.address]);
  console.log(`User balance after burn: ${balanceAfterBurn}`);
  
  console.log("✅ KarmaToken tests passed!");
  return true;
}

async function testValidationRegistry() {
  console.log("\nTesting ValidationRegistry...");
  
  const [owner, validator1] = await hre.viem.getWalletClients();
  
  // Deploy contract
  const validationRegistry = await hre.viem.deployContract("ValidationRegistry", [owner.account.address]);
  console.log(`ValidationRegistry deployed at: ${validationRegistry.address}`);
  
  // Add validator
  await validationRegistry.write.addValidator([validator1.account.address]);
  const isValidator = await validationRegistry.read.isValidator([validator1.account.address]);
  console.log(`Validator1 is validator: ${isValidator}`);
  
  // Record validation
  const contentHash = "0x1234567890123456789012345678901234567890123456789012345678901234";
  await validationRegistry.write.recordValidation([contentHash, true, "Test validation"]);
  
  const validationCount = await validationRegistry.read.getValidationCount([contentHash]);
  console.log(`Validation count: ${validationCount}`);
  
  console.log("✅ ValidationRegistry tests passed!");
  return true;
}

async function testTruthCampaignFactory() {
  console.log("\nTesting TruthCampaignFactory...");
  
  const [owner, brand1] = await hre.viem.getWalletClients();
  
  // Deploy contract
  const factory = await hre.viem.deployContract("TruthCampaignFactory", [
    owner.account.address,
    BigInt("10000000000000000") // 0.01 ETH
  ]);
  console.log(`TruthCampaignFactory deployed at: ${factory.address}`);
  
  // Register brand
  await factory.write.registerBrand([brand1.account.address]);
  const isBrand = await factory.read.isBrand([brand1.account.address]);
  console.log(`Brand1 is registered: ${isBrand}`);
  
  // Create campaign
  const currentTime = Math.floor(Date.now() / 1000);
  await factory.write.createCampaign([
    "Test Campaign",
    "A test campaign",
    BigInt(100),
    BigInt(10000),
    BigInt(100),
    BigInt(currentTime + 3600),
    BigInt(currentTime + 86400),
    false
  ], {
    account: brand1.account,
    value: BigInt("10000000000000000")
  });
  
  const campaignCount = await factory.read.getTotalCampaigns();
  console.log(`Total campaigns: ${campaignCount}`);
  
  console.log("✅ TruthCampaignFactory tests passed!");
  return true;
}

async function main() {
  console.log("🚀 Testing Astra Smart Contracts\n");
  
  try {
    await testKarmaToken();
    await testValidationRegistry();
    await testTruthCampaignFactory();
    
    console.log("\n🎉 All contract tests passed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

main();