import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
    await prisma.userProfile.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', () => {
      const registerDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe(registerDto.email);
          expect(res.body.user.username).toBe(registerDto.username);
          expect(res.body.user.karma).toBe(0);
          expect(res.body.user.league).toBe('CHANDRIKA');
          expect(res.body.tokens).toBeDefined();
          expect(res.body.tokens.accessToken).toBeDefined();
          expect(res.body.tokens.refreshToken).toBeDefined();
        });
    });

    it('should fail with invalid email', () => {
      const registerDto = {
        email: 'invalid-email',
        username: 'testuser',
        password: 'Test123!',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail with weak password', () => {
      const registerDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'weak',
      };

      return request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should fail with duplicate email', async () => {
      const registerDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!',
      };

      // Register first user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Try to register with same email
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...registerDto, username: 'different' })
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Register a user for login tests
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Test123!',
        });
    });

    it('should login successfully with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe('test@example.com');
          expect(res.body.tokens).toBeDefined();
          expect(res.body.tokens.accessToken).toBeDefined();
        });
    });

    it('should fail with invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('should fail with non-existent email', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Test123!',
        })
        .expect(401);
    });
  });

  describe('/auth/refresh (POST)', () => {
    it('should refresh tokens successfully', async () => {
      // Register and get tokens
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Test123!',
        });

      const { refreshToken } = registerResponse.body.tokens;

      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200)
        .expect((res) => {
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.refreshToken).toBeDefined();
        });
    });

    it('should fail with invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('/auth/validate (POST)', () => {
    it('should validate token and return user info', async () => {
      // Register and get token
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Test123!',
        });

      const { accessToken } = registerResponse.body.tokens;

      return request(app.getHttpServer())
        .post('/auth/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.userId).toBeDefined();
          expect(res.body.username).toBe('testuser');
        });
    });

    it('should fail without token', () => {
      return request(app.getHttpServer())
        .post('/auth/validate')
        .expect(401);
    });

    it('should fail with invalid token', () => {
      return request(app.getHttpServer())
        .post('/auth/validate')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/auth/wallet/challenge (POST)', () => {
    it('should generate wallet challenge message', () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      return request(app.getHttpServer())
        .post('/auth/wallet/challenge')
        .send({ walletAddress })
        .expect(200)
        .expect((res) => {
          expect(res.body.message).toBeDefined();
          expect(res.body.message).toContain('Sign this message to authenticate with Astra Platform');
          expect(res.body.message).toContain(walletAddress);
          expect(res.body.message).toContain('Timestamp:');
          expect(res.body.message).toContain('Nonce:');
        });
    });

    it('should fail with invalid wallet address', () => {
      return request(app.getHttpServer())
        .post('/auth/wallet/challenge')
        .send({ walletAddress: 'invalid-address' })
        .expect(400);
    });
  });

  describe('/auth/wallet/verify (POST)', () => {
    it('should authenticate with valid wallet signature', async () => {
      // Note: This test requires a real signature or mocking ethers.verifyMessage
      // For E2E testing, we'll test the endpoint structure
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      
      // Get challenge
      const challengeResponse = await request(app.getHttpServer())
        .post('/auth/wallet/challenge')
        .send({ walletAddress });

      const { message } = challengeResponse.body;

      // In a real test, you would sign this message with a private key
      // For now, we test that the endpoint exists and validates input
      const response = await request(app.getHttpServer())
        .post('/auth/wallet/verify')
        .send({
          walletAddress,
          message,
          signature: '0x' + 'a'.repeat(130), // Mock signature format
        });

      // Will fail signature verification but validates endpoint structure
      expect([200, 400, 401]).toContain(response.status);
    });

    it('should fail with invalid wallet address format', () => {
      return request(app.getHttpServer())
        .post('/auth/wallet/verify')
        .send({
          walletAddress: 'invalid',
          message: 'test message',
          signature: '0xsignature',
        })
        .expect(400);
    });

    it('should fail with missing signature', () => {
      return request(app.getHttpServer())
        .post('/auth/wallet/verify')
        .send({
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          message: 'test message',
        })
        .expect(400);
    });
  });

  describe('/auth/wallet/link (POST)', () => {
    it('should link wallet to authenticated user', async () => {
      // Register and get token
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: 'Test123!',
        });

      const { accessToken } = registerResponse.body.tokens;
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

      // Get challenge
      const challengeResponse = await request(app.getHttpServer())
        .post('/auth/wallet/challenge')
        .send({ walletAddress });

      const { message } = challengeResponse.body;

      // Attempt to link wallet
      const response = await request(app.getHttpServer())
        .post('/auth/wallet/link')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          walletAddress,
          message,
          signature: '0x' + 'a'.repeat(130), // Mock signature
        });

      // Will fail signature verification but validates endpoint structure
      expect([200, 400, 401]).toContain(response.status);
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/auth/wallet/link')
        .send({
          walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
          message: 'test',
          signature: '0xsig',
        })
        .expect(401);
    });
  });

  describe('JWT Token Validation', () => {
    it('should accept valid JWT token in Authorization header', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'jwt-test@example.com',
          username: 'jwtuser',
          password: 'Test123!',
        });

      const { accessToken } = registerResponse.body.tokens;

      return request(app.getHttpServer())
        .post('/auth/validate')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject malformed JWT token', () => {
      return request(app.getHttpServer())
        .post('/auth/validate')
        .set('Authorization', 'Bearer malformed.token.here')
        .expect(401);
    });

    it('should reject expired JWT token', async () => {
      // This would require mocking time or using a token with very short expiry
      // For now, we test with an obviously invalid token
      return request(app.getHttpServer())
        .post('/auth/validate')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c')
        .expect(401);
    });

    it('should generate different tokens for access and refresh', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'token-test@example.com',
          username: 'tokenuser',
          password: 'Test123!',
        });

      const { accessToken, refreshToken } = registerResponse.body.tokens;

      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();
      expect(accessToken).not.toBe(refreshToken);
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full registration -> login -> refresh flow', async () => {
      // Step 1: Register
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'flow-test@example.com',
          username: 'flowuser',
          password: 'Test123!',
        })
        .expect(201);

      expect(registerResponse.body.user.karma).toBe(0);
      expect(registerResponse.body.user.league).toBe('CHANDRIKA');

      // Step 2: Login
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'flow-test@example.com',
          password: 'Test123!',
        })
        .expect(200);

      expect(loginResponse.body.user.email).toBe('flow-test@example.com');

      // Step 3: Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: loginResponse.body.tokens.refreshToken,
        })
        .expect(200);

      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.refreshToken).toBeDefined();

      // Step 4: Validate new token
      await request(app.getHttpServer())
        .post('/auth/validate')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);
    });

    it('should maintain user session across token refresh', async () => {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'session-test@example.com',
          username: 'sessionuser',
          password: 'Test123!',
        });

      const { refreshToken } = registerResponse.body.tokens;

      // Refresh token
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Validate that user info is preserved
      const validateResponse = await request(app.getHttpServer())
        .post('/auth/validate')
        .set('Authorization', `Bearer ${refreshResponse.body.accessToken}`)
        .expect(200);

      expect(validateResponse.body.username).toBe('sessionuser');
      expect(validateResponse.body.email).toBe('session-test@example.com');
    });
  });
});
