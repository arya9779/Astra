import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KarmaService } from '../karma/karma.service';
import { KarmaReason } from '../karma/enums/karma-reason.enum';
import { ReviewModerationDto, ModerationQueueItem, PaginationDto, ModerationAction } from './dto/moderation.dto';

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    private karmaService: KarmaService,
  ) {}

  /**
   * Get moderation queue for Validators (League-gated to Vajra+)
   */
  async getModerationQueue(
    validatorId: string,
    pagination: PaginationDto = {}
  ): Promise<{ items: ModerationQueueItem[]; total: number }> {
    // Check if user has Validator privileges (Vajra League or higher)
    const validator = await this.prisma.user.findUnique({
      where: { id: validatorId },
      include: { profile: true },
    });

    if (!validator) {
      throw new NotFoundException('User not found');
    }

    const validatorLeague = validator.profile?.league || 'CHANDRIKA';
    const allowedLeagues = ['VAJRA', 'AGNEYASTRA', 'VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'];
    
    if (!allowedLeagues.includes(validatorLeague)) {
      throw new ForbiddenException('Insufficient privileges. Vajra League or higher required for moderation.');
    }

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Get pending moderation items
    const [items, total] = await Promise.all([
      this.prisma.moderationQueue.findMany({
        where: {
          status: 'PENDING',
        },
        include: {
          post: {
            include: {
              author: {
                include: {
                  profile: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc', // Oldest first (FIFO)
        },
        skip,
        take: limit,
      }),
      this.prisma.moderationQueue.count({
        where: {
          status: 'PENDING',
        },
      }),
    ]);

    const formattedItems: ModerationQueueItem[] = items.map(item => ({
      id: item.id,
      postId: item.postId,
      post: {
        id: item.post.id,
        content: item.post.content,
        mediaUrls: item.post.mediaUrls,
        mediaType: item.post.mediaType || 'TEXT',
        author: {
          id: item.post.author.id,
          username: item.post.author.username,
          karma: item.post.author.profile?.karma || 0,
          league: item.post.author.profile?.league || 'CHANDRIKA',
        },
        createdAt: item.post.createdAt,
      },
      reason: item.reason,
      aiFlags: item.aiFlags,
      confidence: item.confidence,
      status: item.status,
      createdAt: item.createdAt,
    }));

    return {
      items: formattedItems,
      total,
    };
  }

  /**
   * Review a moderation item (approve/reject)
   */
  async reviewModeration(validatorId: string, dto: ReviewModerationDto): Promise<void> {
    // Check if user has Validator privileges
    const validator = await this.prisma.user.findUnique({
      where: { id: validatorId },
      include: { profile: true },
    });

    if (!validator) {
      throw new NotFoundException('User not found');
    }

    const validatorLeague = validator.profile?.league || 'CHANDRIKA';
    const allowedLeagues = ['VAJRA', 'AGNEYASTRA', 'VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'];
    
    if (!allowedLeagues.includes(validatorLeague)) {
      throw new ForbiddenException('Insufficient privileges. Vajra League or higher required for moderation.');
    }

    // Get the moderation item
    const moderationItem = await this.prisma.moderationQueue.findUnique({
      where: { id: dto.moderationId },
      include: {
        post: {
          include: {
            author: true,
          },
        },
      },
    });

    if (!moderationItem) {
      throw new NotFoundException('Moderation item not found');
    }

    if (moderationItem.status !== 'PENDING') {
      throw new BadRequestException('This moderation item has already been reviewed');
    }

    // Update moderation status
    const newStatus = dto.action === ModerationAction.APPROVE ? 'APPROVED' : 'REJECTED';
    
    await this.prisma.moderationQueue.update({
      where: { id: dto.moderationId },
      data: {
        status: newStatus,
        reviewedBy: validatorId,
        reviewedAt: new Date(),
        reviewNotes: dto.notes,
      },
    });

    // Update post validation status
    const newPostStatus = dto.action === ModerationAction.APPROVE ? 'PENDING' : 'REJECTED';
    
    await this.prisma.post.update({
      where: { id: moderationItem.postId },
      data: {
        validationStatus: newPostStatus,
      },
    });

    // Award/deduct karma based on moderation decision
    if (dto.action === ModerationAction.APPROVE) {
      // Award karma to validator for confirmed moderation
      await this.karmaService.awardKarma({
        userId: validatorId,
        amount: 10,
        reason: KarmaReason.MODERATION_HELP,
        metadata: {
          moderationId: dto.moderationId,
          postId: moderationItem.postId,
          action: 'APPROVE',
        },
      });
    } else {
      // Award karma to validator for confirmed harmful content detection
      await this.karmaService.awardKarma({
        userId: validatorId,
        amount: 20,
        reason: KarmaReason.MODERATION_HELP,
        metadata: {
          moderationId: dto.moderationId,
          postId: moderationItem.postId,
          action: 'REJECT',
        },
      });

      // Deduct karma from post author for policy violation
      await this.karmaService.deductKarma({
        userId: moderationItem.post.authorId,
        amount: 30,
        reason: KarmaReason.FAKE_ENGAGEMENT, // Using closest available reason
        metadata: {
          moderationId: dto.moderationId,
          postId: moderationItem.postId,
          violation: moderationItem.reason,
        },
      });
    }
  }

  /**
   * Get moderation statistics for a validator
   */
  async getModerationStats(validatorId: string): Promise<{
    totalReviewed: number;
    approved: number;
    rejected: number;
    karmaEarned: number;
  }> {
    const validator = await this.prisma.user.findUnique({
      where: { id: validatorId },
      include: { profile: true },
    });

    if (!validator) {
      throw new NotFoundException('User not found');
    }

    const validatorLeague = validator.profile?.league || 'CHANDRIKA';
    const allowedLeagues = ['VAJRA', 'AGNEYASTRA', 'VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'];
    
    if (!allowedLeagues.includes(validatorLeague)) {
      throw new ForbiddenException('Insufficient privileges. Vajra League or higher required for moderation.');
    }

    const [totalReviewed, approved, rejected, karmaTransactions] = await Promise.all([
      this.prisma.moderationQueue.count({
        where: {
          reviewedBy: validatorId,
          status: { in: ['APPROVED', 'REJECTED'] },
        },
      }),
      this.prisma.moderationQueue.count({
        where: {
          reviewedBy: validatorId,
          status: 'APPROVED',
        },
      }),
      this.prisma.moderationQueue.count({
        where: {
          reviewedBy: validatorId,
          status: 'REJECTED',
        },
      }),
      this.prisma.karmaTransaction.findMany({
        where: {
          userId: validatorId,
          reason: KarmaReason.MODERATION_HELP,
          type: 'AWARD',
        },
      }),
    ]);

    const karmaEarned = karmaTransactions.reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalReviewed,
      approved,
      rejected,
      karmaEarned,
    };
  }
}