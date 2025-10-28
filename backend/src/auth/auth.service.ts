import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { WalletChallengeDto } from './dto/wallet-challenge.dto';
import { WalletVerifyDto } from './dto/wallet-verify.dto';
import { WalletLinkDto } from './dto/wallet-link.dto';
import { AuthResponse, TokenPair, UserPayload } from './interfaces/auth-response.interface';

@Injectable()
export class AuthService {
  private readonly SALT_ROUNDS = 10;
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.email },
          { username: dto.username },
          ...(dto.walletAddress ? [{ walletAddress: dto.walletAddress }] : []),
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === dto.email) {
        throw new ConflictException('Email already registered');
      }
      if (existingUser.username === dto.username) {
        throw new ConflictException('Username already taken');
      }
      if (dto.walletAddress && existingUser.walletAddress === dto.walletAddress) {
        throw new ConflictException('Wallet address already linked to another account');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);

    // Create user and profile in a transaction
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          username: dto.username,
          passwordHash,
          walletAddress: dto.walletAddress,
        },
      });

      // Create user profile with default values
      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          karma: 0,
          league: 'CHANDRIKA',
          role: 'CITIZEN',
        },
      });

      return newUser;
    });

    // Fetch complete user with profile
    const userWithProfile = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { profile: true },
    });

    // Generate tokens
    const tokens = await this.generateTokens(userWithProfile);

    return {
      user: this.mapToUserPayload(userWithProfile),
      tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      user: this.mapToUserPayload(user),
      tokens,
    };
  }

  async refreshToken(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'astra-refresh-secret',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { profile: true },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    // In a production app, you would invalidate the refresh token here
    // For now, we'll just return success as tokens are stateless
    // Future: Store refresh tokens in Redis with expiry
    return;
  }

  async validateUser(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.mapToUserPayload(user);
  }

  private async generateTokens(user: any): Promise<TokenPair> {
    const payload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_SECRET') || 'astra-secret-key',
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET') || 'astra-refresh-secret',
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async generateWalletChallenge(dto: WalletChallengeDto): Promise<{ message: string }> {
    const timestamp = Date.now();
    const nonce = Math.random().toString(36).substring(7);
    
    const message = `Sign this message to authenticate with Astra Platform.\n\nWallet: ${dto.walletAddress}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;
    
    // In production, store the challenge in Redis with expiry (5 minutes)
    // For now, we'll include timestamp validation in verification
    
    return { message };
  }

  async verifyWalletSignature(dto: WalletVerifyDto): Promise<AuthResponse> {
    try {
      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(dto.message, dto.signature);
      
      if (recoveredAddress.toLowerCase() !== dto.walletAddress.toLowerCase()) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Check if message is recent (within 5 minutes)
      const timestampMatch = dto.message.match(/Timestamp: (\d+)/);
      if (timestampMatch) {
        const timestamp = parseInt(timestampMatch[1]);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (now - timestamp > fiveMinutes) {
          throw new UnauthorizedException('Challenge expired');
        }
      }

      // Find or create user with this wallet
      let user = await this.prisma.user.findUnique({
        where: { walletAddress: dto.walletAddress },
        include: { profile: true },
      });

      if (!user) {
        // Create new user with wallet
        const username = `user_${dto.walletAddress.substring(2, 10)}`;
        const email = `${dto.walletAddress.toLowerCase()}@wallet.astra`;
        
        // Generate a random password (user won't use it, but it's required)
        const randomPassword = Math.random().toString(36).substring(2, 15);
        const passwordHash = await bcrypt.hash(randomPassword, this.SALT_ROUNDS);

        user = await this.prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              email,
              username,
              passwordHash,
              walletAddress: dto.walletAddress,
            },
          });

          await tx.userProfile.create({
            data: {
              userId: newUser.id,
              karma: 0,
              league: 'CHANDRIKA',
              role: 'CITIZEN',
            },
          });

          return newUser;
        });

        user = await this.prisma.user.findUnique({
          where: { id: user.id },
          include: { profile: true },
        });
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      return {
        user: this.mapToUserPayload(user),
        tokens,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new BadRequestException('Invalid signature or message format');
    }
  }

  async linkWalletToAccount(userId: string, dto: WalletLinkDto): Promise<{ success: boolean }> {
    try {
      // Verify the signature
      const recoveredAddress = ethers.verifyMessage(dto.message, dto.signature);
      
      if (recoveredAddress.toLowerCase() !== dto.walletAddress.toLowerCase()) {
        throw new UnauthorizedException('Invalid signature');
      }

      // Check if wallet is already linked to another account
      const existingWallet = await this.prisma.user.findUnique({
        where: { walletAddress: dto.walletAddress },
      });

      if (existingWallet && existingWallet.id !== userId) {
        throw new ConflictException('Wallet already linked to another account');
      }

      // Link wallet to user
      await this.prisma.user.update({
        where: { id: userId },
        data: { walletAddress: dto.walletAddress },
      });

      return { success: true };
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      throw new BadRequestException('Invalid signature or message format');
    }
  }

  private mapToUserPayload(user: any): UserPayload {
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      karma: user.profile?.karma || 0,
      league: user.profile?.league || 'CHANDRIKA',
      role: user.profile?.role || 'CITIZEN',
    };
  }
}
