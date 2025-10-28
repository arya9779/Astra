# Polygon Network Configuration

## Current Status (October 2024)

### ❌ Deprecated Networks
- **Mumbai Testnet** - Deprecated April 2024
  - Chain ID: 80001
  - Status: No longer supported
  - Replacement: Amoy Testnet

### ✅ Active Networks

#### Polygon Amoy Testnet (Current Testnet)
- **Chain ID**: 80002
- **RPC URL**: https://rpc-amoy.polygon.technology
- **Block Explorer**: https://amoy.polygonscan.com
- **Faucet**: https://faucet.polygon.technology
- **Status**: Active since April 2024

#### Polygon PoS Mainnet
- **Chain ID**: 137
- **RPC URL**: https://polygon-rpc.com
- **Block Explorer**: https://polygonscan.com
- **Native Token**: MATIC
- **Status**: Production ready

## Integration Details

### How I Integrated Polygon

1. **Network Configuration**: Updated Hardhat config with correct chain IDs and RPC URLs
2. **Environment Variables**: Set up proper env vars for Amoy testnet and mainnet
3. **Deployment Scripts**: Created deployment scripts for both networks
4. **Gas Configuration**: Set appropriate gas prices for Polygon networks
5. **Block Explorer Integration**: Configured for contract verification on PolygonScan

### Key Changes Made

```typescript
// Hardhat Config
polygonAmoy: {
  chainId: 80002,
  url: configVariable("POLYGON_AMOY_RPC_URL"),
  accounts: [configVariable("POLYGON_AMOY_PRIVATE_KEY")],
  gasPrice: 30000000000, // 30 gwei
},
polygon: {
  chainId: 137,
  url: configVariable("POLYGON_RPC_URL"), 
  accounts: [configVariable("POLYGON_PRIVATE_KEY")],
  gasPrice: 30000000000, // 30 gwei
}
```

### Environment Variables Required

```bash
# Amoy Testnet
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_AMOY_PRIVATE_KEY=your_private_key_here

# Polygon Mainnet  
POLYGON_RPC_URL=https://polygon-rpc.com
POLYGON_PRIVATE_KEY=your_private_key_here

# For contract verification
POLYGONSCAN_API_KEY=your_api_key_here
```

### Alternative RPC Providers

#### Alchemy
- Amoy: `https://polygon-amoy.g.alchemy.com/v2/YOUR-API-KEY`
- Mainnet: `https://polygon-mainnet.g.alchemy.com/v2/YOUR-API-KEY`

#### Infura
- Amoy: `https://polygon-amoy.infura.io/v3/YOUR-PROJECT-ID`
- Mainnet: `https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID`

#### QuickNode
- Amoy: Available through QuickNode dashboard
- Mainnet: Available through QuickNode dashboard

## Deployment Commands

```bash
# Deploy to Amoy testnet
npm run deploy:amoy

# Deploy to Polygon mainnet
npm run deploy:polygon

# Verify contracts
npm run verify:amoy <CONTRACT_ADDRESS>
npm run verify:polygon <CONTRACT_ADDRESS>
```

## Getting Test MATIC

For Amoy testnet, get test MATIC from:
- **Official Faucet**: https://faucet.polygon.technology
- **Alchemy Faucet**: https://www.alchemy.com/faucets/polygon-amoy
- **QuickNode Faucet**: https://faucet.quicknode.com/polygon/amoy

## Migration Notes

If you have existing Mumbai contracts:
1. Redeploy to Amoy testnet using new scripts
2. Update frontend/backend to use new contract addresses
3. Update RPC URLs and chain IDs
4. Test thoroughly on Amoy before mainnet deployment

## Security Considerations

- Always test on Amoy before mainnet deployment
- Use hardware wallets for mainnet private keys
- Consider multi-sig wallets for contract ownership
- Perform security audits before mainnet deployment
- Monitor gas prices and adjust accordingly