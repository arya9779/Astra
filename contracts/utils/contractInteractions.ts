import { createPublicClient, createWalletClient, http, getContract, Address, parseEther } from 'viem';
import { polygonMumbai } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// Contract ABIs (these would be generated from compilation)
import KarmaTokenABI from '../artifacts/contracts/KarmaToken.sol/KarmaToken.json';
import ValidationRegistryABI from '../artifacts/contracts/ValidationRegistry.sol/ValidationRegistry.json';
import TruthCampaignABI from '../artifacts/contracts/TruthCampaign.sol/TruthCampaign.json';
import TruthCampaignFactoryABI from '../artifacts/contracts/TruthCampaignFactory.sol/TruthCampaignFactory.json';

// Types
export interface ContractAddresses {
  karmaToken: Address;
  validationRegistry: Address;
  truthCampaignFactory: Address;
}

export interface KarmaTransaction {
  to: Address;
  amount: bigint;
  reason: string;
}

export interface ValidationData {
  contentHash: string;
  isAuthentic: boolean;
  notes?: string;
}

export interface CampaignData {
  name: string;
  description: string;
  karmaReward: bigint;
  totalBudget: bigint;
  maxParticipants: bigint;
  startTime: bigint;
  endTime: bigint;
  requiresValidation: boolean;
}

/**
 * Contract interaction utility class for Astra platform smart contracts
 */
export class AstraContractInteractions {
  private publicClient;
  private walletClient;
  private account;
  private contracts: ContractAddresses;

  constructor(
    privateKey: string,
    rpcUrl: string,
    contractAddresses: ContractAddresses
  ) {
    this.account = privateKeyToAccount(privateKey as `0x${string}`);
    
    this.publicClient = createPublicClient({
      chain: polygonMumbai,
      transport: http(rpcUrl),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: polygonMumbai,
      transport: http(rpcUrl),
    });

    this.contracts = contractAddresses;
  }

