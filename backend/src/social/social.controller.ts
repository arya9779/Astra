import { 
  Controller, 
  Post, 
  Delete, 
  Get, 
  Put,
  Body, 
  Param, 
  Query, 
  UseGuards, 
  HttpCode, 
  HttpStatus 
} from '@nestjs/common';
import { SocialService } from './social.service';
import { FollowUserDto, UnfollowUserDto, PaginationDto } from './dto/follow.dto';
import { CreateDirectMessageDto, CreateGroupChatDto, SendMessageDto, InviteToRoomDto } from './dto/messaging.dto';
import { CreateBoardDto, InviteToBoardDto, UpdateBoardDto } from './dto/board.dto';
import { CreateAnonymousPostDto } from './dto/anonymous.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('social')
@UseGuards(JwtAuthGuard)
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async followUser(@CurrentUser() user: any, @Body() dto: FollowUserDto) {
    await this.socialService.followUser(user.id, dto.followeeId);
  }

  @Delete('follow/:followeeId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollowUser(@CurrentUser() user: any, @Param('followeeId') followeeId: string) {
    await this.socialService.unfollowUser(user.id, followeeId);
  }

  @Get('followers/:userId')
  async getFollowers(@Param('userId') userId: string, @Query() pagination: PaginationDto) {
    return this.socialService.getFollowers(userId, pagination);
  }

  @Get('following/:userId')
  async getFollowing(@Param('userId') userId: string, @Query() pagination: PaginationDto) {
    return this.socialService.getFollowing(userId, pagination);
  }

  @Get('stats/:userId')
  async getFollowStats(@CurrentUser() user: any, @Param('userId') userId: string) {
    return this.socialService.getFollowStats(userId, user.id);
  }

  @Get('is-following/:userId')
  async isFollowing(@CurrentUser() user: any, @Param('userId') userId: string) {
    const isFollowing = await this.socialService.isFollowing(user.id, userId);
    return { isFollowing };
  }

  // Messaging endpoints

  @Post('messages/direct')
  async createDirectMessage(@CurrentUser() user: any, @Body() dto: CreateDirectMessageDto) {
    return this.socialService.createDirectMessage(user.id, dto);
  }

  @Post('messages/group')
  async createGroupChat(@CurrentUser() user: any, @Body() dto: CreateGroupChatDto) {
    return this.socialService.createGroupChat(user.id, dto);
  }

  @Post('rooms/:roomId/message')
  @HttpCode(HttpStatus.NO_CONTENT)
  async sendMessageToRoom(
    @CurrentUser() user: any, 
    @Param('roomId') roomId: string, 
    @Body() dto: SendMessageDto
  ) {
    await this.socialService.sendMessageToRoom(user.id, roomId, dto.message);
  }

  @Post('rooms/:roomId/invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  async inviteToRoom(
    @Param('roomId') roomId: string, 
    @Body() dto: InviteToRoomDto
  ) {
    await this.socialService.inviteUsersToRoom(roomId, dto.userIds);
  }

  @Get('rooms/:roomId')
  async getRoomInfo(@Param('roomId') roomId: string) {
    return this.socialService.getRoomInfo(roomId);
  }

  // Board endpoints

  @Post('boards')
  async createBoard(@CurrentUser() user: any, @Body() dto: CreateBoardDto) {
    return this.socialService.createBoard(user.id, dto);
  }

  @Post('boards/:boardId/invite')
  @HttpCode(HttpStatus.NO_CONTENT)
  async inviteToBoard(
    @CurrentUser() user: any,
    @Param('boardId') boardId: string,
    @Body() dto: InviteToBoardDto
  ) {
    await this.socialService.inviteToBoard(boardId, user.id, dto);
  }

  @Get('boards/:boardId')
  async getBoard(@CurrentUser() user: any, @Param('boardId') boardId: string) {
    return this.socialService.getBoard(boardId, user.id);
  }

  @Get('boards/:boardId/members')
  async getBoardMembers(
    @CurrentUser() user: any,
    @Param('boardId') boardId: string,
    @Query() pagination: PaginationDto
  ) {
    return this.socialService.getBoardMembers(boardId, user.id, pagination);
  }

  @Get('me/boards')
  async getMyBoards(@CurrentUser() user: any, @Query() pagination: PaginationDto) {
    return this.socialService.getUserBoards(user.id, pagination);
  }

  @Put('boards/:boardId')
  async updateBoard(
    @CurrentUser() user: any,
    @Param('boardId') boardId: string,
    @Body() dto: UpdateBoardDto
  ) {
    return this.socialService.updateBoard(boardId, user.id, dto);
  }

  @Delete('boards/:boardId/leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  async leaveBoard(@CurrentUser() user: any, @Param('boardId') boardId: string) {
    await this.socialService.leaveBoard(boardId, user.id);
  }

  // Anonymous posting endpoints

  @Post('boards/:boardId/anonymous-post')
  async createAnonymousPost(
    @CurrentUser() user: any,
    @Param('boardId') boardId: string,
    @Body() dto: Omit<CreateAnonymousPostDto, 'boardId'>
  ) {
    return this.socialService.createAnonymousPost(user.id, { ...dto, boardId });
  }

  @Get('boards/:boardId/anonymous-posts')
  async getAnonymousPosts(
    @CurrentUser() user: any,
    @Param('boardId') boardId: string,
    @Query() pagination: PaginationDto
  ) {
    return this.socialService.getAnonymousPosts(boardId, user.id, pagination);
  }

  @Post('zk-proof/generate')
  async generateZKProof(
    @CurrentUser() user: any,
    @Body() dto: { requiredLeague: string; secret: string }
  ) {
    return this.socialService.generateZKProof(user.id, dto.requiredLeague, dto.secret);
  }
}
