import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException, 
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KarmaService } from '../karma/karma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { SubmitValidationDto, ValidationVerdict } from './dto/submit-validation.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ValidationResponse, ConsensusResult, ValidationStats } from './interfaces/validation.interface';
import { KarmaReason } from '../karma/enums/karma-reason.enum';

@Injectable()
export class ValidationService {
  private readonly logger = new Logger(ValidationService.name);
  
  // Minimum league required for validation (Vajra+)
  private readonly VALIDATOR_LEAGUES = ['VAJRA', 'AGNEYASTRA', 'VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'];
  
  // Consensus requirements
  private readonly MIN_VALIDATIONS_FOR_CONSENSUS = 3;
  private readonly CONSENSUS_THRESHOLD = 0.67; // 67% agreement required
  
  // Karma rewards
  private readonly VALIDATION_KARMA_REWARD = 10;
  private readonly CONSENSUS_BONUS_KARMA = 5;

  constructor(
    private prisma: PrismaService,
    private karmaService: KarmaService,
    private blockchainService: BlockchainService
  ) {}

  async submitValidation(userId: string, dto: SubmitValidationDto): Promise<ValidationResponse> {
    this.logger.log(`User ${userId} submitting validation for post ${dto.postId}`);

    // Check if user has required league status
    await this.validateUserLeague(userId);

    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
      include: { author: { include: { profile: true } } }
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Prevent self-validation
    if (post.authorId === userId) {
      throw new BadRequestException('Cannot validate your own content');
    }

    // Check if user has already validated this post
    const existingValidation = await this.prisma.validation.findUnique({
      where: {
        postId_validatorId: {
          postId: dto.postId,
          validatorId: userId
        }
      }
    });

    if (existingValidation) {
      throw new BadRequestException('You have already validated this post');
    }

    // Create validation record
    const validation = await this.prisma.validation.create({
      data: {
        postId: dto.postId,
        validatorId: userId,
        verdict: dto.verdict,
        confidence: dto.confidence,
        notes: dto.notes,
      },
      include: {
        validator: {
          include: { profile: true }
        }
      }
    });

    // Award karma for validation
    await this.karmaService.awardKarma({
      userId,
      amount: this.VALIDATION_KARMA_REWARD,
      reason: KarmaReason.CONTENT_VALIDATION,
      metadata: {
        postId: dto.postId,
        verdict: dto.verdict,
        confidence: dto.confidence
      }
    });

    // Check for consensus after new validation
    const consensusResult = await this.checkConsensus(dto.postId);
    
    // If consensus reached, award bonus karma to all validators
    if (consensusResult.reached) {
      await this.awardConsensusBonus(dto.postId);
    }

    // Asynchronously record on blockchain
    this.recordOnBlockchain(validation.id).catch(error => {
      this.logger.error(`Failed to record validation ${validation.id} on blockchain`, error);
    });

    return this.mapValidationToResponse(validation);
  }