  // Karma Token Interactions
  async mintKarma(to: Address, amount: bigint, reason: string): Promise<string> {
    const karmaToken = getContract({
      address: this.contracts.karmaToken,
      abi: KarmaTokenABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await karmaToken.write.mint([to, amount, reason]);
    return hash;
  }

  async burnKarma(from: Address, amount: bigint, reason: string): Promise<string> {
    const karmaToken = getContract({
      address: this.contracts.karmaToken,
      abi: KarmaTokenABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await karmaToken.write.burn([from, amount, reason]);
    return hash;
  }

  async getKarmaBalance(address: Address): Promise<bigint> {
    const karmaToken = getContract({
      address: this.contracts.karmaToken,
      abi: KarmaTokenABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return await karmaToken.read.balanceOf([address]);
  }

  async batchMintKarma(
    recipients: Address[], 
    amounts: bigint[], 
    reason: string
  ): Promise<string> {
    const karmaToken = getContract({
      address: this.contracts.karmaToken,
      abi: KarmaTokenABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await karmaToken.write.batchMint([recipients, amounts, reason]);
    return hash;
  }

  // Validation Registry Interactions
  async recordValidation(
    contentHash: string,
    isAuthentic: boolean,
    notes: string = ""
  ): Promise<string> {
    const validationRegistry = getContract({
      address: this.contracts.validationRegistry,
      abi: ValidationRegistryABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await validationRegistry.write.recordValidation([
      contentHash as `0x${string}`,
      isAuthentic,
      notes
    ]);
    return hash;
  }

  async getValidations(contentHash: string) {
    const validationRegistry = getContract({
      address: this.contracts.validationRegistry,
      abi: ValidationRegistryABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return await validationRegistry.read.getValidations([contentHash as `0x${string}`]);
  }

  async getValidationConsensus(contentHash: string) {
    const validationRegistry = getContract({
      address: this.contracts.validationRegistry,
      abi: ValidationRegistryABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return await validationRegistry.read.getValidationConsensus([contentHash as `0x${string}`]);
  }

  async addValidator(validatorAddress: Address): Promise<string> {
    const validationRegistry = getContract({
      address: this.contracts.validationRegistry,
      abi: ValidationRegistryABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await validationRegistry.write.addValidator([validatorAddress]);
    return hash;
  }

  // Truth Campaign Factory Interactions
  async createTruthCampaign(
    campaignData: CampaignData,
    creationFee: bigint
  ): Promise<{ hash: string; campaignAddress?: Address }> {
    const factory = getContract({
      address: this.contracts.truthCampaignFactory,
      abi: TruthCampaignFactoryABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await factory.write.createCampaign([
      campaignData.name,
      campaignData.description,
      campaignData.karmaReward,
      campaignData.totalBudget,
      campaignData.maxParticipants,
      campaignData.startTime,
      campaignData.endTime,
      campaignData.requiresValidation
    ], { value: creationFee });

    // Wait for transaction receipt to get the campaign address
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash });
    
    // Parse logs to get campaign address (would need to implement log parsing)
    return { hash, campaignAddress: undefined }; // TODO: Parse campaign address from logs
  }

  async registerBrand(brandAddress: Address): Promise<string> {
    const factory = getContract({
      address: this.contracts.truthCampaignFactory,
      abi: TruthCampaignFactoryABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await factory.write.registerBrand([brandAddress]);
    return hash;
  }

  async getAllCampaigns() {
    const factory = getContract({
      address: this.contracts.truthCampaignFactory,
      abi: TruthCampaignFactoryABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return await factory.read.getAllCampaigns();
  }

  async getCampaignsByBrand(brandAddress: Address) {
    const factory = getContract({
      address: this.contracts.truthCampaignFactory,
      abi: TruthCampaignFactoryABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return await factory.read.getCampaignsByBrand([brandAddress]);
  }

  // Truth Campaign Interactions (for specific campaign contract)
  async participateInCampaign(
    campaignAddress: Address,
    contentHash: string
  ): Promise<string> {
    const campaign = getContract({
      address: campaignAddress,
      abi: TruthCampaignABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await campaign.write.participate([contentHash]);
    return hash;
  }

  async validateCampaignParticipation(
    campaignAddress: Address,
    participantAddress: Address,
    isValid: boolean
  ): Promise<string> {
    const campaign = getContract({
      address: campaignAddress,
      abi: TruthCampaignABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await campaign.write.validateParticipation([participantAddress, isValid]);
    return hash;
  }

  async claimCampaignReward(campaignAddress: Address): Promise<string> {
    const campaign = getContract({
      address: campaignAddress,
      abi: TruthCampaignABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    const hash = await campaign.write.claimReward();
    return hash;
  }

  async getCampaignInfo(campaignAddress: Address) {
    const campaign = getContract({
      address: campaignAddress,
      abi: TruthCampaignABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return await campaign.read.getCampaignInfo();
  }

  async getCampaignParticipation(
    campaignAddress: Address,
    participantAddress: Address
  ) {
    const campaign = getContract({
      address: campaignAddress,
      abi: TruthCampaignABI.abi,
      client: { public: this.publicClient, wallet: this.walletClient },
    });

    return await campaign.read.getParticipation([participantAddress]);
  }

  // Utility Methods
  async waitForTransaction(hash: string) {
    return await this.publicClient.waitForTransactionReceipt({ hash: hash as `0x${string}` });
  }

  async getTransactionReceipt(hash: string) {
    return await this.publicClient.getTransactionReceipt({ hash: hash as `0x${string}` });
  }

  async estimateGas(to: Address, data: string, value?: bigint) {
    return await this.publicClient.estimateGas({
      account: this.account,
      to,
      data: data as `0x${string}`,
      value,
    });
  }

  getAccount(): Address {
    return this.account.address;
  }

  getContractAddresses(): ContractAddresses {
    return this.contracts;
  }
}

// Helper function to create contract interactions instance
export function createAstraContracts(
  privateKey: string,
  rpcUrl: string,
  contractAddresses: ContractAddresses
): AstraContractInteractions {
  return new AstraContractInteractions(privateKey, rpcUrl, contractAddresses);
}

// Helper function to convert string to bytes32
export function stringToBytes32(str: string): string {
  // Simple implementation - in production, use proper hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hash = new Uint8Array(32);
  hash.set(data.slice(0, 32));
  return '0x' + Array.from(hash).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper function to calculate karma amounts
export function calculateKarmaAmount(action: string): bigint {
  const karmaAmounts: Record<string, bigint> = {
    'CONTENT_VALIDATION': BigInt(10),
    'ORIGINAL_CONTENT': BigInt(15),
    'POSITIVE_ENGAGEMENT': BigInt(5),
    'MODERATION_HELP': BigInt(20),
    'MISINFORMATION': BigInt(-50),
    'FAKE_ENGAGEMENT': BigInt(-30),
    'DECEPTION': BigInt(-25),
  };

  return karmaAmounts[action] || BigInt(0);
}