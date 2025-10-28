import { Injectable, BadRequestException, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserFollowInfo, FollowStats, BoardInfo, BoardMember } from './interfaces/social.interface';
import { PaginationDto } from './dto/follow.dto';
import { MatrixService, DirectMessageDto, GroupChatDto, MatrixRoom } from './services/matrix.service';
import { CreateDirectMessageDto, CreateGroupChatDto } from './dto/messaging.dto';
import { CreateBoardDto, InviteToBoardDto, UpdateBoardDto, BoardType } from './dto/board.dto';
import { CreateAnonymousPostDto, AnonymousPostResponse } from './dto/anonymous.dto';
import { ZKProofService, ZKProof } from './services/zk-proof.service';

@Injectable()
export class SocialService {
  // Leagues that can create Professional Boards (Varunastra+)
  private readonly PROFESSIONAL_BOARD_LEAGUES = ['VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'];
  
  // Leagues that can create Whistleblower Boards (Varunastra+)
  private readonly WHISTLEBLOWER_BOARD_LEAGUES = ['VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'];

  constructor(
    private prisma: PrismaService,
    private matrixService: MatrixService,
    private zkProofService: ZKProofService,
  ) {}

  async followUser(followerId: string, followeeId: string): Promise<void> {
    // Prevent self-following
    if (followerId === followeeId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    // Check if followee exists
    const followee = await this.prisma.user.findUnique({
      where: { id: followeeId },
    });

    if (!followee) {
      throw new NotFoundException('User to follow not found');
    }

    // Check if already following
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('Already following this user');
    }

    // Create follow relationship
    await this.prisma.follow.create({
      data: {
        followerId,
        followeeId,
      },
    });
  }

