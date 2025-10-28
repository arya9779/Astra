import { Address } from 'viem';

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  contracts: {
    karmaToken?: Address;
    validationRegistry?: Address;
    truthCampaignFactory?: Address;
  };
  blockExplorer: string;
}

export const networkConfigs: Record<string, NetworkConfig> = {
  localhost: {
    name: 'Localhost',
    chainId: 31337,
    rpcUrl: 'http://127.0.0.1:8545',
    contracts: {
      // These will be populated after deployment
    },
    blockExplorer: 'http://localhost:8545'
  },
  amoy: {
    name: 'Polygon Amoy Testnet',
    chainId: 80002,
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology',
    contracts: {
      // These will be populated after deployment
    },
    blockExplorer: 'https://amoy.polygonscan.com'
  },
  polygon: {
    name: 'Polygon Mainnet',
    chainId: 137,
    rpcUrl: process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com',
    contracts: {
      // These will be populated after deployment
    },
    blockExplorer: 'https://polygonscan.com'
  }
};

// Load deployed contract addresses
export function loadContractAddresses(network: string) {
  try {
    const fs = require('fs');
    const path = require('path');
    const addressesPath = path.join(__dirname, `../deployed-addresses/${network}.json`);
    
    if (fs.existsSync(addressesPath)) {
      const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
      return {
        karmaToken: addresses.karmaToken as Address,
        validationRegistry: addresses.validationRegistry as Address,
        truthCampaignFactory: addresses.truthCampaignFactory as Address,
      };
    }
  } catch (error) {
    console.warn(`Could not load contract addresses for ${network}:`, error);
  }
  
  return {
    karmaToken: undefined,
    validationRegistry: undefined,
    truthCampaignFactory: undefined,
  };
}

// Get network configuration with deployed addresses
export function getNetworkConfig(network: string): NetworkConfig {
  const config = networkConfigs[network];
  if (!config) {
    throw new Error(`Network ${network} not supported`);
  }
  
  const deployedAddresses = loadContractAddresses(network);
  
  return {
    ...config,
    contracts: {
      ...config.contracts,
      ...deployedAddresses,
    },
  };
}

// Environment variables validation
export function validateEnvironment(network: string) {
  if (network === 'amoy') {
    if (!process.env.POLYGON_AMOY_PRIVATE_KEY) {
      throw new Error('POLYGON_AMOY_PRIVATE_KEY environment variable is required for Amoy network');
    }
    if (!process.env.POLYGON_AMOY_RPC_URL) {
      console.warn('POLYGON_AMOY_RPC_URL not set, using default RPC URL');
    }
  }
  if (network === 'polygon') {
    if (!process.env.POLYGON_PRIVATE_KEY) {
      throw new Error('POLYGON_PRIVATE_KEY environment variable is required for Polygon mainnet');
    }
    if (!process.env.POLYGON_RPC_URL) {
      console.warn('POLYGON_RPC_URL not set, using default RPC URL');
    }
  }
}

// Helper to get contract addresses for a network
export function getContractAddresses(network: string) {
  const config = getNetworkConfig(network);
  const { karmaToken, validationRegistry, truthCampaignFactory } = config.contracts;
  
  if (!karmaToken || !validationRegistry || !truthCampaignFactory) {
    throw new Error(`Contracts not deployed on ${network}. Run deployment script first.`);
  }
  
  return {
    karmaToken,
    validationRegistry,
    truthCampaignFactory,
  };
}