import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { MatrixService } from '../src/social/services/matrix.service';

// Mock Matrix service to avoid import issues
const mockMatrixService = {
  isClientReady: jest.fn().mockReturnValue(false),
  createDirectMessage: jest.fn(),
  createGroupChat: jest.fn(),
  inviteUserToRoom: jest.fn(),
  sendMessageToRoom: jest.fn(),
  getRoomInfo: jest.fn(),
};

describe('Social Features (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(MatrixService)
    .useValue(mockMatrixService)
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    prisma = app.get<PrismaService>(PrismaService);
    
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    // Note: anonymousPost cleanup will be added after Prisma client regeneration
    await prisma.boardMember.deleteMany();
    await prisma.board.deleteMany();
    await prisma.follow.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    const user1Response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'user1@example.com',
        username: 'user1',
        password: 'Test123!',
      });

    const user2Response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'user2@example.com',
        username: 'user2',
        password: 'Test123!',
      });

    user1Token = user1Response.body.tokens.accessToken;
    user2Token = user2Response.body.tokens.accessToken;
    user1Id = user1Response.body.user.id;
    user2Id = user2Response.body.user.id;

    // Upgrade user1 to Varunastra league for board creation tests
    await prisma.userProfile.update({
      where: { userId: user1Id },
      data: { league: 'VARUNASTRA', karma: 3500 },
    });
  });

  describe('Follow System', () => {
    describe('/social/follow (POST)', () => {
      it('should follow a user successfully', () => {
        return request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: user2Id })
          .expect(204);
      });

      it('should fail to follow non-existent user', () => {
        return request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: '00000000-0000-0000-0000-000000000000' })
          .expect(404);
      });

      it('should fail to follow yourself', () => {
        return request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: user1Id })
          .expect(400);
      });

      it('should fail to follow same user twice', async () => {
        // First follow
        await request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: user2Id })
          .expect(204);

        // Second follow should fail
        return request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: user2Id })
          .expect(409);
      });
    });

    describe('/social/follow/:followeeId (DELETE)', () => {
      beforeEach(async () => {
        // Create follow relationship
        await request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: user2Id });
      });

      it('should unfollow a user successfully', () => {
        return request(app.getHttpServer())
          .delete(`/social/follow/${user2Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(204);
      });

      it('should fail to unfollow user not being followed', () => {
        return request(app.getHttpServer())
          .delete(`/social/follow/${user1Id}`)
          .set('Authorization', `Bearer ${user2Token}`)
          .expect(404);
      });
    });

    describe('/social/followers/:userId (GET)', () => {
      beforeEach(async () => {
        // Create follow relationships
        await request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: user2Id });
      });

      it('should get followers list', () => {
        return request(app.getHttpServer())
          .get(`/social/followers/${user2Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].id).toBe(user1Id);
            expect(res.body[0].username).toBe('user1');
          });
      });

      it('should support pagination', () => {
        return request(app.getHttpServer())
          .get(`/social/followers/${user2Id}?page=1&limit=10`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200);
      });
    });

    describe('/social/following/:userId (GET)', () => {
      beforeEach(async () => {
        await request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: user2Id });
      });

      it('should get following list', () => {
        return request(app.getHttpServer())
          .get(`/social/following/${user1Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].id).toBe(user2Id);
            expect(res.body[0].username).toBe('user2');
          });
      });
    });

    describe('/social/stats/:userId (GET)', () => {
      beforeEach(async () => {
        await request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: user2Id });
      });

      it('should get follow statistics', () => {
        return request(app.getHttpServer())
          .get(`/social/stats/${user2Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.followersCount).toBe(1);
            expect(res.body.followingCount).toBe(0);
            expect(res.body.isFollowing).toBe(true);
          });
      });
    });

    describe('/social/is-following/:userId (GET)', () => {
      it('should return true when following', async () => {
        await request(app.getHttpServer())
          .post('/social/follow')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({ followeeId: user2Id });

        return request(app.getHttpServer())
          .get(`/social/is-following/${user2Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.isFollowing).toBe(true);
          });
      });

      it('should return false when not following', () => {
        return request(app.getHttpServer())
          .get(`/social/is-following/${user2Id}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.isFollowing).toBe(false);
          });
      });
    });
  });

  describe('Board Management', () => {
    describe('/social/boards (POST)', () => {
      it('should create a professional board successfully', () => {
        return request(app.getHttpServer())
          .post('/social/boards')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: 'Test Professional Board',
            description: 'A test board for professionals',
            type: 'PROFESSIONAL',
            isEncrypted: false,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.name).toBe('Test Professional Board');
            expect(res.body.type).toBe('PROFESSIONAL');
            expect(res.body.ownerId).toBe(user1Id);
            expect(res.body.memberCount).toBe(1);
          });
      });

      it('should create an encrypted whistleblower board', () => {
        return request(app.getHttpServer())
          .post('/social/boards')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: 'Whistleblower Board',
            description: 'Anonymous reporting board',
            type: 'WHISTLEBLOWER',
            isEncrypted: true,
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.type).toBe('WHISTLEBLOWER');
            expect(res.body.isEncrypted).toBe(true);
          });
      });

      it('should fail to create professional board without required league', () => {
        return request(app.getHttpServer())
          .post('/social/boards')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            name: 'Test Board',
            type: 'PROFESSIONAL',
          })
          .expect(403);
      });

      it('should validate board name is required', () => {
        return request(app.getHttpServer())
          .post('/social/boards')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            type: 'PROFESSIONAL',
          })
          .expect(400);
      });
    });

    describe('/social/boards/:boardId (GET)', () => {
      let boardId: string;

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/social/boards')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: 'Test Board',
            type: 'PROFESSIONAL',
          });
        boardId = response.body.id;
      });

      it('should get board details for member', () => {
        return request(app.getHttpServer())
          .get(`/social/boards/${boardId}`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.id).toBe(boardId);
            expect(res.body.name).toBe('Test Board');
            expect(res.body.ownerId).toBe(user1Id);
          });
      });

      it('should fail to get board details for non-member', () => {
        return request(app.getHttpServer())
          .get(`/social/boards/${boardId}`)
          .set('Authorization', `Bearer ${user2Token}`)
          .expect(403);
      });
    });

    describe('/social/boards/:boardId/invite (POST)', () => {
      let boardId: string;

      beforeEach(async () => {
        const response = await request(app.getHttpServer())
          .post('/social/boards')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: 'Test Board',
            type: 'PROFESSIONAL',
          });
        boardId = response.body.id;
      });

      it('should invite users to board successfully', () => {
        return request(app.getHttpServer())
          .post(`/social/boards/${boardId}/invite`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            userIds: [user2Id],
          })
          .expect(204);
      });

      it('should fail to invite non-existent users', () => {
        return request(app.getHttpServer())
          .post(`/social/boards/${boardId}/invite`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            userIds: ['00000000-0000-0000-0000-000000000000'],
          })
          .expect(400);
      });

      it('should fail when non-owner tries to invite', () => {
        return request(app.getHttpServer())
          .post(`/social/boards/${boardId}/invite`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            userIds: [user1Id],
          })
          .expect(403);
      });
    });

    describe('/social/me/boards (GET)', () => {
      beforeEach(async () => {
        await request(app.getHttpServer())
          .post('/social/boards')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: 'My Board',
            type: 'PROFESSIONAL',
          });
      });

      it('should get user boards', () => {
        return request(app.getHttpServer())
          .get('/social/me/boards')
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(1);
            expect(res.body[0].name).toBe('My Board');
          });
      });

      it('should support pagination', () => {
        return request(app.getHttpServer())
          .get('/social/me/boards?page=1&limit=5')
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200);
      });
    });
  });

  describe.skip('Anonymous Posting', () => {
    let whistleblowerBoardId: string;

    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/social/boards')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Whistleblower Board',
          type: 'WHISTLEBLOWER',
          isEncrypted: true,
        });
      whistleblowerBoardId = response.body.id;

      // Invite user2 to the board
      await request(app.getHttpServer())
        .post(`/social/boards/${whistleblowerBoardId}/invite`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userIds: [user2Id],
        });
    });

    describe('/social/boards/:boardId/anonymous-post (POST)', () => {
      it('should create anonymous post successfully', () => {
        return request(app.getHttpServer())
          .post(`/social/boards/${whistleblowerBoardId}/anonymous-post`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            content: 'This is an anonymous report about misconduct.',
            secret: 'my-secret-key-123',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.content).toBe('This is an anonymous report about misconduct.');
            expect(res.body.anonymousId).toMatch(/^Anon_[a-f0-9]{8}$/);
            expect(res.body.boardId).toBe(whistleblowerBoardId);
          });
      });

      it('should fail on non-whistleblower board', async () => {
        const professionalBoard = await request(app.getHttpServer())
          .post('/social/boards')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            name: 'Professional Board',
            type: 'PROFESSIONAL',
          });

        return request(app.getHttpServer())
          .post(`/social/boards/${professionalBoard.body.id}/anonymous-post`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            content: 'Test content',
            secret: 'secret',
          })
          .expect(400);
      });

      it('should fail for non-members', () => {
        return request(app.getHttpServer())
          .post(`/social/boards/${whistleblowerBoardId}/anonymous-post`)
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            content: 'Test content',
            secret: 'secret',
          })
          .expect(403);
      });

      it('should validate required fields', () => {
        return request(app.getHttpServer())
          .post(`/social/boards/${whistleblowerBoardId}/anonymous-post`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            content: '',
            secret: '',
          })
          .expect(400);
      });
    });

    describe('/social/boards/:boardId/anonymous-posts (GET)', () => {
      beforeEach(async () => {
        await request(app.getHttpServer())
          .post(`/social/boards/${whistleblowerBoardId}/anonymous-post`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            content: 'First anonymous post',
            secret: 'secret1',
          });

        await request(app.getHttpServer())
          .post(`/social/boards/${whistleblowerBoardId}/anonymous-post`)
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            content: 'Second anonymous post',
            secret: 'secret2',
          });
      });

      it('should get anonymous posts for board members', () => {
        return request(app.getHttpServer())
          .get(`/social/boards/${whistleblowerBoardId}/anonymous-posts`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect((res) => {
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body.length).toBe(2);
            expect(res.body[0].content).toBe('Second anonymous post');
            expect(res.body[1].content).toBe('First anonymous post');
          });
      });

      it('should fail for non-members', () => {
        return request(app.getHttpServer())
          .get(`/social/boards/${whistleblowerBoardId}/anonymous-posts`)
          .set('Authorization', `Bearer ${user2Token}`)
          .expect(403);
      });

      it('should support pagination', () => {
        return request(app.getHttpServer())
          .get(`/social/boards/${whistleblowerBoardId}/anonymous-posts?page=1&limit=1`)
          .set('Authorization', `Bearer ${user1Token}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.length).toBe(1);
          });
      });
    });
  });

  describe.skip('ZK Proof Generation', () => {
    describe('/social/zk-proof/generate (POST)', () => {
      it('should generate ZK proof for valid league requirement', () => {
        return request(app.getHttpServer())
          .post('/social/zk-proof/generate')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            requiredLeague: 'VAJRA',
            secret: 'test-secret',
          })
          .expect(201)
          .expect((res) => {
            expect(res.body.proof).toBeDefined();
            expect(res.body.publicSignal).toBeDefined();
            expect(res.body.nullifierHash).toBeDefined();
            expect(res.body.proof).toMatch(/^[a-f0-9]{64}$/);
          });
      });

      it('should fail for insufficient league level', () => {
        return request(app.getHttpServer())
          .post('/social/zk-proof/generate')
          .set('Authorization', `Bearer ${user2Token}`)
          .send({
            requiredLeague: 'VARUNASTRA',
            secret: 'test-secret',
          })
          .expect(400);
      });

      it('should validate required fields', () => {
        return request(app.getHttpServer())
          .post('/social/zk-proof/generate')
          .set('Authorization', `Bearer ${user1Token}`)
          .send({
            requiredLeague: '',
            secret: '',
          })
          .expect(400);
      });
    });
  });

  describe('Authentication Requirements', () => {
    it('should require authentication for all social endpoints', async () => {
      const endpoints = [
        { method: 'post', path: '/social/follow', body: { followeeId: user2Id } },
        { method: 'delete', path: `/social/follow/${user2Id}` },
        { method: 'get', path: `/social/followers/${user1Id}` },
        { method: 'get', path: `/social/following/${user1Id}` },
        { method: 'get', path: `/social/stats/${user1Id}` },
        { method: 'get', path: `/social/is-following/${user2Id}` },
        { method: 'post', path: '/social/boards', body: { name: 'Test', type: 'PROFESSIONAL' } },
        { method: 'get', path: '/social/me/boards' },
      ];

      for (const endpoint of endpoints) {
        const req = request(app.getHttpServer())[endpoint.method](endpoint.path);
        if (endpoint.body) {
          req.send(endpoint.body);
        }
        await req.expect(401);
      }
    });
  });

  describe('Integration Tests', () => {
    it('should complete full social interaction flow', async () => {
      // 1. User1 follows User2
      await request(app.getHttpServer())
        .post('/social/follow')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({ followeeId: user2Id })
        .expect(204);

      // 2. Check follow stats
      const statsResponse = await request(app.getHttpServer())
        .get(`/social/stats/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(statsResponse.body.followersCount).toBe(1);
      expect(statsResponse.body.isFollowing).toBe(true);

      // 3. Create a board
      const boardResponse = await request(app.getHttpServer())
        .post('/social/boards')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          name: 'Integration Test Board',
          type: 'PROFESSIONAL',
        })
        .expect(201);

      // 4. Invite follower to board
      await request(app.getHttpServer())
        .post(`/social/boards/${boardResponse.body.id}/invite`)
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          userIds: [user2Id],
        })
        .expect(204);

      // 5. Check board membership
      const boardDetailsResponse = await request(app.getHttpServer())
        .get(`/social/boards/${boardResponse.body.id}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(200);

      expect(boardDetailsResponse.body.memberCount).toBe(2);

      // 6. User1 unfollows User2
      await request(app.getHttpServer())
        .delete(`/social/follow/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(204);

      // 7. Verify unfollow
      const finalStatsResponse = await request(app.getHttpServer())
        .get(`/social/stats/${user2Id}`)
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200);

      expect(finalStatsResponse.body.followersCount).toBe(0);
      expect(finalStatsResponse.body.isFollowing).toBe(false);
    });
  });
});