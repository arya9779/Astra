import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Content (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userToken: string;
  let userId: string;
  let testPostId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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
    await prisma.postEngagement.deleteMany();
    await prisma.validation.deleteMany();
    await prisma.post.deleteMany();
    await prisma.karmaTransaction.deleteMany();
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();

    // Create test user and get token
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'content-test@example.com',
        username: 'contentuser',
        password: 'Test123!',
      });

    userToken = registerResponse.body.tokens.accessToken;
    userId = registerResponse.body.user.id;
  });

  describe('/content/posts (POST)', () => {
    it('should create a text post successfully', () => {
      const createPostDto = {
        content: 'This is a test post about blockchain technology and its impact on social media.',
        mediaType: 'TEXT',
      };

      return request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createPostDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.content).toBe(createPostDto.content);
          expect(res.body.mediaType).toBe('TEXT');
          expect(res.body.validationStatus).toBe('PENDING');
          expect(res.body.validationCount).toBe(0);
          expect(res.body.author.username).toBe('contentuser');
          expect(res.body.engagementCounts).toEqual({
            likes: 0,
            comments: 0,
            shares: 0,
          });
          testPostId = res.body.id;
        });
    });

    it('should create a post with media URLs', () => {
      const createPostDto = {
        content: 'Check out this amazing image!',
        mediaType: 'IMAGE',
        mediaUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
      };

      return request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createPostDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.mediaUrls).toEqual(createPostDto.mediaUrls);
          expect(res.body.mediaType).toBe('IMAGE');
        });
    });

    it('should fail without authentication', () => {
      const createPostDto = {
        content: 'This should fail',
        mediaType: 'TEXT',
      };

      return request(app.getHttpServer())
        .post('/content/posts')
        .send(createPostDto)
        .expect(401);
    });

    it('should fail with empty content', () => {
      const createPostDto = {
        content: '',
        mediaType: 'TEXT',
      };

      return request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createPostDto)
        .expect(400);
    });

    it('should fail with content exceeding character limit', () => {
      const createPostDto = {
        content: 'a'.repeat(5001), // Exceeds 5000 character limit
        mediaType: 'TEXT',
      };

      return request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send(createPostDto)
        .expect(400);
    });
  });

  describe('/content/posts/:id (GET)', () => {
    beforeEach(async () => {
      // Create a test post
      const response = await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Test post for retrieval',
          mediaType: 'TEXT',
        });
      testPostId = response.body.id;
    });

    it('should retrieve a post by ID', () => {
      return request(app.getHttpServer())
        .get(`/content/posts/${testPostId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(testPostId);
          expect(res.body.content).toBe('Test post for retrieval');
          expect(res.body.author.username).toBe('contentuser');
        });
    });

    it('should return 404 for non-existent post', () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .get(`/content/posts/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get(`/content/posts/${testPostId}`)
        .expect(401);
    });
  });

  describe('/content/posts/:id (DELETE)', () => {
    beforeEach(async () => {
      // Create a test post
      const response = await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Test post for deletion',
          mediaType: 'TEXT',
        });
      testPostId = response.body.id;
    });

    it('should delete own post successfully', () => {
      return request(app.getHttpServer())
        .delete(`/content/posts/${testPostId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);
    });

    it('should fail to delete non-existent post', () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      
      return request(app.getHttpServer())
        .delete(`/content/posts/${fakeId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(404);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/content/posts/${testPostId}`)
        .expect(401);
    });
  });

  describe('/content/feed (GET)', () => {
    beforeEach(async () => {
      // Create multiple test posts
      await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'First post in feed',
          mediaType: 'TEXT',
        });

      await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Second post in feed',
          mediaType: 'TEXT',
        });
    });

    it('should retrieve user feed', () => {
      return request(app.getHttpServer())
        .get('/content/feed')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('id');
          expect(res.body[0]).toHaveProperty('content');
          expect(res.body[0]).toHaveProperty('author');
          expect(res.body[0]).toHaveProperty('engagementCounts');
        });
    });

    it('should support pagination', () => {
      return request(app.getHttpServer())
        .get('/content/feed?page=1&limit=1')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(1);
        });
    });

    it('should support sorting', () => {
      return request(app.getHttpServer())
        .get('/content/feed?sortBy=createdAt&sortOrder=asc')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/content/feed')
        .expect(401);
    });
  });

  describe('/content/reels (GET)', () => {
    beforeEach(async () => {
      // Create a video post (reel)
      await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'This is a video reel',
          mediaType: 'VIDEO',
          mediaUrls: ['https://example.com/video.mp4'],
        });
    });

    it('should retrieve reels (video posts)', () => {
      return request(app.getHttpServer())
        .get('/content/reels')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0].mediaType).toBe('VIDEO');
          }
        });
    });

    it('should support pagination for reels', () => {
      return request(app.getHttpServer())
        .get('/content/reels?page=1&limit=5')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/content/reels')
        .expect(401);
    });
  });

  describe('/content/discover (GET)', () => {
    beforeEach(async () => {
      // Create posts for discovery
      await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Discoverable post about technology',
          mediaType: 'TEXT',
        });
    });

    it('should retrieve discovery feed', () => {
      return request(app.getHttpServer())
        .get('/content/discover')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should support filtering by validation status', () => {
      return request(app.getHttpServer())
        .get('/content/discover?validationStatus=PENDING')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should support filtering by league', () => {
      return request(app.getHttpServer())
        .get('/content/discover?league=CHANDRIKA')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/content/discover')
        .expect(401);
    });
  });

  describe('/content/recommended (GET)', () => {
    it('should retrieve recommended posts', () => {
      return request(app.getHttpServer())
        .get('/content/recommended')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should support pagination for recommendations', () => {
      return request(app.getHttpServer())
        .get('/content/recommended?page=1&limit=10')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get('/content/recommended')
        .expect(401);
    });
  });

  describe('/content/posts/:id/engage (POST)', () => {
    beforeEach(async () => {
      // Create another user and post to engage with
      const otherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'other-user@example.com',
          username: 'otheruser',
          password: 'Test123!',
        });

      const otherUserToken = otherUserResponse.body.tokens.accessToken;

      const postResponse = await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          content: 'Post to engage with',
          mediaType: 'TEXT',
        });

      testPostId = postResponse.body.id;
    });

    it('should like a post successfully', () => {
      return request(app.getHttpServer())
        .post(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'LIKE' })
        .expect(201);
    });

    it('should share a post successfully', () => {
      return request(app.getHttpServer())
        .post(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'SHARE' })
        .expect(201);
    });

    it('should fail to like own post', async () => {
      // Create post with current user
      const ownPostResponse = await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'My own post',
          mediaType: 'TEXT',
        });

      return request(app.getHttpServer())
        .post(`/content/posts/${ownPostResponse.body.id}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'LIKE' })
        .expect(400);
    });

    it('should fail with invalid engagement type', () => {
      return request(app.getHttpServer())
        .post(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'INVALID' })
        .expect(400);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post(`/content/posts/${testPostId}/engage`)
        .send({ type: 'LIKE' })
        .expect(401);
    });

    it('should prevent duplicate likes', async () => {
      // First like
      await request(app.getHttpServer())
        .post(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'LIKE' })
        .expect(201);

      // Second like should fail
      return request(app.getHttpServer())
        .post(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'LIKE' })
        .expect(400);
    });
  });

  describe('/content/posts/:id/engage (DELETE)', () => {
    beforeEach(async () => {
      // Create another user and post, then engage with it
      const otherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'other-user2@example.com',
          username: 'otheruser2',
          password: 'Test123!',
        });

      const otherUserToken = otherUserResponse.body.tokens.accessToken;

      const postResponse = await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          content: 'Post to engage with',
          mediaType: 'TEXT',
        });

      testPostId = postResponse.body.id;

      // Like the post first
      await request(app.getHttpServer())
        .post(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'LIKE' });
    });

    it('should remove like successfully', () => {
      return request(app.getHttpServer())
        .delete(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'LIKE' })
        .expect(200);
    });

    it('should fail to remove non-existent engagement', () => {
      return request(app.getHttpServer())
        .delete(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'SHARE' }) // Never shared this post
        .expect(404);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .delete(`/content/posts/${testPostId}/engage`)
        .send({ type: 'LIKE' })
        .expect(401);
    });
  });

  describe('/content/posts/:id/engagements (GET)', () => {
    beforeEach(async () => {
      // Create post and add some engagements
      const postResponse = await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Post with engagements',
          mediaType: 'TEXT',
        });

      testPostId = postResponse.body.id;

      // Create another user to engage with the post
      const otherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'engager@example.com',
          username: 'engager',
          password: 'Test123!',
        });

      const otherUserToken = otherUserResponse.body.tokens.accessToken;

      // Add engagement
      await request(app.getHttpServer())
        .post(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ type: 'LIKE' });
    });

    it('should retrieve post engagement counts', () => {
      return request(app.getHttpServer())
        .get(`/content/posts/${testPostId}/engagements`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('likes');
          expect(res.body).toHaveProperty('comments');
          expect(res.body).toHaveProperty('shares');
          expect(typeof res.body.likes).toBe('number');
          expect(res.body.likes).toBeGreaterThanOrEqual(1);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get(`/content/posts/${testPostId}/engagements`)
        .expect(401);
    });
  });

  describe('/content/posts/:id/user-engagements (GET)', () => {
    beforeEach(async () => {
      // Create another user and post
      const otherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'post-owner@example.com',
          username: 'postowner',
          password: 'Test123!',
        });

      const otherUserToken = otherUserResponse.body.tokens.accessToken;

      const postResponse = await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          content: 'Post to check user engagements',
          mediaType: 'TEXT',
        });

      testPostId = postResponse.body.id;

      // Engage with the post
      await request(app.getHttpServer())
        .post(`/content/posts/${testPostId}/engage`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ type: 'LIKE' });
    });

    it('should retrieve user engagements for post', () => {
      return request(app.getHttpServer())
        .get(`/content/posts/${testPostId}/user-engagements`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('liked');
          expect(res.body).toHaveProperty('shared');
          expect(res.body.liked).toBe(true);
          expect(res.body.shared).toBe(false);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .get(`/content/posts/${testPostId}/user-engagements`)
        .expect(401);
    });
  });

  describe('Content Integration Flow', () => {
    it('should complete full content lifecycle: create -> engage -> retrieve', async () => {
      // Step 1: Create post
      const createResponse = await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Integration test post with comprehensive content',
          mediaType: 'TEXT',
        })
        .expect(201);

      const postId = createResponse.body.id;
      expect(createResponse.body.engagementCounts.likes).toBe(0);

      // Step 2: Create another user to engage
      const otherUserResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'integration-user@example.com',
          username: 'integrationuser',
          password: 'Test123!',
        });

      const otherUserToken = otherUserResponse.body.tokens.accessToken;

      // Step 3: Engage with post
      await request(app.getHttpServer())
        .post(`/content/posts/${postId}/engage`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ type: 'LIKE' })
        .expect(201);

      // Step 4: Verify engagement in post retrieval
      const getResponse = await request(app.getHttpServer())
        .get(`/content/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(getResponse.body.engagementCounts.likes).toBe(1);

      // Step 5: Verify post appears in feeds
      const feedResponse = await request(app.getHttpServer())
        .get('/content/feed')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      const postInFeed = feedResponse.body.find((p: any) => p.id === postId);
      expect(postInFeed).toBeDefined();
      expect(postInFeed.engagementCounts.likes).toBe(1);

      // Step 6: Remove engagement
      await request(app.getHttpServer())
        .delete(`/content/posts/${postId}/engage`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({ type: 'LIKE' })
        .expect(200);

      // Step 7: Verify engagement removal
      const finalResponse = await request(app.getHttpServer())
        .get(`/content/posts/${postId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(finalResponse.body.engagementCounts.likes).toBe(0);
    });

    it('should handle multiple users engaging with same post', async () => {
      // Create post
      const postResponse = await request(app.getHttpServer())
        .post('/content/posts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          content: 'Popular post for multiple engagements',
          mediaType: 'TEXT',
        });

      const postId = postResponse.body.id;

      // Create multiple users and have them engage
      const users = [];
      for (let i = 0; i < 3; i++) {
        const userResponse = await request(app.getHttpServer())
          .post('/auth/register')
          .send({
            email: `multi-user-${i}@example.com`,
            username: `multiuser${i}`,
            password: 'Test123!',
          });

        users.push(userResponse.body.tokens.accessToken);

        // Each user likes the post
        await request(app.getHttpServer())
          .post(`/content/posts/${postId}/engage`)
          .set('Authorization', `Bearer ${userResponse.body.tokens.accessToken}`)
          .send({ type: 'LIKE' });
      }

      // Verify total engagement count
      const engagementResponse = await request(app.getHttpServer())
        .get(`/content/posts/${postId}/engagements`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(engagementResponse.body.likes).toBe(3);
    });
  });
});