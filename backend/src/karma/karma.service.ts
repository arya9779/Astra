import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { AwardKarmaDto } from './dto/award-karma.dto';
import { DeductKarmaDto } from './dto/deduct-karma.dto';
import { PaginationDto } from './dto/pagination.dto';
import { KarmaTransaction, LeagueProgressionResult } from './interfaces/karma-transaction.interface';
import { KarmaReason } from './enums/karma-reason.enum';

@Injectable()
export class KarmaService {
  private readonly logger = new Logger(KarmaService.name);

  private readonly LEAGUE_THRESHOLDS = {
    CHANDRIKA: 0,
    VAJRA: 500,
    AGNEYASTRA: 1500,
    VARUNASTRA: 3500,
    PASHUPATASTRA: 8000,
    BRAHMASTRA: 15000,
  };

  private readonly LEAGUE_ASTRAS = {
    VAJRA: ['CONTENT_VALIDATION', 'DOWNVOTE_FAKE'],
    AGNEYASTRA: ['FAKE_MEDIA_DETECTION', 'LIVE_STREAMING'],
    VARUNASTRA: ['ENCRYPTED_BOARDS', 'PROFESSIONAL_COLLABORATION'],
    PASHUPATASTRA: ['TRUTH_COUNCIL_VOTING', 'MODERATOR_PRIVILEGES'],
    BRAHMASTRA: ['ASTRAL_NEXUS_DAO', 'ALL_ASTRA_POWERS'],
  };

  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService
  ) {}

  async awardKarma(dto: AwardKarmaDto): Promise<KarmaTransaction> {
    this.logger.log(`Awarding ${dto.amount} karma to user ${dto.userId} for ${dto.reason}`);

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profile) {
      throw new NotFoundException('User profile not found');
    }

    const currentKarma = user.profile.karma;
    const newBalance = currentKarma + dto.amount;

    // Create transaction record and update profile in a transaction
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Update user karma balance
      await tx.userProfile.update({
        where: { userId: dto.userId },
        data: { karma: newBalance },
      });

      // Create karma transaction record
      const karmaTransaction = await tx.karmaTransaction.create({
        data: {
          userId: dto.userId,
          amount: dto.amount,
          type: 'AWARD',
          reason: dto.reason,
          balanceAfter: newBalance,
          metadata: dto.metadata,
        },
      });

      return karmaTransaction;
    });

    // Check for league progression after awarding karma
    await this.checkLeagueProgression(dto.userId);

    // Asynchronously sync to blockchain (don't wait for it)
    this.syncToBlockchain(transaction.id).catch((error) => {
      this.logger.error(`Failed to sync transaction ${transaction.id} to blockchain`, error);
    });

    return {
      id: transaction.id,
      userId: transaction.userId,
      amount: transaction.amount,
      type: transaction.type as 'AWARD' | 'DEDUCT',
      reason: transaction.reason as KarmaReason,
      balanceAfter: transaction.balanceAfter,
      blockchainTxHash: transaction.blockchainTxHash || undefined,
      metadata: transaction.metadata as Record<string, any> | undefined,
      createdAt: transaction.createdAt,
    };
  }

  async deductKarma(dto: DeductKarmaDto): Promise<KarmaTransaction> {
    this.logger.log(`Deducting ${dto.amount} karma from user ${dto.userId} for ${dto.reason}`);

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profile) {
      throw new NotFoundException('User profile not found');
    }

    const currentKarma = user.profile.karma;
    
    // Prevent negative karma balance
    const deductionAmount = Math.min(dto.amount, currentKarma);
    const newBalance = Math.max(0, currentKarma - dto.amount);

    if (deductionAmount < dto.amount) {
      this.logger.warn(
        `Attempted to deduct ${dto.amount} karma from user ${dto.userId} but only ${deductionAmount} available`
      );
    }

    // Create transaction record and update profile in a transaction
    const transaction = await this.prisma.$transaction(async (tx) => {
      // Update user karma balance
      await tx.userProfile.update({
        where: { userId: dto.userId },
        data: { karma: newBalance },
      });

      // Create karma transaction record
      const karmaTransaction = await tx.karmaTransaction.create({
        data: {
          userId: dto.userId,
          amount: deductionAmount,
          type: 'DEDUCT',
          reason: dto.reason,
          balanceAfter: newBalance,
          metadata: dto.metadata,
        },
      });

      return karmaTransaction;
    });

    // Asynchronously sync to blockchain (don't wait for it)
    this.syncToBlockchain(transaction.id).catch((error) => {
      this.logger.error(`Failed to sync transaction ${transaction.id} to blockchain`, error);
    });

    return {
      id: transaction.id,
      userId: transaction.userId,
      amount: transaction.amount,
      type: transaction.type as 'AWARD' | 'DEDUCT',
      reason: transaction.reason as KarmaReason,
      balanceAfter: transaction.balanceAfter,
      blockchainTxHash: transaction.blockchainTxHash || undefined,
      metadata: transaction.metadata as Record<string, any> | undefined,
      createdAt: transaction.createdAt,
    };
  }

  async getKarmaHistory(
    userId: string,
    pagination: PaginationDto
  ): Promise<{ transactions: KarmaTransaction[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [transactions, total] = await Promise.all([
      this.prisma.karmaTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.karmaTransaction.count({
        where: { userId },
      }),
    ]);

    return {
      transactions: transactions.map((tx) => ({
        id: tx.id,
        userId: tx.userId,
        amount: tx.amount,
        type: tx.type as 'AWARD' | 'DEDUCT',
        reason: tx.reason as KarmaReason,
        balanceAfter: tx.balanceAfter,
        blockchainTxHash: tx.blockchainTxHash || undefined,
        metadata: tx.metadata as Record<string, any> | undefined,
        createdAt: tx.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async checkLeagueProgression(userId: string): Promise<LeagueProgressionResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User not found');
    }

    const currentKarma = user.profile.karma;
    const currentLeague = user.profile.league;

    // Determine the appropriate league based on karma
    let newLeague = currentLeague;
    const leagues = Object.keys(this.LEAGUE_THRESHOLDS) as Array<keyof typeof this.LEAGUE_THRESHOLDS>;

    for (let i = leagues.length - 1; i >= 0; i--) {
      const league = leagues[i];
      if (currentKarma >= this.LEAGUE_THRESHOLDS[league]) {
        newLeague = league;
        break;
      }
    }

    // Check if promotion occurred
    if (newLeague !== currentLeague) {
      this.logger.log(`User ${userId} promoted from ${currentLeague} to ${newLeague}`);

      // Update league in database
      await this.prisma.userProfile.update({
        where: { userId },
        data: { league: newLeague },
      });

      // Unlock new Astras for the new league
      const unlockedAstras = await this.unlockAstrasForLeague(userId, newLeague);

      return {
        promoted: true,
        oldLeague: currentLeague,
        newLeague,
        unlockedAstras,
      };
    }

    return {
      promoted: false,
    };
  }

  private async unlockAstrasForLeague(userId: string, league: string): Promise<string[]> {
    const astrasToUnlock = this.LEAGUE_ASTRAS[league] || [];

    if (astrasToUnlock.length === 0) {
      return [];
    }

    // Get already unlocked astras
    const existingAstras = await this.prisma.userAstra.findMany({
      where: { userId },
      select: { astraType: true },
    });

    const existingAstraTypes = existingAstras.map((a) => a.astraType);

    // Filter out already unlocked astras
    const newAstras = astrasToUnlock.filter((astra) => !existingAstraTypes.includes(astra));

    if (newAstras.length === 0) {
      return [];
    }

    // Unlock new astras
    await this.prisma.userAstra.createMany({
      data: newAstras.map((astraType) => ({
        userId,
        astraType,
      })),
      skipDuplicates: true,
    });

    this.logger.log(`Unlocked astras for user ${userId}: ${newAstras.join(', ')}`);

    return newAstras;
  }

  async syncToBlockchain(transactionId: string): Promise<string> {
    this.logger.log(`Syncing transaction ${transactionId} to blockchain`);
    
    const transaction = await this.prisma.karmaTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    // If already synced, return existing hash
    if (transaction.blockchainTxHash) {
      this.logger.log(`Transaction ${transactionId} already synced: ${transaction.blockchainTxHash}`);
      return transaction.blockchainTxHash;
    }

    try {
      // Record transaction on blockchain
      const txHash = await this.blockchainService.recordKarmaTransaction(
        transaction.userId,
        transaction.amount,
        transaction.type as 'AWARD' | 'DEDUCT',
        transaction.reason
      );

      // Update database with blockchain transaction hash
      await this.prisma.karmaTransaction.update({
        where: { id: transactionId },
        data: { blockchainTxHash: txHash },
      });

      this.logger.log(`Transaction ${transactionId} synced to blockchain: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Failed to sync transaction ${transactionId} to blockchain`, error);
      
      // Attempt retry with exponential backoff
      try {
        const txHash = await this.blockchainService.retryFailedTransaction(transactionId);
        
        await this.prisma.karmaTransaction.update({
          where: { id: transactionId },
          data: { blockchainTxHash: txHash },
        });

        return txHash;
      } catch (retryError) {
        this.logger.error(`Retry failed for transaction ${transactionId}`, retryError);
        throw retryError;
      }
    }
  }
}
