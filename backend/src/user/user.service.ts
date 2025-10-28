import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserProfile, UserStats, LeagueInfo } from './interfaces/user-profile.interface';

@Injectable()
export class UserService {
  private readonly LEAGUE_THRESHOLDS = {
    CHANDRIKA: 0,
    VAJRA: 500,
    AGNEYASTRA: 1500,
    VARUNASTRA: 3500,
    PASHUPATASTRA: 8000,
    BRAHMASTRA: 15000,
  };

  private readonly LEAGUE_POWERS = {
    CHANDRIKA: ['Basic posting', 'Basic engagement'],
    VAJRA: ['Content validation', 'Downvote fake posts'],
    AGNEYASTRA: ['Detect fake media', 'Live streaming'],
    VARUNASTRA: ['Encrypted boards', 'Professional collaboration'],
    PASHUPATASTRA: ['Truth Council voting', 'Moderator privileges'],
    BRAHMASTRA: ['Astral Nexus DAO access', 'All Astra powers'],
  };

  constructor(private prisma: PrismaService) {}

  async getUserProfile(userId: string, requesterId?: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userAstras: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check visibility permissions
    if (user.profile?.visibility === 'PRIVATE' && requesterId !== userId) {
      throw new ForbiddenException('This profile is private');
    }

    if (user.profile?.visibility === 'FOLLOWERS_ONLY' && requesterId !== userId) {
      // Check if requester follows this user
      if (requesterId) {
        const isFollowing = await this.prisma.follow.findUnique({
          where: {
            followerId_followeeId: {
              followerId: requesterId,
              followeeId: userId,
            },
          },
        });

        if (!isFollowing) {
          throw new ForbiddenException('This profile is only visible to followers');
        }
      } else {
        throw new ForbiddenException('This profile is only visible to followers');
      }
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      walletAddress: user.walletAddress,
      karma: user.profile?.karma || 0,
      league: user.profile?.league || 'CHANDRIKA',
      role: user.profile?.role || 'CITIZEN',
      avatarUrl: user.profile?.avatarUrl,
      bio: user.profile?.bio,
      visibility: user.profile?.visibility || 'PUBLIC',
      createdAt: user.createdAt,
      unlockedAstras: user.userAstras.map((astra) => astra.astraType),
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        visibility: dto.visibility,
      },
    });

    return this.getUserProfile(userId, userId);
  }

  async getUserStats(userId: string): Promise<UserStats> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [
      totalPosts,
      totalValidations,
      karmaTransactions,
      followersCount,
      followingCount,
    ] = await Promise.all([
      this.prisma.post.count({ where: { authorId: userId } }),
      this.prisma.validation.count({ where: { validatorId: userId } }),
      this.prisma.karmaTransaction.findMany({
        where: { userId },
        select: { amount: true, type: true },
      }),
      this.prisma.follow.count({ where: { followeeId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    const totalKarmaEarned = karmaTransactions
      .filter((tx) => tx.type === 'AWARD')
      .reduce((sum, tx) => sum + tx.amount, 0);

    const totalKarmaSpent = karmaTransactions
      .filter((tx) => tx.type === 'DEDUCT')
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      totalPosts,
      totalValidations,
      totalKarmaEarned,
      totalKarmaSpent,
      followersCount,
      followingCount,
    };
  }

  async getLeagueStatus(userId: string): Promise<LeagueInfo> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User not found');
    }

    const currentLeague = user.profile.league;
    const currentKarma = user.profile.karma;

    const leagues = Object.keys(this.LEAGUE_THRESHOLDS);
    const currentIndex = leagues.indexOf(currentLeague);
    const nextLeague = currentIndex < leagues.length - 1 ? leagues[currentIndex + 1] : undefined;

    let karmaRequired: number | undefined;
    let karmaProgress = 0;

    if (nextLeague) {
      karmaRequired = this.LEAGUE_THRESHOLDS[nextLeague];
      const currentThreshold = this.LEAGUE_THRESHOLDS[currentLeague];
      karmaProgress = ((currentKarma - currentThreshold) / (karmaRequired - currentThreshold)) * 100;
      karmaProgress = Math.max(0, Math.min(100, karmaProgress));
    }

    return {
      current: currentLeague,
      nextLeague,
      karmaRequired,
      karmaProgress,
      unlockedPowers: this.LEAGUE_POWERS[currentLeague] || [],
    };
  }

  async getKarmaBalance(userId: string): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User not found');
    }

    return user.profile.karma;
  }

  async getUnlockedAstras(userId: string): Promise<string[]> {
    const astras = await this.prisma.userAstra.findMany({
      where: { userId },
      select: { astraType: true },
    });

    return astras.map((astra) => astra.astraType);
  }
}
