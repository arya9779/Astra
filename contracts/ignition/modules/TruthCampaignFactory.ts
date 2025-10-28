import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const TruthCampaignFactoryModule = buildModule("TruthCampaignFactoryModule", (m) => {
  // Get the deployer account as the initial owner
  const initialOwner = m.getAccount(0);
  
  // Set campaign creation fee to 0.01 ETH (or MATIC on Polygon)
  const campaignCreationFee = parseEther("0.01");

  // Deploy TruthCampaignFactory contract
  const truthCampaignFactory = m.contract("TruthCampaignFactory", [
    initialOwner,
    campaignCreationFee
  ]);

  return { truthCampaignFactory };
});

export default TruthCampaignFactoryModule;