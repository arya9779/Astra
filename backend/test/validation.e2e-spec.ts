import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ValidationVerdict } from '../src/validation/dto/submit-validation.dto';

describe('ValidationController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let postId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    
    await app.init();

    // Clean up database
    await prisma.validation.deleteMany();
    await prisma.post.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();

    // Create test user with Vajra league (can validate)
    const testUser = await prisma.user.create({
      data: {
        email: 'validator@test.com',
        username: 'validator',
        passwordHash: 'hashedpassword',
        profile: {
          create: {
            karma: 1000,
            league: 'VAJRA',
            role: 'VALIDATOR',
          },
        },
      },
    });
    userId = testUser.id;

    // Create post author
    const postAuthor = await prisma.user.create({
      data: {
        email: 'author@test.com',
        username: 'author',
        passwordHash: 'hashedpassword',
        profile: {
          create: {
            karma: 500,
            league: 'CHANDRIKA',
            role: 'CITIZEN',
          },
        },
      },
    });

    // Create test post
    const testPost = await prisma.post.create({
      data: {
        authorId: postAuthor.id,
        content: 'Test post for validation',
        mediaUrls: [],
        validationStatus: 'PENDING',
      },
    });
    postId = testPost.id;

    // Get auth token (mock for testing)
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await prisma.validation.deleteMany();
    await prisma.post.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('/validations (POST)', () => {
    it('should submit validation successfully', () => {
      const validationData = {
        postId,
        verdict: ValidationVerdict.AUTHENTIC,
        confidence: 0.8,
        notes: 'This content appears authentic',
      };

      return request(app.getHttpServer())
        .post('/validations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.verdict).toBe(ValidationVerdict.AUTHENTIC);
          expect(res.body.confidence).toBe(0.8);
          expect(res.body.postId).toBe(postId);
          expect(res.body.validatorId).toBe(userId);
        });
    });

    it('should reject validation without authentication', () => {
      const validationData = {
        postId,
        verdict: ValidationVerdict.AUTHENTIC,
        confidence: 0.8,
      };

      return request(app.getHttpServer())
        .post('/validations')
        .send(validationData)
        .expect(401);
    });

    it('should reject validation with invalid data', () => {
      const invalidData = {
        postId,
        verdict: 'INVALID_VERDICT',
        confidence: 1.5, // Invalid confidence > 1
      };

      return request(app.getHttpServer())
        .post('/validations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);
    });

    it('should reject duplicate validation', async () => {
      // First validation should succeed
      const validationData = {
        postId,
        verdict: ValidationVerdict.FAKE,
        confidence: 0.9,
      };

      await request(app.getHttpServer())
        .post('/validations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(201);

      // Second validation should fail
      return request(app.getHttpServer())
        .post('/validations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validationData)
        .expect(400);
    });
  });

  describe('/validations/post/:postId (GET)', () => {
    beforeEach(async () => {
      // Clean validations for fresh test
      await prisma.validation.deleteMany({ where: { postId } });
    });

    it('should get validations for a post', async () => {
      // Create some validations
      await prisma.validation.createMany({
        data: [
          {
            postId,
            validatorId: userId,
            verdict: ValidationVerdict.AUTHENTIC,
            confidence: 0.8,
          },
        ],
      });

      return request(app.getHttpServer())
        .get(`/validations/post/${postId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('validations');
          expect(res.body).toHaveProperty('stats');
          expect(res.body).toHaveProperty('consensus');
          expect(res.body.validations).toHaveLength(1);
          expect(res.body.stats.totalValidations).toBe(1);
        });
    });

    it('should handle pagination', () => {
      return request(app.getHttpServer())
        .get(`/validations/post/${postId}?page=1&limit=5`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.page).toBe(1);
          expect(res.body.limit).toBe(5);
        });
    });

    it('should return 404 for non-existent post', () => {
      const nonExistentPostId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .get(`/validations/post/${nonExistentPostId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('/validations/post/:postId/consensus (GET)', () => {
    beforeEach(async () => {
      await prisma.validation.deleteMany({ where: { postId } });
    });

    it('should get consensus status', () => {
      return request(app.getHttpServer())
        .get(`/validations/post/${postId}/consensus`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('reached');
          expect(res.body).toHaveProperty('finalVerdict');
          expect(res.body).toHaveProperty('validatorCount');
          expect(res.body).toHaveProperty('consensusPercentage');
          expect(res.body).toHaveProperty('verdictCounts');
        });
    });

    it('should show no consensus with insufficient validations', () => {
      return request(app.getHttpServer())
        .get(`/validations/post/${postId}/consensus`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.reached).toBe(false);
          expect(res.body.finalVerdict).toBe('PENDING');
        });
    });
  });

  describe('Consensus mechanism integration', () => {
    let validator2Id: string;
    let validator3Id: string;

    beforeAll(async () => {
      // Create additional validators for consensus testing
      const validator2 = await prisma.user.create({
        data: {
          email: 'validator2@test.com',
          username: 'validator2',
          passwordHash: 'hashedpassword',
          profile: {
            create: {
              karma: 1500,
              league: 'AGNEYASTRA',
              role: 'VALIDATOR',
            },
          },
        },
      });
      validator2Id = validator2.id;

      const validator3 = await prisma.user.create({
        data: {
          email: 'validator3@test.com',
          username: 'validator3',
          passwordHash: 'hashedpassword',
          profile: {
            create: {
              karma: 2000,
              league: 'VARUNASTRA',
              role: 'VALIDATOR',
            },
          },
        },
      });
      validator3Id = validator3.id;
    });

    beforeEach(async () => {
      await prisma.validation.deleteMany({ where: { postId } });
      await prisma.post.update({
        where: { id: postId },
        data: { validationStatus: 'PENDING', validationCount: 0 },
      });
    });

    it('should reach consensus with 3 authentic validations', async () => {
      // Create 3 validations marking content as authentic
      await prisma.validation.createMany({
        data: [
          {
            postId,
            validatorId: userId,
            verdict: ValidationVerdict.AUTHENTIC,
            confidence: 0.8,
          },
          {
            postId,
            validatorId: validator2Id,
            verdict: ValidationVerdict.AUTHENTIC,
            confidence: 0.9,
          },
          {
            postId,
            validatorId: validator3Id,
            verdict: ValidationVerdict.AUTHENTIC,
            confidence: 0.85,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/validations/post/${postId}/consensus`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.reached).toBe(true);
      expect(response.body.finalVerdict).toBe('VERIFIED');
      expect(response.body.validatorCount).toBe(3);
      expect(response.body.consensusPercentage).toBe(100);

      // Check that post status was updated
      const updatedPost = await prisma.post.findUnique({
        where: { id: postId },
      });
      expect(updatedPost?.validationStatus).toBe('VERIFIED');
      expect(updatedPost?.validationCount).toBe(3);
    });

    it('should flag content with 3 fake validations', async () => {
      // Create 3 validations marking content as fake
      await prisma.validation.createMany({
        data: [
          {
            postId,
            validatorId: userId,
            verdict: ValidationVerdict.FAKE,
            confidence: 0.9,
          },
          {
            postId,
            validatorId: validator2Id,
            verdict: ValidationVerdict.FAKE,
            confidence: 0.95,
          },
          {
            postId,
            validatorId: validator3Id,
            verdict: ValidationVerdict.FAKE,
            confidence: 0.8,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/validations/post/${postId}/consensus`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.reached).toBe(true);
      expect(response.body.finalVerdict).toBe('FLAGGED');
      expect(response.body.validatorCount).toBe(3);

      // Check that post status was updated
      const updatedPost = await prisma.post.findUnique({
        where: { id: postId },
      });
      expect(updatedPost?.validationStatus).toBe('FLAGGED');
    });

    it('should not reach consensus with mixed validations below threshold', async () => {
      // Create mixed validations that don't reach 67% threshold
      await prisma.validation.createMany({
        data: [
          {
            postId,
            validatorId: userId,
            verdict: ValidationVerdict.AUTHENTIC,
            confidence: 0.8,
          },
          {
            postId,
            validatorId: validator2Id,
            verdict: ValidationVerdict.FAKE,
            confidence: 0.9,
          },
          {
            postId,
            validatorId: validator3Id,
            verdict: ValidationVerdict.UNCERTAIN,
            confidence: 0.6,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/validations/post/${postId}/consensus`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.reached).toBe(false);
      expect(response.body.finalVerdict).toBe('PENDING');
      expect(response.body.validatorCount).toBe(3);
      expect(response.body.consensusPercentage).toBeLessThan(67);
    });
  });
});