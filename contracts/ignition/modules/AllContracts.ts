import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { parseEther } from "viem";

const AllContractsModule = buildModule("AllContractsModule", (m) => {
  // Get the deployer account as the initial owner
  const initialOwner = m.getAccount(0);
  
  // Set campaign creation fee to 0.01 ETH (or MATIC on Polygon)
  const campaignCreationFee = parseEther("0.01");

  // Deploy all contracts
  const karmaToken = m.contract("KarmaToken", [initialOwner]);
  const validationRegistry = m.contract("ValidationRegistry", [initialOwner]);
  const truthCampaignFactory = m.contract("TruthCampaignFactory", [
    initialOwner,
    campaignCreationFee
  ]);

  return { 
    karmaToken, 
    validationRegistry, 
    truthCampaignFactory 
  };
});

export default AllContractsModule;