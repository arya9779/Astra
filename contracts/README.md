# Astra Smart Contracts

This directory contains the smart contracts for the Astra decentralized social media platform.

## Contracts

### KarmaToken.sol
ERC-20 compatible token representing user reputation on the Astra platform.
- **Features**: Mint/burn functionality, access control, pausable
- **Decimals**: 0 (whole numbers only)
- **Roles**: MINTER_ROLE, BURNER_ROLE, PAUSER_ROLE

### ValidationRegistry.sol
Immutable registry for content validations.
- **Features**: Record validations, consensus tracking, validator management
- **Access Control**: VALIDATOR_ROLE for validation submission
- **Events**: ValidationRecorded for blockchain transparency

### TruthCampaign.sol
Individual campaign contract for brand marketing initiatives.
- **Features**: Participation tracking, reward distribution, validation workflow
- **Budget Management**: Automatic budget tracking and remaining balance
- **Validation**: Optional validator consensus for participation approval

### TruthCampaignFactory.sol
Factory contract for creating and managing Truth Campaigns.
- **Features**: Campaign deployment, brand registration, fee collection
- **Access Control**: BRAND_ROLE for campaign creation
- **Configuration**: Adjustable creation fees and campaign duration limits

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Configure your private key and RPC URL in `.env` for Mumbai deployment.

## Compilation

```bash
npm run compile
```

## Deployment

### Local Development
```bash
# Start local Hardhat node (in separate terminal)
npm run node

# Deploy to local network
npm run deploy:local
```

### Polygon Amoy Testnet (Current - Mumbai deprecated April 2024)
```bash
# Make sure you have POLYGON_AMOY_PRIVATE_KEY and POLYGON_AMOY_RPC_URL in .env
npm run deploy:amoy
```

### Polygon Mainnet
```bash
# Make sure you have POLYGON_PRIVATE_KEY and POLYGON_RPC_URL in .env
npm run deploy:polygon
```

## Testing

```bash
npm run test
```

## Contract Interactions

The `utils/contractInteractions.ts` file provides a TypeScript interface for interacting with the deployed contracts:

```typescript
import { createAstraContracts } from './utils/contractInteractions';

const astra = createAstraContracts(
  privateKey,
  rpcUrl,
  contractAddresses
);

// Mint karma
await astra.mintKarma(userAddress, amount, reason);

// Record validation
await astra.recordValidation(contentHash, isAuthentic, notes);

// Create campaign
await astra.createTruthCampaign(campaignData, creationFee);
```

## Contract Addresses

After deployment, contract addresses are saved in `deployed-addresses/`:
- `localhost.json` - Local development addresses
- `amoy.json` - Amoy testnet addresses
- `polygon.json` - Polygon mainnet addresses

## Verification

To verify contracts on PolygonScan:
```bash
# Amoy testnet
npm run verify:amoy <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>

# Polygon mainnet
npm run verify:polygon <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Architecture

```
contracts/
├── contracts/           # Solidity contracts
├── ignition/modules/    # Deployment modules
├── scripts/            # Deployment and interaction scripts
├── utils/              # TypeScript utilities
├── test/               # Contract tests
└── deployed-addresses/ # Deployed contract addresses
```

## Gas Optimization

All contracts are compiled with:
- Optimizer enabled (200 runs)
- Via IR compilation for complex contracts
- Solidity 0.8.28 for latest optimizations

## Security Features

- **Access Control**: Role-based permissions using OpenZeppelin
- **Pausable**: Emergency pause functionality
- **Reentrancy Guard**: Protection against reentrancy attacks
- **Input Validation**: Comprehensive parameter validation
- **Event Logging**: Transparent on-chain event emission

## Integration with Backend

The backend service will use these contracts through the TypeScript utilities:

1. **Karma Management**: Mint/burn karma based on user actions
2. **Content Validation**: Record validation consensus on-chain
3. **Campaign Management**: Deploy and manage brand campaigns
4. **Transparency**: All critical actions recorded immutably

## Environment Variables

Required for Amoy testnet deployment:
```
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_AMOY_PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_api_key_for_verification
```

Required for Polygon mainnet deployment:
```
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_PRIVATE_KEY=your_private_key_here
POLYGONSCAN_API_KEY=your_api_key_for_verification
```