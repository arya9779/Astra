import { Test, TestingModule } from '@nestjs/testing';
import { ValidationService } from './validation.service';
import { PrismaService } from '../prisma/prisma.service';
import { KarmaService } from '../karma/karma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { ValidationVerdict } from './dto/submit-validation.dto';

describe('ValidationService', () => {
  let service: ValidationService;
  let prismaService: any;
  let karmaService: any;
  let blockchainService: any;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser',
    profile: {
      karma: 1000,
      league: 'VAJRA',
    },
  };

  const mockPost = {
    id: 'post-1',
    authorId: 'author-1',
    content: 'Test post content',
    author: {
      id: 'author-1',
      username: 'author',
      profile: { karma: 500, league: 'CHANDRIKA' },
    },
  };

  const mockValidation = {
    id: 'validation-1',
    postId: 'post-1',
    validatorId: 'user-1',
    verdict: ValidationVerdict.AUTHENTIC,
    confidence: 0.8,
    notes: 'Test notes',
    blockchainTxHash: null,
    createdAt: new Date(),
    validator: mockUser,
  };

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
      post: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      validation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockKarmaService = {
      awardKarma: jest.fn(),
      deductKarma: jest.fn(),
    };

    const mockBlockchainService = {
      recordValidation: jest.fn(),
      confirmValidationTransaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: KarmaService,
          useValue: mockKarmaService,
        },
        {
          provide: BlockchainService,
          useValue: mockBlockchainService,
        },
      ],
    }).compile();

    service = module.get<ValidationService>(ValidationService);
    prismaService = module.get(PrismaService);
    karmaService = module.get(KarmaService);
    blockchainService = module.get(BlockchainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitValidation', () => {
    const validationDto = {
      postId: 'post-1',
      verdict: ValidationVerdict.AUTHENTIC,
      confidence: 0.8,
      notes: 'Test validation',
    };

    beforeEach(() => {
      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.post.findUnique.mockResolvedValue(mockPost);
      prismaService.validation.findUnique.mockResolvedValue(null);
      prismaService.validation.create.mockResolvedValue(mockValidation);
      prismaService.validation.findMany.mockResolvedValue([mockValidation]);
      karmaService.awardKarma.mockResolvedValue({} as any);
      blockchainService.recordValidation.mockResolvedValue('0x123');
    });

    it('should successfully submit validation', async () => {
      const result = await service.submitValidation('user-1', validationDto);

      expect(result).toBeDefined();
      expect(result.verdict).toBe(ValidationVerdict.AUTHENTIC);
      expect(prismaService.validation.create).toHaveBeenCalledWith({
        data: {
          postId: validationDto.postId,
          validatorId: 'user-1',
          verdict: validationDto.verdict,
          confidence: validationDto.confidence,
          notes: validationDto.notes,
        },
        include: {
          validator: {
            include: { profile: true },
          },
        },
      });
      expect(karmaService.awardKarma).toHaveBeenCalled();
    });

    it('should throw ForbiddenException for insufficient league', async () => {
      const lowLeagueUser = {
        ...mockUser,
        profile: { ...mockUser.profile, league: 'CHANDRIKA' },
      };
      prismaService.user.findUnique.mockResolvedValue(lowLeagueUser);

      await expect(
        service.submitValidation('user-1', validationDto)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent post', async () => {
      prismaService.post.findUnique.mockResolvedValue(null);

      await expect(
        service.submitValidation('user-1', validationDto)
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for self-validation', async () => {
      const selfPost = { ...mockPost, authorId: 'user-1' };
      prismaService.post.findUnique.mockResolvedValue(selfPost);

      await expect(
        service.submitValidation('user-1', validationDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate validation', async () => {
      prismaService.validation.findUnique.mockResolvedValue(mockValidation);

      await expect(
        service.submitValidation('user-1', validationDto)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkConsensus', () => {
    it('should return no consensus with insufficient validations', async () => {
      prismaService.validation.findMany.mockResolvedValue([mockValidation]);

      const result = await service.checkConsensus('post-1');

      expect(result.reached).toBe(false);
      expect(result.finalVerdict).toBe('PENDING');
      expect(result.validatorCount).toBe(1);
    });

    it('should return consensus when threshold is met', async () => {
      const validations = [
        { ...mockValidation, verdict: ValidationVerdict.AUTHENTIC },
        { ...mockValidation, id: 'validation-2', verdict: ValidationVerdict.AUTHENTIC },
        { ...mockValidation, id: 'validation-3', verdict: ValidationVerdict.AUTHENTIC },
      ];
      prismaService.validation.findMany.mockResolvedValue(validations);
      prismaService.post.update.mockResolvedValue({} as any);

      const result = await service.checkConsensus('post-1');

      expect(result.reached).toBe(true);
      expect(result.finalVerdict).toBe('VERIFIED');
      expect(result.validatorCount).toBe(3);
      expect(result.consensusPercentage).toBe(100);
    });

    it('should flag content when fake consensus is reached', async () => {
      const validations = [
        { ...mockValidation, verdict: ValidationVerdict.FAKE },
        { ...mockValidation, id: 'validation-2', verdict: ValidationVerdict.FAKE },
        { ...mockValidation, id: 'validation-3', verdict: ValidationVerdict.FAKE },
      ];
      prismaService.validation.findMany.mockResolvedValue(validations);
      prismaService.post.update.mockResolvedValue({} as any);
      karmaService.deductKarma.mockResolvedValue({} as any);

      const result = await service.checkConsensus('post-1');

      expect(result.reached).toBe(true);
      expect(result.finalVerdict).toBe('FLAGGED');
      expect(karmaService.deductKarma).toHaveBeenCalled();
    });

    it('should calculate correct verdict counts', async () => {
      const validations = [
        { ...mockValidation, verdict: ValidationVerdict.AUTHENTIC },
        { ...mockValidation, id: 'validation-2', verdict: ValidationVerdict.FAKE },
        { ...mockValidation, id: 'validation-3', verdict: ValidationVerdict.UNCERTAIN },
        { ...mockValidation, id: 'validation-4', verdict: ValidationVerdict.AUTHENTIC },
      ];
      prismaService.validation.findMany.mockResolvedValue(validations);

      const result = await service.checkConsensus('post-1');

      expect(result.verdictCounts).toEqual({
        authentic: 2,
        fake: 1,
        uncertain: 1,
      });
    });
  });

  describe('getValidations', () => {
    beforeEach(() => {
      prismaService.post.findUnique.mockResolvedValue(mockPost);
      prismaService.validation.findMany.mockResolvedValue([mockValidation]);
      prismaService.validation.count.mockResolvedValue(1);
    });

    it('should return validations with stats and consensus', async () => {
      const result = await service.getValidations('post-1', { page: 1, limit: 20 });

      expect(result).toBeDefined();
      expect(result.validations).toHaveLength(1);
      expect(result.stats).toBeDefined();
      expect(result.consensus).toBeDefined();
      expect(result.total).toBe(1);
    });

    it('should throw NotFoundException for non-existent post', async () => {
      prismaService.post.findUnique.mockResolvedValue(null);

      await expect(
        service.getValidations('non-existent', { page: 1, limit: 20 })
      ).rejects.toThrow(NotFoundException);
    });

    it('should apply pagination correctly', async () => {
      await service.getValidations('post-1', { page: 2, limit: 10 });

      expect(prismaService.validation.findMany).toHaveBeenCalledWith({
        where: { postId: 'post-1' },
        include: {
          validator: {
            include: { profile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
    });
  });

  describe('recordOnBlockchain', () => {
    beforeEach(() => {
      prismaService.validation.findUnique.mockResolvedValue(mockValidation);
      prismaService.validation.update.mockResolvedValue({} as any);
      blockchainService.recordValidation.mockResolvedValue('0x123456');
    });

    it('should record validation on blockchain', async () => {
      const result = await service.recordOnBlockchain('validation-1');

      expect(result).toBe('0x123456');
      expect(blockchainService.recordValidation).toHaveBeenCalledWith(
        'post-1',
        'user-1',
        true,
        0.8
      );
      expect(prismaService.validation.update).toHaveBeenCalledWith({
        where: { id: 'validation-1' },
        data: { blockchainTxHash: '0x123456' },
      });
    });

    it('should return existing hash if already recorded', async () => {
      const recordedValidation = {
        ...mockValidation,
        blockchainTxHash: '0xexisting',
      };
      prismaService.validation.findUnique.mockResolvedValue(recordedValidation);

      const result = await service.recordOnBlockchain('validation-1');

      expect(result).toBe('0xexisting');
      expect(blockchainService.recordValidation).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent validation', async () => {
      prismaService.validation.findUnique.mockResolvedValue(null);

      await expect(
        service.recordOnBlockchain('non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });
});