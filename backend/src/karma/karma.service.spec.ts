import { Test, TestingModule } from '@nestjs/testing';
import { KarmaService } from './karma.service';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { NotFoundException } from '@nestjs/common';
import { KarmaReason } from './enums/karma-reason.enum';

describe('KarmaService', () => {
  let service: KarmaService;
  let prismaService: PrismaService;
  let blockchainService: BlockchainService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hash',
    walletAddress: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    profile: {
      id: 'profile-123',
      userId: 'user-123',
      karma: 100,
      league: 'CHANDRIKA',
      role: 'CITIZEN',
      avatarUrl: null,
      bio: null,
      visibility: 'PUBLIC',
      updatedAt: new Date(),
    },
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    userProfile: {
      update: jest.fn(),
    },
    karmaTransaction: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    userAstra: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockBlockchainService = {
    recordKarmaTransaction: jest.fn(),
    retryFailedTransaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KarmaService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile();

    service = module.get<KarmaService>(KarmaService);
    prismaService = module.get<PrismaService>(PrismaService);
    blockchainService = module.get<BlockchainService>(BlockchainService);

    jest.clearAllMocks();
  });

  describe('awardKarma', () => {
    it('should award karma and update balance', async () => {
      const awardDto = {
        userId: 'user-123',
        amount: 50,
        reason: KarmaReason.CONTENT_VALIDATION,
      };

      const mockTransaction = {
        id: 'tx-123',
        userId: 'user-123',
        amount: 50,
        type: 'AWARD',
        reason: KarmaReason.CONTENT_VALIDATION,
        balanceAfter: 150,
        blockchainTxHash: null,
        metadata: null,
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          userProfile: {
            update: jest.fn().mockResolvedValue({ karma: 150 }),
          },
          karmaTransaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
        });
      });
      mockPrismaService.userAstra.findMany.mockResolvedValue([]);

      const result = await service.awardKarma(awardDto);

      expect(result.amount).toBe(50);
      expect(result.balanceAfter).toBe(150);
      expect(result.type).toBe('AWARD');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.awardKarma({
          userId: 'nonexistent',
          amount: 50,
          reason: KarmaReason.CONTENT_VALIDATION,
        })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deductKarma', () => {
    it('should deduct karma and update balance', async () => {
      const deductDto = {
        userId: 'user-123',
        amount: 30,
        reason: KarmaReason.MISINFORMATION,
      };

      const mockTransaction = {
        id: 'tx-124',
        userId: 'user-123',
        amount: 30,
        type: 'DEDUCT',
        reason: KarmaReason.MISINFORMATION,
        balanceAfter: 70,
        blockchainTxHash: null,
        metadata: null,
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          userProfile: {
            update: jest.fn().mockResolvedValue({ karma: 70 }),
          },
          karmaTransaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
        });
      });

      const result = await service.deductKarma(deductDto);

      expect(result.amount).toBe(30);
      expect(result.balanceAfter).toBe(70);
      expect(result.type).toBe('DEDUCT');
    });

    it('should prevent negative karma balance', async () => {
      const userWithLowKarma = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          karma: 10,
        },
      };

      const deductDto = {
        userId: 'user-123',
        amount: 50,
        reason: KarmaReason.MISINFORMATION,
      };

      const mockTransaction = {
        id: 'tx-125',
        userId: 'user-123',
        amount: 10,
        type: 'DEDUCT',
        reason: KarmaReason.MISINFORMATION,
        balanceAfter: 0,
        blockchainTxHash: null,
        metadata: null,
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithLowKarma);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          userProfile: {
            update: jest.fn().mockResolvedValue({ karma: 0 }),
          },
          karmaTransaction: {
            create: jest.fn().mockResolvedValue(mockTransaction),
          },
        });
      });

      const result = await service.deductKarma(deductDto);

      expect(result.balanceAfter).toBe(0);
      expect(result.amount).toBe(10);
    });
  });

  describe('checkLeagueProgression', () => {
    it('should promote user to VAJRA league at 500 karma', async () => {
      const userWithHighKarma = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          karma: 500,
          league: 'CHANDRIKA',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithHighKarma);
      mockPrismaService.userProfile.update.mockResolvedValue({
        ...userWithHighKarma.profile,
        league: 'VAJRA',
      });
      mockPrismaService.userAstra.findMany.mockResolvedValue([]);
      mockPrismaService.userAstra.createMany.mockResolvedValue({ count: 2 });

      const result = await service.checkLeagueProgression('user-123');

      expect(result.promoted).toBe(true);
      expect(result.oldLeague).toBe('CHANDRIKA');
      expect(result.newLeague).toBe('VAJRA');
      expect(result.unlockedAstras).toBeDefined();
    });

    it('should not promote user if karma threshold not met', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.checkLeagueProgression('user-123');

      expect(result.promoted).toBe(false);
    });

    it('should promote to correct league based on karma amount', async () => {
      const userWithVeryHighKarma = {
        ...mockUser,
        profile: {
          ...mockUser.profile,
          karma: 3500,
          league: 'CHANDRIKA',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWithVeryHighKarma);
      mockPrismaService.userProfile.update.mockResolvedValue({
        ...userWithVeryHighKarma.profile,
        league: 'VARUNASTRA',
      });
      mockPrismaService.userAstra.findMany.mockResolvedValue([]);
      mockPrismaService.userAstra.createMany.mockResolvedValue({ count: 2 });

      const result = await service.checkLeagueProgression('user-123');

      expect(result.promoted).toBe(true);
      expect(result.newLeague).toBe('VARUNASTRA');
    });
  });

  describe('getKarmaHistory', () => {
    it('should return paginated karma history', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          userId: 'user-123',
          amount: 10,
          type: 'AWARD',
          reason: 'CONTENT_VALIDATION',
          balanceAfter: 110,
          blockchainTxHash: null,
          metadata: null,
          createdAt: new Date(),
        },
        {
          id: 'tx-2',
          userId: 'user-123',
          amount: 15,
          type: 'AWARD',
          reason: 'ORIGINAL_CONTENT',
          balanceAfter: 125,
          blockchainTxHash: null,
          metadata: null,
          createdAt: new Date(),
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.karmaTransaction.findMany.mockResolvedValue(mockTransactions);
      mockPrismaService.karmaTransaction.count.mockResolvedValue(2);

      const result = await service.getKarmaHistory('user-123', { page: 1, limit: 20 });

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });
});
