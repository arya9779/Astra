import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const KarmaTokenModule = buildModule("KarmaTokenModule", (m) => {
  // Get the deployer account as the initial owner
  const initialOwner = m.getAccount(0);

  // Deploy KarmaToken contract
  const karmaToken = m.contract("KarmaToken", [initialOwner]);

  return { karmaToken };
});

export default KarmaTokenModule;