  async getValidations(postId: string, pagination: PaginationDto): Promise<{
    validations: ValidationResponse[];
    stats: ValidationStats;
    consensus: ConsensusResult;
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Check if post exists
    const post = await this.prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const [validations, total] = await Promise.all([
      this.prisma.validation.findMany({
        where: { postId },
        include: {
          validator: {
            include: { profile: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.validation.count({
        where: { postId }
      })
    ]);

    // Calculate stats
    const stats = this.calculateValidationStats(validations);
    
    // Check consensus
    const consensus = await this.checkConsensus(postId);

    return {
      validations: validations.map(v => this.mapValidationToResponse(v)),
      stats,
      consensus,
      total,
      page,
      limit,
    };
  }

  async checkConsensus(postId: string): Promise<ConsensusResult> {
    const validations = await this.prisma.validation.findMany({
      where: { postId }
    });

    const validatorCount = validations.length;
    
    if (validatorCount < this.MIN_VALIDATIONS_FOR_CONSENSUS) {
      return {
        reached: false,
        finalVerdict: 'PENDING',
        validatorCount,
        consensusPercentage: 0,
        verdictCounts: this.countVerdicts(validations)
      };
    }

    const verdictCounts = this.countVerdicts(validations);
    const maxCount = Math.max(verdictCounts.authentic, verdictCounts.fake, verdictCounts.uncertain);
    const consensusPercentage = (maxCount / validatorCount) * 100;

    if (consensusPercentage >= this.CONSENSUS_THRESHOLD * 100) {
      let finalVerdict: 'VERIFIED' | 'FLAGGED' | 'PENDING';
      
      if (verdictCounts.authentic === maxCount) {
        finalVerdict = 'VERIFIED';
      } else if (verdictCounts.fake === maxCount) {
        finalVerdict = 'FLAGGED';
      } else {
        finalVerdict = 'PENDING'; // Uncertain consensus
      }

      // Update post validation status if consensus reached
      await this.updatePostValidationStatus(postId, finalVerdict, validatorCount);

      // If content is flagged as fake, deduct karma from author
      if (finalVerdict === 'FLAGGED') {
        await this.handleFakeContentPenalty(postId);
      }

      return {
        reached: true,
        finalVerdict,
        validatorCount,
        consensusPercentage,
        verdictCounts
      };
    }

    return {
      reached: false,
      finalVerdict: 'PENDING',
      validatorCount,
      consensusPercentage,
      verdictCounts
    };
  }

  async recordOnBlockchain(validationId: string): Promise<string> {
    this.logger.log(`Recording validation ${validationId} on blockchain`);
    
    const validation = await this.prisma.validation.findUnique({
      where: { id: validationId },
      include: { post: true }
    });

    if (!validation) {
      throw new NotFoundException('Validation not found');
    }

    // If already recorded, return existing hash
    if (validation.blockchainTxHash) {
      return validation.blockchainTxHash;
    }

    try {
      // Record validation on blockchain (using ValidationRegistry contract)
      const txHash = await this.blockchainService.recordValidation(
        validation.postId,
        validation.validatorId,
        validation.verdict === ValidationVerdict.AUTHENTIC,
        validation.confidence
      );

      // Update validation with blockchain transaction hash
      await this.prisma.validation.update({
        where: { id: validationId },
        data: { blockchainTxHash: txHash }
      });

      // Start monitoring transaction confirmation
      this.monitorTransactionConfirmation(validationId, txHash);

      this.logger.log(`Validation ${validationId} recorded on blockchain: ${txHash}`);
      return txHash;
    } catch (error) {
      this.logger.error(`Failed to record validation ${validationId} on blockchain`, error);
      throw error;
    }
  }

  private async monitorTransactionConfirmation(validationId: string, txHash: string): Promise<void> {
    // Monitor transaction confirmation in background
    setTimeout(async () => {
      try {
        const confirmed = await this.blockchainService.confirmValidationTransaction(validationId, txHash);
        if (confirmed) {
          this.logger.log(`Validation ${validationId} blockchain transaction confirmed`);
          // Could trigger additional actions here like notifications
        } else {
          // Retry monitoring after delay
          setTimeout(() => this.monitorTransactionConfirmation(validationId, txHash), 30000);
        }
      } catch (error) {
        this.logger.error(`Error monitoring transaction confirmation for validation ${validationId}`, error);
      }
    }, 10000); // Check after 10 seconds
  }

  private async validateUserLeague(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User not found');
    }

    if (!this.VALIDATOR_LEAGUES.includes(user.profile.league)) {
      throw new ForbiddenException(
        `Validation requires ${this.VALIDATOR_LEAGUES[0]} league or higher. Current league: ${user.profile.league}`
      );
    }
  }

  private async updatePostValidationStatus(
    postId: string, 
    status: 'VERIFIED' | 'FLAGGED' | 'PENDING',
    validationCount: number
  ): Promise<void> {
    await this.prisma.post.update({
      where: { id: postId },
      data: {
        validationStatus: status,
        validationCount
      }
    });

    this.logger.log(`Post ${postId} validation status updated to ${status} with ${validationCount} validations`);
  }

  private async awardConsensusBonus(postId: string): Promise<void> {
    const validations = await this.prisma.validation.findMany({
      where: { postId },
      select: { validatorId: true }
    });

    // Award bonus karma to all validators who participated in reaching consensus
    const bonusPromises = validations.map(validation =>
      this.karmaService.awardKarma({
        userId: validation.validatorId,
        amount: this.CONSENSUS_BONUS_KARMA,
        reason: KarmaReason.CONTENT_VALIDATION,
        metadata: {
          postId,
          type: 'consensus_bonus'
        }
      })
    );

    await Promise.all(bonusPromises);
    this.logger.log(`Awarded consensus bonus karma to ${validations.length} validators for post ${postId}`);
  }

  private countVerdicts(validations: any[]): { authentic: number; fake: number; uncertain: number } {
    return validations.reduce(
      (counts, validation) => {
        switch (validation.verdict) {
          case ValidationVerdict.AUTHENTIC:
            counts.authentic++;
            break;
          case ValidationVerdict.FAKE:
            counts.fake++;
            break;
          case ValidationVerdict.UNCERTAIN:
            counts.uncertain++;
            break;
        }
        return counts;
      },
      { authentic: 0, fake: 0, uncertain: 0 }
    );
  }

  private calculateValidationStats(validations: any[]): ValidationStats {
    const verdictCounts = this.countVerdicts(validations);
    const totalValidations = validations.length;
    
    return {
      totalValidations,
      authenticCount: verdictCounts.authentic,
      fakeCount: verdictCounts.fake,
      uncertainCount: verdictCounts.uncertain,
      consensusReached: totalValidations >= this.MIN_VALIDATIONS_FOR_CONSENSUS
    };
  }

  private async handleFakeContentPenalty(postId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true }
    });

    if (post) {
      // Deduct karma from author for posting fake content
      await this.karmaService.deductKarma({
        userId: post.authorId,
        amount: 50, // Penalty for misinformation
        reason: KarmaReason.MISINFORMATION,
        metadata: {
          postId,
          type: 'fake_content_penalty'
        }
      });

      this.logger.log(`Deducted karma from author ${post.authorId} for fake content in post ${postId}`);
    }
  }

  private mapValidationToResponse(validation: any): ValidationResponse {
    return {
      id: validation.id,
      postId: validation.postId,
      validatorId: validation.validatorId,
      validator: {
        id: validation.validator.id,
        username: validation.validator.username,
        league: validation.validator.profile?.league || 'CHANDRIKA',
        karma: validation.validator.profile?.karma || 0,
      },
      verdict: validation.verdict,
      confidence: validation.confidence,
      notes: validation.notes,
      blockchainTxHash: validation.blockchainTxHash,
      createdAt: validation.createdAt,
    };
  }
}
