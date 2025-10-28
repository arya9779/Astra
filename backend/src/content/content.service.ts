import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateEngagementDto, RemoveEngagementDto, EngagementType } from './dto/engagement.dto';
import { PostResponse, ValidationStatus, PaginationDto } from './interfaces/content.interface';
import { IpfsService } from './services/ipfs.service';
import { KarmaService } from '../karma/karma.service';
import { KarmaReason } from '../karma/enums/karma-reason.enum';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private ipfsService: IpfsService,
    private karmaService: KarmaService,
    private aiService: AiService,
  ) {}

  async createPost(userId: string, dto: CreatePostDto, files?: Express.Multer.File[]): Promise<PostResponse> {
    // Validate user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let mediaUrls: string[] = [];
    let ipfsHash: string | undefined;

    // Handle file uploads to IPFS
    if (files && files.length > 0) {
      const uploadPromises = files.map(file => this.ipfsService.uploadToIPFS(file));
      const uploadResults = await Promise.all(uploadPromises);

      for (const result of uploadResults) {
        if (result.success) {
          if (result.ipfsHash) {
            mediaUrls.push(this.ipfsService.getIPFSUrl(result.ipfsHash));
          } else if (result.s3Url) {
            mediaUrls.push(result.s3Url);
          }
        }
      }
    }

    // Upload text content to IPFS if it's substantial
    if (dto.content.length > 500) {
      const textUpload = await this.ipfsService.uploadTextToIPFS(
        dto.content,
        `post-${Date.now()}.json`
      );
      if (textUpload.success && textUpload.ipfsHash) {
        ipfsHash = textUpload.ipfsHash;
      }
    }

    // Merge provided mediaUrls with uploaded file URLs
    if (dto.mediaUrls) {
      mediaUrls = [...mediaUrls, ...dto.mediaUrls];
    }

    // Run AI moderation before creating the post
    const moderationResult = await this.aiService.moderateContent(
      dto.content,
      mediaUrls.length > 0 ? mediaUrls : undefined,
      dto.mediaType
    );

    // Determine initial validation status based on AI moderation
    let initialValidationStatus = ValidationStatus.PENDING;
    
    if (!moderationResult.approved) {
      if (moderationResult.confidence > 0.95) {
        // Auto-reject content with >95% confidence of violation
        throw new BadRequestException(
          `Content rejected: ${moderationResult.reason || 'Content violates community guidelines'}`
        );
      } else if (moderationResult.requiresManualReview) {
        // Flag for manual review
        initialValidationStatus = ValidationStatus.FLAGGED;
      }
    }

    // Create the post
    const post = await this.prisma.post.create({
      data: {
        authorId: userId,
        content: dto.content,
        mediaUrls,
        mediaType: dto.mediaType || 'TEXT',
        ipfsHash,
        validationStatus: initialValidationStatus,
        validationCount: 0,
        // Store AI moderation metadata
        aiModerationResult: moderationResult as any,
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        engagements: true,
      },
    });

    // If content is flagged, add to moderation queue
    if (initialValidationStatus === ValidationStatus.FLAGGED) {
      await this.prisma.moderationQueue.create({
        data: {
          postId: post.id,
          reason: moderationResult.reason || 'Content flagged by AI moderation',
          aiFlags: moderationResult.flags,
          confidence: moderationResult.confidence,
          status: 'PENDING',
        },
      });
    }

    // Calculate engagement counts
    const engagementCounts = this.calculateEngagementCounts(post.engagements);

    return this.formatPostResponse(post, engagementCounts);
  }

  async getPost(postId: string): Promise<PostResponse> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        engagements: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const engagementCounts = this.calculateEngagementCounts(post.engagements);
    return this.formatPostResponse(post, engagementCounts);
  }

  async deletePost(postId: string, userId: string): Promise<void> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    if (post.authorId !== userId) {
      throw new BadRequestException('You can only delete your own posts');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });
  }

  async getFeed(userId: string, pagination: PaginationDto): Promise<PostResponse[]> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    // Get users that the current user follows
    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { followeeId: true },
    });

    const followingIds = following.map(f => f.followeeId);
    followingIds.push(userId); // Include user's own posts

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { in: followingIds },
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        engagements: true,
      },
      orderBy: {
        [sortBy]: sortOrder,
      },
      skip,
      take: limit,
    });

    return posts.map(post => {
      const engagementCounts = this.calculateEngagementCounts(post.engagements);
      return this.formatPostResponse(post, engagementCounts);
    });
  }

  async getReels(pagination: PaginationDto): Promise<PostResponse[]> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const posts = await this.prisma.post.findMany({
      where: {
        mediaType: 'VIDEO',
        validationStatus: { in: ['PENDING', 'VERIFIED'] },
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        engagements: true,
      },
      orderBy: [
        { validationStatus: 'desc' }, // Verified content first
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    return posts.map(post => {
      const engagementCounts = this.calculateEngagementCounts(post.engagements);
      return this.formatPostResponse(post, engagementCounts);
    });
  }

  async getDiscoveryFeed(pagination: PaginationDto, filters?: {
    validationStatus?: ValidationStatus;
    minKarma?: number;
    league?: string;
  }): Promise<PostResponse[]> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const whereClause: any = {
      validationStatus: { in: ['PENDING', 'VERIFIED'] },
    };

    if (filters?.validationStatus) {
      whereClause.validationStatus = filters.validationStatus;
    }

    if (filters?.minKarma || filters?.league) {
      whereClause.author = {
        profile: {},
      };

      if (filters.minKarma) {
        whereClause.author.profile.karma = { gte: filters.minKarma };
      }

      if (filters.league) {
        whereClause.author.profile.league = filters.league;
      }
    }

    const posts = await this.prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        engagements: true,
      },
      orderBy: [
        { validationStatus: 'desc' }, // Verified content first
        { validationCount: 'desc' }, // More validated content first
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    return posts.map(post => {
      const engagementCounts = this.calculateEngagementCounts(post.engagements);
      return this.formatPostResponse(post, engagementCounts);
    });
  }

  async getRecommendedPosts(userId: string, pagination: PaginationDto): Promise<PostResponse[]> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    // Get user's profile to understand their league and interests
    const userProfile = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!userProfile) {
      throw new NotFoundException('User not found');
    }

    // Simple recommendation algorithm:
    // 1. Posts from users in similar or higher leagues
    // 2. Highly validated content
    // 3. Recent posts with good engagement

    const posts = await this.prisma.post.findMany({
      where: {
        authorId: { not: userId }, // Exclude user's own posts
        validationStatus: { in: ['VERIFIED', 'PENDING'] },
        author: {
          profile: {
            league: { in: this.getSimilarLeagues(userProfile.profile?.league || 'CHANDRIKA') },
          },
        },
      },
      include: {
        author: {
          include: {
            profile: true,
          },
        },
        engagements: true,
      },
      orderBy: [
        { validationStatus: 'desc' },
        { validationCount: 'desc' },
        { createdAt: 'desc' },
      ],
      skip,
      take: limit,
    });

    return posts.map(post => {
      const engagementCounts = this.calculateEngagementCounts(post.engagements);
      return this.formatPostResponse(post, engagementCounts);
    });
  }

  private calculateEngagementCounts(engagements: any[]) {
    return {
      likes: engagements.filter(e => e.type === 'LIKE').length,
      comments: engagements.filter(e => e.type === 'COMMENT').length,
      shares: engagements.filter(e => e.type === 'SHARE').length,
    };
  }

  private formatPostResponse(post: any, engagementCounts: any): PostResponse {
    return {
      id: post.id,
      authorId: post.authorId,
      author: {
        id: post.author.id,
        username: post.author.username,
        karma: post.author.profile?.karma || 0,
        league: post.author.profile?.league || 'CHANDRIKA',
        avatarUrl: post.author.profile?.avatarUrl,
      },
      content: post.content,
      mediaUrls: post.mediaUrls,
      mediaType: post.mediaType,
      ipfsHash: post.ipfsHash,
      validationStatus: post.validationStatus as ValidationStatus,
      validationCount: post.validationCount,
      engagementCounts,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    };
  }

  async createEngagement(userId: string, dto: CreateEngagementDto): Promise<void> {
    // Verify post exists
    const post = await this.prisma.post.findUnique({
      where: { id: dto.postId },
      include: { author: true },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Prevent self-engagement for likes and shares
    if ((dto.type === EngagementType.LIKE || dto.type === EngagementType.SHARE) && post.authorId === userId) {
      throw new BadRequestException('You cannot like or share your own posts');
    }

    // Check if engagement already exists (for likes and shares)
    if (dto.type !== EngagementType.COMMENT) {
      const existingEngagement = await this.prisma.postEngagement.findUnique({
        where: {
          postId_userId_type: {
            postId: dto.postId,
            userId,
            type: dto.type,
          },
        },
      });

      if (existingEngagement) {
        throw new BadRequestException(`You have already ${dto.type.toLowerCase()}d this post`);
      }
    }

    // Create engagement
    await this.prisma.postEngagement.create({
      data: {
        postId: dto.postId,
        userId,
        type: dto.type,
      },
    });

    // Award karma for positive engagement
    if (dto.type === EngagementType.LIKE) {
      // Award karma to post author for receiving likes
      await this.karmaService.awardKarma({
        userId: post.authorId,
        amount: 2, // Small amount for receiving likes
        reason: KarmaReason.POSITIVE_ENGAGEMENT,
        metadata: {
          postId: dto.postId,
          engagementType: dto.type,
          fromUserId: userId,
        },
      });

      // Award small karma to user for positive engagement
      await this.karmaService.awardKarma({
        userId,
        amount: 1,
        reason: KarmaReason.POSITIVE_ENGAGEMENT,
        metadata: {
          postId: dto.postId,
          engagementType: dto.type,
        },
      });
    }
  }

  async removeEngagement(userId: string, dto: RemoveEngagementDto): Promise<void> {
    // Only allow removing likes and shares (not comments)
    if (dto.type === EngagementType.COMMENT) {
      throw new BadRequestException('Comments cannot be removed via this endpoint');
    }

    const engagement = await this.prisma.postEngagement.findUnique({
      where: {
        postId_userId_type: {
          postId: dto.postId,
          userId,
          type: dto.type,
        },
      },
    });

    if (!engagement) {
      throw new NotFoundException('Engagement not found');
    }

    await this.prisma.postEngagement.delete({
      where: {
        postId_userId_type: {
          postId: dto.postId,
          userId,
          type: dto.type,
        },
      },
    });
  }

  async getPostEngagements(postId: string): Promise<{
    likes: number;
    comments: number;
    shares: number;
    userEngagements?: { [key: string]: boolean };
  }> {
    const engagements = await this.prisma.postEngagement.findMany({
      where: { postId },
    });

    return {
      likes: engagements.filter(e => e.type === EngagementType.LIKE).length,
      comments: engagements.filter(e => e.type === EngagementType.COMMENT).length,
      shares: engagements.filter(e => e.type === EngagementType.SHARE).length,
    };
  }

  async getUserEngagementsForPost(postId: string, userId: string): Promise<{ [key: string]: boolean }> {
    const engagements = await this.prisma.postEngagement.findMany({
      where: {
        postId,
        userId,
      },
    });

    return {
      liked: engagements.some(e => e.type === EngagementType.LIKE),
      shared: engagements.some(e => e.type === EngagementType.SHARE),
    };
  }

  private getSimilarLeagues(userLeague: string): string[] {
    const leagues = ['CHANDRIKA', 'VAJRA', 'AGNEYASTRA', 'VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'];
    const currentIndex = leagues.indexOf(userLeague);
    
    if (currentIndex === -1) return leagues;
    
    // Return current league and higher leagues (more trusted content)
    return leagues.slice(currentIndex);
  }
}
