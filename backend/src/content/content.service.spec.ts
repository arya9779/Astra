import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ContentService } from './content.service';
import { PrismaService } from '../prisma/prisma.service';
import { IpfsService } from './services/ipfs.service';
import { KarmaService } from '../karma/karma.service';
import { CreatePostDto, MediaType } from './dto/create-post.dto';
import { CreateEngagementDto, EngagementType } from './dto/engagement.dto';
import { ValidationStatus } from './interfaces/content.interface';

describe('ContentService', () => {
  let service: ContentService;
  let prismaService: PrismaService;
  let ipfsService: IpfsService;
  let karmaService: KarmaService;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    username: 'testuser',
    profile: {
      karma: 100,
      league: 'CHANDRIKA',
      avatarUrl: null,
    },
  };

  const mockPost = {
    id: 'post-123',
    authorId: 'user-123',
    content: 'Test post content',
    mediaUrls: [],
    mediaType: 'TEXT',
    ipfsHash: null,
    validationStatus: 'PENDING',
    validationCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: mockUser,
    engagements: [],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    post: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    postEngagement: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    follow: {
      findMany: jest.fn(),
    },
  };

  const mockIpfsService = {
    uploadToIPFS: jest.fn(),
    uploadTextToIPFS: jest.fn(),
    getIPFSUrl: jest.fn(),
  };

  const mockKarmaService = {
    awardKarma: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: IpfsService,
          useValue: mockIpfsService,
        },
        {
          provide: KarmaService,
          useValue: mockKarmaService,
        },
      ],
    }).compile();

    service = module.get<ContentService>(ContentService);
    prismaService = module.get<PrismaService>(PrismaService);
    ipfsService = module.get<IpfsService>(IpfsService);
    karmaService = module.get<KarmaService>(KarmaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    const createPostDto: CreatePostDto = {
      content: 'Test post content',
      mediaType: MediaType.TEXT,
    };

    it('should create a post successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.post.create.mockResolvedValue(mockPost);

      const result = await service.createPost('user-123', createPostDto);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        include: { profile: true },
      });

      expect(mockPrismaService.post.create).toHaveBeenCalledWith({
        data: {
          authorId: 'user-123',
          content: createPostDto.content,
          mediaUrls: [],
          mediaType: 'TEXT',
          ipfsHash: undefined,
          validationStatus: ValidationStatus.PENDING,
          validationCount: 0,
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

      expect(result).toEqual({
        id: mockPost.id,
        authorId: mockPost.authorId,
        author: {
          id: mockUser.id,
          username: mockUser.username,
          karma: mockUser.profile.karma,
          league: mockUser.profile.league,
          avatarUrl: mockUser.profile.avatarUrl,
        },
        content: mockPost.content,
        mediaUrls: mockPost.mediaUrls,
        mediaType: mockPost.mediaType,
        ipfsHash: mockPost.ipfsHash,
        validationStatus: mockPost.validationStatus,
        validationCount: mockPost.validationCount,
        engagementCounts: {
          likes: 0,
          comments: 0,
          shares: 0,
        },
        createdAt: mockPost.createdAt,
        updatedAt: mockPost.updatedAt,
      });
    });

    it('should upload files to IPFS when provided', async () => {
      const files = [
        {
          originalname: 'test.jpg',
          mimetype: 'image/jpeg',
          buffer: Buffer.from('test'),
        } as any,
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockIpfsService.uploadToIPFS.mockResolvedValue({
        success: true,
        ipfsHash: 'QmTest123',
      });
      mockIpfsService.getIPFSUrl.mockReturnValue('https://ipfs.io/ipfs/QmTest123');
      mockPrismaService.post.create.mockResolvedValue({
        ...mockPost,
        mediaUrls: ['https://ipfs.io/ipfs/QmTest123'],
      });

      const result = await service.createPost('user-123', createPostDto, files);

      expect(mockIpfsService.uploadToIPFS).toHaveBeenCalledWith(files[0]);
      expect(mockIpfsService.getIPFSUrl).toHaveBeenCalledWith('QmTest123');
      expect(result.mediaUrls).toContain('https://ipfs.io/ipfs/QmTest123');
    });

    it('should upload text content to IPFS for long posts', async () => {
      const longContent = 'a'.repeat(600); // Over 500 characters
      const longPostDto = { ...createPostDto, content: longContent };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockIpfsService.uploadTextToIPFS.mockResolvedValue({
        success: true,
        ipfsHash: 'QmTextHash123',
      });
      mockPrismaService.post.create.mockResolvedValue({
        ...mockPost,
        content: longContent,
        ipfsHash: 'QmTextHash123',
      });

      const result = await service.createPost('user-123', longPostDto);

      expect(mockIpfsService.uploadTextToIPFS).toHaveBeenCalledWith(
        longContent,
        expect.stringContaining('post-')
      );
      expect(result.ipfsHash).toBe('QmTextHash123');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createPost('user-123', createPostDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('getPost', () => {
    it('should retrieve a post by ID', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);

      const result = await service.getPost('post-123');

      expect(mockPrismaService.post.findUnique).toHaveBeenCalledWith({
        where: { id: 'post-123' },
        include: {
          author: {
            include: {
              profile: true,
            },
          },
          engagements: true,
        },
      });

      expect(result.id).toBe('post-123');
    });

    it('should throw NotFoundException when post does not exist', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.getPost('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deletePost', () => {
    it('should delete own post successfully', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.post.delete.mockResolvedValue(mockPost);

      await service.deletePost('post-123', 'user-123');

      expect(mockPrismaService.post.delete).toHaveBeenCalledWith({
        where: { id: 'post-123' },
      });
    });

    it('should throw NotFoundException when post does not exist', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.deletePost('non-existent', 'user-123')).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when trying to delete another user\'s post', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue({
        ...mockPost,
        authorId: 'other-user',
      });

      await expect(service.deletePost('post-123', 'user-123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getFeed', () => {
    it('should retrieve user feed with followed users posts', async () => {
      const followedUsers = [{ followeeId: 'user-456' }];
      const posts = [mockPost];

      mockPrismaService.follow.findMany.mockResolvedValue(followedUsers);
      mockPrismaService.post.findMany.mockResolvedValue(posts);

      const result = await service.getFeed('user-123', { page: 1, limit: 20 });

      expect(mockPrismaService.follow.findMany).toHaveBeenCalledWith({
        where: { followerId: 'user-123' },
        select: { followeeId: true },
      });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith({
        where: {
          authorId: { in: ['user-456', 'user-123'] }, // Includes followed users + self
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
          createdAt: 'desc',
        },
        skip: 0,
        take: 20,
      });

      expect(result).toHaveLength(1);
    });

    it('should support pagination', async () => {
      mockPrismaService.follow.findMany.mockResolvedValue([]);
      mockPrismaService.post.findMany.mockResolvedValue([]);

      await service.getFeed('user-123', { page: 2, limit: 10 });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10, // (page - 1) * limit
          take: 10,
        })
      );
    });
  });

  describe('getReels', () => {
    it('should retrieve video posts only', async () => {
      const videoPost = { ...mockPost, mediaType: 'VIDEO' };
      mockPrismaService.post.findMany.mockResolvedValue([videoPost]);

      const result = await service.getReels({ page: 1, limit: 20 });

      expect(mockPrismaService.post.findMany).toHaveBeenCalledWith({
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
          { validationStatus: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: 0,
        take: 20,
      });

      expect(result).toHaveLength(1);
      expect(result[0].mediaType).toBe('VIDEO');
    });
  });

  describe('createEngagement', () => {
    const engagementDto: CreateEngagementDto = {
      postId: 'post-123',
      type: EngagementType.LIKE,
    };

    it('should create engagement successfully', async () => {
      const otherUserPost = { ...mockPost, authorId: 'other-user' };
      mockPrismaService.post.findUnique.mockResolvedValue(otherUserPost);
      mockPrismaService.postEngagement.findUnique.mockResolvedValue(null);
      mockPrismaService.postEngagement.create.mockResolvedValue({});
      mockKarmaService.awardKarma.mockResolvedValue({});

      await service.createEngagement('user-123', engagementDto);

      expect(mockPrismaService.postEngagement.create).toHaveBeenCalledWith({
        data: {
          postId: 'post-123',
          userId: 'user-123',
          type: 'LIKE',
        },
      });

      expect(mockKarmaService.awardKarma).toHaveBeenCalledTimes(2); // Once for author, once for user
    });

    it('should throw NotFoundException when post does not exist', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(null);

      await expect(service.createEngagement('user-123', engagementDto)).rejects.toThrow(
        NotFoundException
      );
    });

    it('should throw BadRequestException when trying to like own post', async () => {
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);

      await expect(service.createEngagement('user-123', engagementDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should throw BadRequestException for duplicate engagement', async () => {
      const otherUserPost = { ...mockPost, authorId: 'other-user' };
      mockPrismaService.post.findUnique.mockResolvedValue(otherUserPost);
      mockPrismaService.postEngagement.findUnique.mockResolvedValue({
        id: 'engagement-123',
      });

      await expect(service.createEngagement('user-123', engagementDto)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should allow comments on own posts', async () => {
      const commentDto = { ...engagementDto, type: EngagementType.COMMENT };
      mockPrismaService.post.findUnique.mockResolvedValue(mockPost);
      mockPrismaService.postEngagement.create.mockResolvedValue({});

      await service.createEngagement('user-123', commentDto);

      expect(mockPrismaService.postEngagement.create).toHaveBeenCalled();
    });
  });

  describe('removeEngagement', () => {
    it('should remove engagement successfully', async () => {
      const existingEngagement = {
        id: 'engagement-123',
        postId: 'post-123',
        userId: 'user-123',
        type: 'LIKE',
      };

      mockPrismaService.postEngagement.findUnique.mockResolvedValue(existingEngagement);
      mockPrismaService.postEngagement.delete.mockResolvedValue(existingEngagement);

      await service.removeEngagement('user-123', {
        postId: 'post-123',
        type: EngagementType.LIKE,
      });

      expect(mockPrismaService.postEngagement.delete).toHaveBeenCalledWith({
        where: {
          postId_userId_type: {
            postId: 'post-123',
            userId: 'user-123',
            type: 'LIKE',
          },
        },
      });
    });

    it('should throw NotFoundException when engagement does not exist', async () => {
      mockPrismaService.postEngagement.findUnique.mockResolvedValue(null);

      await expect(
        service.removeEngagement('user-123', {
          postId: 'post-123',
          type: EngagementType.LIKE,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trying to remove comments', async () => {
      await expect(
        service.removeEngagement('user-123', {
          postId: 'post-123',
          type: EngagementType.COMMENT,
        })
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPostEngagements', () => {
    it('should return engagement counts', async () => {
      const engagements = [
        { type: 'LIKE' },
        { type: 'LIKE' },
        { type: 'COMMENT' },
        { type: 'SHARE' },
      ];

      mockPrismaService.postEngagement.findMany.mockResolvedValue(engagements);

      const result = await service.getPostEngagements('post-123');

      expect(result).toEqual({
        likes: 2,
        comments: 1,
        shares: 1,
      });
    });
  });

  describe('getUserEngagementsForPost', () => {
    it('should return user engagement status for post', async () => {
      const userEngagements = [
        { type: 'LIKE' },
        // No SHARE engagement
      ];

      mockPrismaService.postEngagement.findMany.mockResolvedValue(userEngagements);

      const result = await service.getUserEngagementsForPost('post-123', 'user-123');

      expect(result).toEqual({
        liked: true,
        shared: false,
      });
    });
  });

  describe('getSimilarLeagues', () => {
    it('should return current and higher leagues', () => {
      // Access private method for testing
      const getSimilarLeagues = (service as any).getSimilarLeagues.bind(service);

      expect(getSimilarLeagues('VAJRA')).toEqual([
        'VAJRA',
        'AGNEYASTRA',
        'VARUNASTRA',
        'PASHUPATASTRA',
        'BRAHMASTRA',
      ]);

      expect(getSimilarLeagues('BRAHMASTRA')).toEqual(['BRAHMASTRA']);

      expect(getSimilarLeagues('INVALID')).toEqual([
        'CHANDRIKA',
        'VAJRA',
        'AGNEYASTRA',
        'VARUNASTRA',
        'PASHUPATASTRA',
        'BRAHMASTRA',
      ]);
    });
  });
});