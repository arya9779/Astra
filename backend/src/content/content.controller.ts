import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ContentService } from './content.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateEngagementDto, RemoveEngagementDto } from './dto/engagement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post('posts')
  @UseInterceptors(FilesInterceptor('files', 10))
  async createPost(
    @Body() dto: CreatePostDto,
    @Request() req,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    const userId = req.user.id;
    return this.contentService.createPost(userId, dto, files);
  }

  @Get('posts/:id')
  async getPost(@Param('id') postId: string) {
    return this.contentService.getPost(postId);
  }

  @Delete('posts/:id')
  async deletePost(@Param('id') postId: string, @Request() req) {
    const userId = req.user.id;
    return this.contentService.deletePost(postId, userId);
  }

  @Get('feed')
  async getFeed(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const userId = req.user.id;
    const pagination = { page, limit, sortBy, sortOrder };
    return this.contentService.getFeed(userId, pagination);
  }

  @Get('reels')
  async getReels(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const pagination = { page, limit };
    return this.contentService.getReels(pagination);
  }

  @Get('discover')
  async getDiscoveryFeed(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('validationStatus') validationStatus?: string,
    @Query('minKarma') minKarma?: number,
    @Query('league') league?: string,
  ) {
    const pagination = { page, limit };
    const filters = { 
      validationStatus: validationStatus as any, 
      minKarma, 
      league 
    };
    return this.contentService.getDiscoveryFeed(pagination, filters);
  }

  @Get('recommended')
  async getRecommendedPosts(
    @Request() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const userId = req.user.id;
    const pagination = { page, limit };
    return this.contentService.getRecommendedPosts(userId, pagination);
  }

  @Post('posts/:id/engage')
  async createEngagement(
    @Param('id') postId: string,
    @Body() dto: Omit<CreateEngagementDto, 'postId'>,
    @Request() req,
  ) {
    const userId = req.user.id;
    const engagementDto = { ...dto, postId };
    return this.contentService.createEngagement(userId, engagementDto);
  }

  @Delete('posts/:id/engage')
  async removeEngagement(
    @Param('id') postId: string,
    @Body() dto: Omit<RemoveEngagementDto, 'postId'>,
    @Request() req,
  ) {
    const userId = req.user.id;
    const engagementDto = { ...dto, postId };
    return this.contentService.removeEngagement(userId, engagementDto);
  }

  @Get('posts/:id/engagements')
  async getPostEngagements(@Param('id') postId: string) {
    return this.contentService.getPostEngagements(postId);
  }

  @Get('posts/:id/user-engagements')
  async getUserEngagementsForPost(
    @Param('id') postId: string,
    @Request() req,
  ) {
    const userId = req.user.id;
    return this.contentService.getUserEngagementsForPost(postId, userId);
  }
}