  async unfollowUser(followerId: string, followeeId: string): Promise<void> {
    // Check if follow relationship exists
    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId,
        },
      },
    });

    if (!existingFollow) {
      throw new NotFoundException('Not following this user');
    }

    // Remove follow relationship
    await this.prisma.follow.delete({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId,
        },
      },
    });
  }

  async getFollowers(userId: string, pagination: PaginationDto): Promise<UserFollowInfo[]> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const followers = await this.prisma.follow.findMany({
      where: { followeeId: userId },
      include: {
        follower: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return followers.map((follow) => ({
      id: follow.follower.id,
      username: follow.follower.username,
      avatarUrl: follow.follower.profile?.avatarUrl,
      karma: follow.follower.profile?.karma || 0,
      league: follow.follower.profile?.league || 'CHANDRIKA',
      followedAt: follow.createdAt,
    }));
  }

  async getFollowing(userId: string, pagination: PaginationDto): Promise<UserFollowInfo[]> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const following = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: {
        followee: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return following.map((follow) => ({
      id: follow.followee.id,
      username: follow.followee.username,
      avatarUrl: follow.followee.profile?.avatarUrl,
      karma: follow.followee.profile?.karma || 0,
      league: follow.followee.profile?.league || 'CHANDRIKA',
      followedAt: follow.createdAt,
    }));
  }

  async getFollowStats(userId: string, requesterId?: string): Promise<FollowStats> {
    const [followersCount, followingCount, isFollowingRecord] = await Promise.all([
      this.prisma.follow.count({ where: { followeeId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
      requesterId && requesterId !== userId
        ? this.prisma.follow.findUnique({
            where: {
              followerId_followeeId: {
                followerId: requesterId,
                followeeId: userId,
              },
            },
          })
        : null,
    ]);

    return {
      followersCount,
      followingCount,
      isFollowing: !!isFollowingRecord,
    };
  }

  async isFollowing(followerId: string, followeeId: string): Promise<boolean> {
    const follow = await this.prisma.follow.findUnique({
      where: {
        followerId_followeeId: {
          followerId,
          followeeId,
        },
      },
    });

    return !!follow;
  }

  // Matrix Messaging Methods

  async createDirectMessage(senderId: string, dto: CreateDirectMessageDto): Promise<{ roomId: string }> {
    // Verify recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    // Prevent messaging yourself
    if (senderId === dto.recipientId) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    if (!this.matrixService.isClientReady()) {
      throw new BadRequestException('Messaging service is not available');
    }

    const roomId = await this.matrixService.createDirectMessage(senderId, {
      recipientId: dto.recipientId,
      message: dto.message,
    });

    return { roomId };
  }

  async createGroupChat(creatorId: string, dto: CreateGroupChatDto): Promise<MatrixRoom> {
    // Verify all users exist
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: dto.userIds },
      },
    });

    if (users.length !== dto.userIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    // Remove creator from userIds if present (they'll be added automatically)
    const inviteUserIds = dto.userIds.filter(id => id !== creatorId);

    if (!this.matrixService.isClientReady()) {
      throw new BadRequestException('Messaging service is not available');
    }

    return await this.matrixService.createGroupChat(creatorId, {
      name: dto.name,
      userIds: inviteUserIds,
      isEncrypted: dto.isEncrypted,
    });
  }

  async sendMessageToRoom(senderId: string, roomId: string, message: string): Promise<void> {
    if (!this.matrixService.isClientReady()) {
      throw new BadRequestException('Messaging service is not available');
    }

    await this.matrixService.sendMessageToRoom(roomId, message);
  }

  async inviteUsersToRoom(roomId: string, userIds: string[]): Promise<void> {
    // Verify all users exist
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    if (!this.matrixService.isClientReady()) {
      throw new BadRequestException('Messaging service is not available');
    }

    // Invite each user
    for (const userId of userIds) {
      await this.matrixService.inviteUserToRoom(roomId, userId);
    }
  }

  async getRoomInfo(roomId: string): Promise<MatrixRoom | null> {
    if (!this.matrixService.isClientReady()) {
      throw new BadRequestException('Messaging service is not available');
    }

    return await this.matrixService.getRoomInfo(roomId);
  }

  // Board Management Methods

  async createBoard(creatorId: string, dto: CreateBoardDto): Promise<BoardInfo> {
    // Get user's league status
    const user = await this.prisma.user.findUnique({
      where: { id: creatorId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User not found');
    }

    const userLeague = user.profile.league;

    // Check league requirements for board type
    if (dto.type === BoardType.PROFESSIONAL && !this.PROFESSIONAL_BOARD_LEAGUES.includes(userLeague)) {
      throw new ForbiddenException('Varunastra League or higher required to create Professional Boards');
    }

    if (dto.type === BoardType.WHISTLEBLOWER && !this.WHISTLEBLOWER_BOARD_LEAGUES.includes(userLeague)) {
      throw new ForbiddenException('Varunastra League or higher required to create Whistleblower Boards');
    }

    let matrixRoomId: string | undefined;

    // Create Matrix room if messaging is available
    if (this.matrixService.isClientReady()) {
      try {
        const matrixRoom = await this.matrixService.createGroupChat(creatorId, {
          name: dto.name,
          userIds: [], // Start with just the creator
          isEncrypted: dto.isEncrypted,
        });
        matrixRoomId = matrixRoom.roomId;
      } catch (error) {
        // Log error but don't fail board creation
        console.warn('Failed to create Matrix room for board:', error);
      }
    }

    // Create board in database
    const board = await this.prisma.board.create({
      data: {
        name: dto.name,
        description: dto.description,
        ownerId: creatorId,
        type: dto.type,
        isEncrypted: dto.isEncrypted || false,
        matrixRoomId,
      },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    // Add creator as owner member
    await this.prisma.boardMember.create({
      data: {
        boardId: board.id,
        userId: creatorId,
        role: 'OWNER',
      },
    });

    return {
      id: board.id,
      name: board.name,
      description: board.description,
      type: board.type,
      isEncrypted: board.isEncrypted,
      matrixRoomId: board.matrixRoomId,
      ownerId: board.ownerId,
      owner: {
        id: user.id,
        username: user.username,
        avatarUrl: user.profile.avatarUrl,
      },
      memberCount: 1, // Just the creator initially
      createdAt: board.createdAt,
    };
  }

  async inviteToBoard(boardId: string, inviterId: string, dto: InviteToBoardDto): Promise<void> {
    // Check if board exists and user has permission to invite
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: {
          where: { userId: inviterId },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    const inviterMembership = board.members[0];
    if (!inviterMembership || !['OWNER', 'ADMIN'].includes(inviterMembership.role)) {
      throw new ForbiddenException('Only board owners and admins can invite members');
    }

    // Verify all users exist
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: dto.userIds },
      },
    });

    if (users.length !== dto.userIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    // Check which users are not already members
    const existingMembers = await this.prisma.boardMember.findMany({
      where: {
        boardId,
        userId: { in: dto.userIds },
      },
    });

    const existingUserIds = existingMembers.map(m => m.userId);
    const newUserIds = dto.userIds.filter(id => !existingUserIds.includes(id));

    if (newUserIds.length === 0) {
      throw new BadRequestException('All users are already members of this board');
    }

    // Add new members to database
    await this.prisma.boardMember.createMany({
      data: newUserIds.map(userId => ({
        boardId,
        userId,
        role: 'MEMBER',
      })),
    });

    // Invite to Matrix room if available
    if (board.matrixRoomId && this.matrixService.isClientReady()) {
      try {
        for (const userId of newUserIds) {
          await this.matrixService.inviteUserToRoom(board.matrixRoomId, userId);
        }
      } catch (error) {
        console.warn('Failed to invite users to Matrix room:', error);
      }
    }
  }

  async getBoard(boardId: string, userId?: string): Promise<BoardInfo> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        members: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
      },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    // Check if user has access to this board
    if (userId) {
      const membership = board.members.find(m => m.userId === userId);
      if (!membership) {
        throw new ForbiddenException('You are not a member of this board');
      }
    }

    const owner = board.members.find(m => m.role === 'OWNER')?.user;

    return {
      id: board.id,
      name: board.name,
      description: board.description,
      type: board.type,
      isEncrypted: board.isEncrypted,
      matrixRoomId: board.matrixRoomId,
      ownerId: board.ownerId,
      owner: {
        id: owner?.id || board.ownerId,
        username: owner?.username || 'Unknown',
        avatarUrl: owner?.profile?.avatarUrl,
      },
      memberCount: board.members.length,
      createdAt: board.createdAt,
    };
  }

  async getBoardMembers(boardId: string, userId: string, pagination: PaginationDto): Promise<BoardMember[]> {
    // Check if user is a member of the board
    const membership = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this board');
    }

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const members = await this.prisma.boardMember.findMany({
      where: { boardId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
      skip,
      take: limit,
    });

    return members.map(member => ({
      userId: member.userId,
      username: member.user.username,
      avatarUrl: member.user.profile?.avatarUrl,
      karma: member.user.profile?.karma || 0,
      league: member.user.profile?.league || 'CHANDRIKA',
      role: member.role,
      joinedAt: member.joinedAt,
    }));
  }

  async getUserBoards(userId: string, pagination: PaginationDto): Promise<BoardInfo[]> {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const memberships = await this.prisma.boardMember.findMany({
      where: { userId },
      include: {
        board: {
          include: {
            members: {
              include: {
                user: {
                  include: {
                    profile: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
      skip,
      take: limit,
    });

    return memberships.map(membership => {
      const board = membership.board;
      const owner = board.members.find(m => m.role === 'OWNER')?.user;

      return {
        id: board.id,
        name: board.name,
        description: board.description,
        type: board.type,
        isEncrypted: board.isEncrypted,
        matrixRoomId: board.matrixRoomId,
        ownerId: board.ownerId,
        owner: {
          id: owner?.id || board.ownerId,
          username: owner?.username || 'Unknown',
          avatarUrl: owner?.profile?.avatarUrl,
        },
        memberCount: board.members.length,
        createdAt: board.createdAt,
      };
    });
  }

  async updateBoard(boardId: string, userId: string, dto: UpdateBoardDto): Promise<BoardInfo> {
    // Check if user is the owner
    const membership = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
    });

    if (!membership || membership.role !== 'OWNER') {
      throw new ForbiddenException('Only board owners can update board details');
    }

    const updatedBoard = await this.prisma.board.update({
      where: { id: boardId },
      data: {
        name: dto.name,
        description: dto.description,
      },
    });

    return this.getBoard(boardId, userId);
  }

  async leaveBoard(boardId: string, userId: string): Promise<void> {
    const membership = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException('You are not a member of this board');
    }

    if (membership.role === 'OWNER') {
      throw new BadRequestException('Board owners cannot leave their boards. Transfer ownership first.');
    }

    await this.prisma.boardMember.delete({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
    });
  }

  // Anonymous Whistleblower Methods

  async createAnonymousPost(userId: string, dto: CreateAnonymousPostDto): Promise<AnonymousPostResponse> {
    // Verify board exists and is a whistleblower board
    const board = await this.prisma.board.findUnique({
      where: { id: dto.boardId },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.type !== BoardType.WHISTLEBLOWER) {
      throw new BadRequestException('Anonymous posting is only allowed on whistleblower boards');
    }

    // Check if user is a member of the board
    const membership = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId: dto.boardId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must be a member of this board to post anonymously');
    }

    // Get user's league status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User profile not found');
    }

    const userLeague = user.profile.league;

    // Generate ZK proof if not provided
    let zkProof: ZKProof;
    if (dto.zkProof) {
      zkProof = dto.zkProof;
    } else {
      // Generate ZK proof that user meets Varunastra+ requirement
      zkProof = await this.zkProofService.generateLeagueProof(
        userId,
        userLeague,
        'VARUNASTRA',
        dto.secret
      );
    }

    // Get existing nullifiers to prevent double-posting
    const existingPosts = await this.prisma.anonymousPost.findMany({
      where: { boardId: dto.boardId },
      select: { nullifierHash: true },
    });
    const usedNullifiers = new Set<string>(existingPosts.map(p => p.nullifierHash));

    // Verify ZK proof
    const isValidProof = await this.zkProofService.verifyLeagueProof(
      zkProof,
      'VARUNASTRA',
      usedNullifiers
    );

    if (!isValidProof) {
      throw new BadRequestException('Invalid zero-knowledge proof or nullifier already used');
    }

    // Create anonymous post
    const anonymousPost = await this.prisma.anonymousPost.create({
      data: {
        boardId: dto.boardId,
        content: dto.content,
        nullifierHash: zkProof.nullifierHash,
        zkProof: zkProof as any,
      },
    });

    // Generate anonymous ID for display
    const anonymousId = this.zkProofService.generateAnonymousId(zkProof.nullifierHash);

    return {
      id: anonymousPost.id,
      content: anonymousPost.content,
      boardId: anonymousPost.boardId,
      anonymousId,
      createdAt: anonymousPost.createdAt,
    };
  }

  async getAnonymousPosts(boardId: string, userId: string, pagination: PaginationDto): Promise<AnonymousPostResponse[]> {
    // Verify board exists and user has access
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
    });

    if (!board) {
      throw new NotFoundException('Board not found');
    }

    if (board.type !== BoardType.WHISTLEBLOWER) {
      throw new BadRequestException('This endpoint is only for whistleblower boards');
    }

    // Check if user is a member
    const membership = await this.prisma.boardMember.findUnique({
      where: {
        boardId_userId: {
          boardId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You must be a member of this board to view anonymous posts');
    }

    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const posts = await this.prisma.anonymousPost.findMany({
      where: { boardId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return posts.map(post => ({
      id: post.id,
      content: post.content,
      boardId: post.boardId,
      anonymousId: this.zkProofService.generateAnonymousId(post.nullifierHash),
      createdAt: post.createdAt,
    }));
  }

  async generateZKProof(userId: string, requiredLeague: string, secret: string): Promise<ZKProof> {
    // Get user's league status
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || !user.profile) {
      throw new NotFoundException('User profile not found');
    }

    return await this.zkProofService.generateLeagueProof(
      userId,
      user.profile.league,
      requiredLeague,
      secret
    );
  }
}
