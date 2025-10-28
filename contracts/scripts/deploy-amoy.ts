import hre from "hardhat";
import AllContractsModule from "../ignition/modules/AllContracts.js";

async function main() {
  console.log("Deploying Astra smart contracts to Polygon Amoy testnet...");

  // Check if we have the required environment variables
  if (!process.env.POLYGON_AMOY_PRIVATE_KEY) {
    throw new Error("POLYGON_AMOY_PRIVATE_KEY environment variable is required");
  }

  if (!process.env.POLYGON_AMOY_RPC_URL) {
    throw new Error("POLYGON_AMOY_RPC_URL environment variable is required");
  }

  try {
    const { karmaToken, validationRegistry, truthCampaignFactory } = await hre.ignition.deploy(
      AllContractsModule,
      {
        strategy: "create2",
        strategyConfig: {
          salt: "0x1234567890123456789012345678901234567890123456789012345678901234"
        }
      }
    );

    console.log("✅ All contracts deployed successfully to Polygon Amoy!");
    console.log("\n📋 Contract Addresses:");
    console.log(`KarmaToken: ${karmaToken.target}`);
    console.log(`ValidationRegistry: ${validationRegistry.target}`);
    console.log(`TruthCampaignFactory: ${truthCampaignFactory.target}`);

    // Save addresses to a JSON file for easy access
    const addresses = {
      karmaToken: karmaToken.target,
      validationRegistry: validationRegistry.target,
      truthCampaignFactory: truthCampaignFactory.target,
      network: "polygonAmoy",
      chainId: 80002,
      deployedAt: new Date().toISOString(),
      deployer: process.env.POLYGON_AMOY_PRIVATE_KEY ? "configured" : "not-configured"
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
      join(addressesDir, 'amoy.json'),
      JSON.stringify(addresses, null, 2)
    );

    console.log("\n💾 Contract addresses saved to deployed-addresses/amoy.json");
    
    console.log("\n🔗 Verify contracts on PolygonScan:");
    console.log(`KarmaToken: https://amoy.polygonscan.com/address/${karmaToken.target}`);
    console.log(`ValidationRegistry: https://amoy.polygonscan.com/address/${validationRegistry.target}`);
    console.log(`TruthCampaignFactory: https://amoy.polygonscan.com/address/${truthCampaignFactory.target}`);
    
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