import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ModerationService } from './moderation.service';
import { ReviewModerationDto, PaginationDto } from './dto/moderation.dto';

@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
  constructor(private readonly moderationService: ModerationService) {}

  @Get('queue')
  async getModerationQueue(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pagination: PaginationDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };

    return this.moderationService.getModerationQueue(req.user.id, pagination);
  }

  @Post('review')
  async reviewModeration(@Request() req, @Body() dto: ReviewModerationDto) {
    await this.moderationService.reviewModeration(req.user.id, dto);
    return { message: 'Moderation review completed successfully' };
  }

  @Get('stats')
  async getModerationStats(@Request() req) {
    return this.moderationService.getModerationStats(req.user.id);
  }
}