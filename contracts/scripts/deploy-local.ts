import hre from "hardhat";
import AllContractsModule from "../ignition/modules/AllContracts.js";

async function main() {
  console.log("Deploying Astra smart contracts to local network...");

  try {
    const { karmaToken, validationRegistry, truthCampaignFactory } = await hre.ignition.deploy(
      AllContractsModule
    );

    console.log("✅ All contracts deployed successfully!");
    console.log("\n📋 Contract Addresses:");
    console.log(`KarmaToken: ${karmaToken.target}`);
    console.log(`ValidationRegistry: ${validationRegistry.target}`);
    console.log(`TruthCampaignFactory: ${truthCampaignFactory.target}`);

    // Save addresses to a JSON file for easy access
    const addresses = {
      karmaToken: karmaToken.target,
      validationRegistry: validationRegistry.target,
      truthCampaignFactory: truthCampaignFactory.target,
      network: "localhost",
      deployedAt: new Date().toISOString()
    };

    const { writeFileSync, existsSync, mkdirSync } = await import('fs');
    const { join, dirname } = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    
    const addressesDir = join(__dirname, '../deployed-addresses');
    if (!existsSync(addressesDir)) {
      mkdirSync(addressesDir, { recursive: true });
    }
    
    writeFileSync(
      join(addressesDir, 'localhost.json'),
      JSON.stringify(addresses, null, 2)
    );

    console.log("\n💾 Contract addresses saved to deployed-addresses/localhost.json");
    
    return addresses;
  } catch (error) {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Execute deployment if this script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export default main;