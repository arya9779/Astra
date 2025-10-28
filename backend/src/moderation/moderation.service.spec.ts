import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../prisma/prisma.service';
import { KarmaService } from '../karma/karma.service';
import { ModerationAction } from './dto/moderation.dto';

describe('ModerationService', () => {
  let service: ModerationService;
  let prismaService: PrismaService;
  let karmaService: KarmaService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    moderationQueue: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    post: {
      update: jest.fn(),
    },
    karmaTransaction: {
      findMany: jest.fn(),
    },
  };

  const mockKarmaService = {
    awardKarma: jest.fn(),
    deductKarma: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: KarmaService,
          useValue: mockKarmaService,
        },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
    prismaService = module.get<PrismaService>(PrismaService);
    karmaService = module.get<KarmaService>(KarmaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getModerationQueue', () => {
    const mockValidator = {
      id: 'validator-id',
      profile: {
        league: 'VAJRA',
      },
    };

    const mockModerationItems = [
      {
        id: 'moderation-1',
        postId: 'post-1',
        reason: 'AI flagged content',
        aiFlags: ['inappropriate_content'],
        confidence: 0.8,
        status: 'PENDING',
        createdAt: new Date(),
        post: {
          id: 'post-1',
          content: 'Flagged content',
          mediaUrls: [],
          mediaType: 'TEXT',
          createdAt: new Date(),
          author: {
            id: 'author-1',
            username: 'testuser',
            profile: {
              karma: 100,
              league: 'CHANDRIKA',
            },
          },
        },
      },
    ];

    it('should return moderation queue for valid validator', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockValidator);
      mockPrismaService.moderationQueue.findMany.mockResolvedValue(mockModerationItems);
      mockPrismaService.moderationQueue.count.mockResolvedValue(1);

      const result = await service.getModerationQueue('validator-id');

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('moderation-1');
      expect(result.items[0].post.author.username).toBe('testuser');
    });

    it('should throw NotFoundException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getModerationQueue('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for insufficient privileges', async () => {
      const lowLeagueUser = {
        id: 'user-id',
        profile: {
          league: 'CHANDRIKA',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(lowLeagueUser);

      await expect(service.getModerationQueue('user-id')).rejects.toThrow(ForbiddenException);
    });

    it('should handle pagination correctly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockValidator);
      mockPrismaService.moderationQueue.findMany.mockResolvedValue([]);
      mockPrismaService.moderationQueue.count.mockResolvedValue(0);

      const result = await service.getModerationQueue('validator-id', { page: 2, limit: 5 });

      expect(mockPrismaService.moderationQueue.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5, // (page - 1) * limit
          take: 5,
        })
      );
    });
  });

  describe('reviewModeration', () => {
    const mockValidator = {
      id: 'validator-id',
      profile: {
        league: 'VAJRA',
      },
    };

    const mockModerationItem = {
      id: 'moderation-1',
      postId: 'post-1',
      status: 'PENDING',
      post: {
        id: 'post-1',
        authorId: 'author-1',
        author: {
          id: 'author-1',
        },
      },
    };

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockValidator);
      mockPrismaService.moderationQueue.findUnique.mockResolvedValue(mockModerationItem);
      mockPrismaService.moderationQueue.update.mockResolvedValue({});
      mockPrismaService.post.update.mockResolvedValue({});
      mockKarmaService.awardKarma.mockResolvedValue({});
      mockKarmaService.deductKarma.mockResolvedValue({});
    });

    it('should approve content and award karma to validator', async () => {
      const reviewDto = {
        moderationId: 'moderation-1',
        action: ModerationAction.APPROVE,
        notes: 'Content is appropriate',
      };

      await service.reviewModeration('validator-id', reviewDto);

      expect(mockPrismaService.moderationQueue.update).toHaveBeenCalledWith({
        where: { id: 'moderation-1' },
        data: expect.objectContaining({
          status: 'APPROVED',
          reviewedBy: 'validator-id',
          reviewNotes: 'Content is appropriate',
        }),
      });

      expect(mockPrismaService.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { validationStatus: 'PENDING' },
      });

      expect(mockKarmaService.awardKarma).toHaveBeenCalledWith({
        userId: 'validator-id',
        amount: 10,
        reason: expect.any(String),
        metadata: expect.objectContaining({
          action: 'APPROVE',
        }),
      });
    });

    it('should reject content and deduct karma from author', async () => {
      const reviewDto = {
        moderationId: 'moderation-1',
        action: ModerationAction.REJECT,
        notes: 'Content violates guidelines',
      };

      await service.reviewModeration('validator-id', reviewDto);

      expect(mockPrismaService.moderationQueue.update).toHaveBeenCalledWith({
        where: { id: 'moderation-1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          reviewedBy: 'validator-id',
          reviewNotes: 'Content violates guidelines',
        }),
      });

      expect(mockPrismaService.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { validationStatus: 'REJECTED' },
      });

      expect(mockKarmaService.awardKarma).toHaveBeenCalledWith({
        userId: 'validator-id',
        amount: 20,
        reason: expect.any(String),
        metadata: expect.objectContaining({
          action: 'REJECT',
        }),
      });

      expect(mockKarmaService.deductKarma).toHaveBeenCalledWith({
        userId: 'author-1',
        amount: 30,
        reason: expect.any(String),
        metadata: expect.any(Object),
      });
    });

    it('should throw NotFoundException for non-existent moderation item', async () => {
      mockPrismaService.moderationQueue.findUnique.mockResolvedValue(null);

      const reviewDto = {
        moderationId: 'invalid-id',
        action: ModerationAction.APPROVE,
      };

      await expect(service.reviewModeration('validator-id', reviewDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already reviewed item', async () => {
      const reviewedItem = {
        ...mockModerationItem,
        status: 'APPROVED',
      };

      mockPrismaService.moderationQueue.findUnique.mockResolvedValue(reviewedItem);

      const reviewDto = {
        moderationId: 'moderation-1',
        action: ModerationAction.APPROVE,
      };

      await expect(service.reviewModeration('validator-id', reviewDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for insufficient privileges', async () => {
      const lowLeagueUser = {
        id: 'user-id',
        profile: {
          league: 'CHANDRIKA',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(lowLeagueUser);

      const reviewDto = {
        moderationId: 'moderation-1',
        action: ModerationAction.APPROVE,
      };

      await expect(service.reviewModeration('user-id', reviewDto)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getModerationStats', () => {
    const mockValidator = {
      id: 'validator-id',
      profile: {
        league: 'VAJRA',
      },
    };

    const mockKarmaTransactions = [
      { amount: 10 },
      { amount: 20 },
      { amount: 10 },
    ];

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockValidator);
    });

    it('should return correct moderation statistics', async () => {
      mockPrismaService.moderationQueue.count
        .mockResolvedValueOnce(15) // totalReviewed
        .mockResolvedValueOnce(10) // approved
        .mockResolvedValueOnce(5); // rejected

      mockPrismaService.karmaTransaction.findMany.mockResolvedValue(mockKarmaTransactions);

      const result = await service.getModerationStats('validator-id');

      expect(result.totalReviewed).toBe(15);
      expect(result.approved).toBe(10);
      expect(result.rejected).toBe(5);
      expect(result.karmaEarned).toBe(40); // 10 + 20 + 10
    });

    it('should throw ForbiddenException for insufficient privileges', async () => {
      const lowLeagueUser = {
        id: 'user-id',
        profile: {
          league: 'CHANDRIKA',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(lowLeagueUser);

      await expect(service.getModerationStats('user-id')).rejects.toThrow(ForbiddenException);
    });

    it('should handle user with no moderation history', async () => {
      mockPrismaService.moderationQueue.count.mockResolvedValue(0);
      mockPrismaService.karmaTransaction.findMany.mockResolvedValue([]);

      const result = await service.getModerationStats('validator-id');

      expect(result.totalReviewed).toBe(0);
      expect(result.approved).toBe(0);
      expect(result.rejected).toBe(0);
      expect(result.karmaEarned).toBe(0);
    });
  });
});