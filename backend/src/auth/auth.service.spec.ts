import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

// Mock ethers module
jest.mock('ethers', () => ({
  verifyMessage: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'Test123!',
      };

      const mockUser = {
        id: 'user-123',
        email: registerDto.email,
        username: registerDto.username,
        passwordHash: 'hashed-password',
        walletAddress: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        profile: {
          karma: 0,
          league: 'CHANDRIKA',
          role: 'CITIZEN',
        },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          userProfile: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.register(registerDto);

      expect(result.user.username).toBe(registerDto.username);
      expect(result.user.email).toBe(registerDto.email);
      expect(result.tokens.accessToken).toBe('mock-token');
      expect(mockPrismaService.user.findFirst).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        username: 'testuser',
        password: 'Test123!',
      };

      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Test123!',
      };

      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        username: 'testuser',
        passwordHash: await bcrypt.hash(loginDto.password, 10),
        profile: {
          karma: 100,
          league: 'VAJRA',
          role: 'CITIZEN',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('mock-token');

      const result = await service.login(loginDto);

      expect(result.user.email).toBe(loginDto.email);
      expect(result.tokens.accessToken).toBe('mock-token');
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should generate new tokens with valid refresh token', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        profile: {
          karma: 100,
          league: 'VAJRA',
          role: 'CITIZEN',
        },
      };

      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'user-123' });
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockResolvedValue('new-token');

      const result = await service.refreshToken(refreshToken);

      expect(result.accessToken).toBe('new-token');
      expect(result.refreshToken).toBe('new-token');
    });

    it('should throw UnauthorizedException with invalid refresh token', async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockJwtService.verifyAsync.mockResolvedValue({ sub: 'non-existent-user' });
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('valid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate access token with correct payload', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Test123!',
      };

      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        username: 'testuser',
        passwordHash: await bcrypt.hash(loginDto.password, 10),
        profile: {
          karma: 100,
          league: 'VAJRA',
          role: 'CITIZEN',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.signAsync.mockImplementation((payload, options) => {
        expect(payload).toHaveProperty('sub', 'user-123');
        expect(payload).toHaveProperty('username', 'testuser');
        expect(payload).toHaveProperty('email', 'test@example.com');
        return Promise.resolve('mock-token');
      });

      await service.login(loginDto);

      expect(mockJwtService.signAsync).toHaveBeenCalledTimes(2); // access + refresh
    });

    it('should generate tokens with different expiry times', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'Test123!',
      };

      const mockUser = {
        id: 'user-123',
        email: loginDto.email,
        username: 'testuser',
        passwordHash: await bcrypt.hash(loginDto.password, 10),
        profile: {
          karma: 100,
          league: 'VAJRA',
          role: 'CITIZEN',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      
      const signCalls: any[] = [];
      mockJwtService.signAsync.mockImplementation((payload, options) => {
        signCalls.push(options);
        return Promise.resolve('mock-token');
      });

      await service.login(loginDto);

      expect(signCalls[0].expiresIn).toBe('15m'); // access token
      expect(signCalls[1].expiresIn).toBe('7d'); // refresh token
    });
  });

  describe('Wallet Authentication', () => {
    const ethers = require('ethers');

    beforeEach(() => {
      jest.clearAllMocks();
      mockPrismaService.user.findUnique.mockReset();
      mockPrismaService.$transaction.mockReset();
      mockJwtService.signAsync.mockReset();
    });

    it('should generate wallet challenge message', async () => {
      const dto = {
        walletAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
      };

      const result = await service.generateWalletChallenge(dto);

      expect(result.message).toContain('Sign this message to authenticate with Astra Platform');
      expect(result.message).toContain(dto.walletAddress);
      expect(result.message).toContain('Timestamp:');
      expect(result.message).toContain('Nonce:');
    });

    it('should verify valid wallet signature and create new user', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const message = `Sign this message to authenticate with Astra Platform.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}\nNonce: abc123`;
      
      // Mock ethers.verifyMessage to return the wallet address
      (ethers.verifyMessage as jest.Mock).mockReturnValueOnce(walletAddress);

      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      
      const mockNewUser = {
        id: 'user-wallet-123',
        email: `${walletAddress.toLowerCase()}@wallet.astra`,
        username: `user_${walletAddress.substring(2, 10)}`,
        passwordHash: 'hashed',
        walletAddress,
        profile: {
          karma: 0,
          league: 'CHANDRIKA',
          role: 'CITIZEN',
        },
      };

      mockPrismaService.$transaction.mockImplementationOnce(async (callback) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockNewUser),
          },
          userProfile: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockNewUser);
      mockJwtService.signAsync.mockResolvedValue('wallet-token');

      const result = await service.verifyWalletSignature({
        walletAddress,
        message,
        signature: '0xsignature',
      });

      expect(result.user.userId).toBe('user-wallet-123');
      expect(result.tokens.accessToken).toBe('wallet-token');
    });

    it('should verify wallet signature and login existing user', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const message = `Sign this message to authenticate with Astra Platform.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}\nNonce: abc123`;
      
      (ethers.verifyMessage as jest.Mock).mockReturnValueOnce(walletAddress);

      const mockExistingUser = {
        id: 'existing-wallet-user',
        email: `${walletAddress.toLowerCase()}@wallet.astra`,
        username: 'existinguser',
        walletAddress,
        profile: {
          karma: 500,
          league: 'VAJRA',
          role: 'VALIDATOR',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockExistingUser);
      mockJwtService.signAsync.mockResolvedValue('wallet-token');

      const result = await service.verifyWalletSignature({
        walletAddress,
        message,
        signature: '0xsignature',
      });

      expect(result.user.userId).toBe('existing-wallet-user');
      expect(result.user.karma).toBe(500);
      expect(result.user.league).toBe('VAJRA');
    });

    it('should reject expired wallet challenge', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const oldTimestamp = Date.now() - (6 * 60 * 1000); // 6 minutes ago
      const message = `Sign this message to authenticate with Astra Platform.\n\nWallet: ${walletAddress}\nTimestamp: ${oldTimestamp}\nNonce: abc123`;
      
      (ethers.verifyMessage as jest.Mock).mockReturnValueOnce(walletAddress);

      await expect(
        service.verifyWalletSignature({
          walletAddress,
          message,
          signature: '0xsignature',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid wallet signature', async () => {
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const differentAddress = '0x123d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const message = `Sign this message to authenticate with Astra Platform.\n\nWallet: ${walletAddress}\nTimestamp: ${Date.now()}\nNonce: abc123`;
      
      // Mock returns different address (signature mismatch)
      (ethers.verifyMessage as jest.Mock).mockReturnValueOnce(differentAddress);

      await expect(
        service.verifyWalletSignature({
          walletAddress,
          message,
          signature: '0xinvalid-signature',
        })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should link wallet to existing user account', async () => {
      const userId = 'user-123';
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const message = `Link wallet to account\nWallet: ${walletAddress}`;
      
      (ethers.verifyMessage as jest.Mock).mockReturnValueOnce(walletAddress);

      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.user.update.mockResolvedValueOnce({
        id: userId,
        walletAddress,
      });

      const result = await service.linkWalletToAccount(userId, {
        walletAddress,
        message,
        signature: '0xsignature',
      });

      expect(result.success).toBe(true);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { walletAddress },
      });
    });

    it('should reject linking wallet already linked to another account', async () => {
      const userId = 'user-123';
      const walletAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';
      const message = `Link wallet to account\nWallet: ${walletAddress}`;
      
      (ethers.verifyMessage as jest.Mock).mockReturnValueOnce(walletAddress);

      mockPrismaService.user.findUnique.mockResolvedValueOnce({
        id: 'different-user-456',
        walletAddress,
      });

      await expect(
        service.linkWalletToAccount(userId, {
          walletAddress,
          message,
          signature: '0xsignature',
        })
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateUser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockPrismaService.user.findUnique.mockReset();
    });

    it('should return user payload for valid user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        profile: {
          karma: 100,
          league: 'VAJRA',
          role: 'CITIZEN',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.validateUser('user-123');

      expect(result.userId).toBe('user-123');
      expect(result.username).toBe('testuser');
      expect(result.karma).toBe(100);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValueOnce(null);

      await expect(service.validateUser('non-existent')).rejects.toThrow(UnauthorizedException);
    });
  });
});
