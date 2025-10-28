import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const ValidationRegistryModule = buildModule("ValidationRegistryModule", (m) => {
  // Get the deployer account as the initial owner
  const initialOwner = m.getAccount(0);

  // Deploy ValidationRegistry contract
  const validationRegistry = m.contract("ValidationRegistry", [initialOwner]);

  return { validationRegistry };
});

export default ValidationRegistryModule;