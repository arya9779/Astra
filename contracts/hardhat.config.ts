import type { HardhatUserConfig } from "hardhat/config";

import "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  // plugins are loaded via import
  mocha: {
    timeout: 40000,
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true,
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
    polygonAmoy: {
      type: "http",
      chainType: "l1",
      url: configVariable("POLYGON_AMOY_RPC_URL"),
      accounts: [configVariable("POLYGON_AMOY_PRIVATE_KEY")],
      chainId: 80002,
      gasPrice: 30000000000,
    },
    polygon: {
      type: "http",
      chainType: "l1",
      url: configVariable("POLYGON_RPC_URL"),
      accounts: [configVariable("POLYGON_PRIVATE_KEY")],
      chainId: 137,
      gasPrice: 30000000000,
    },
  },
};

export default config;
