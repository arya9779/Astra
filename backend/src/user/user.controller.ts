import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Get(':id/profile')
  getProfile(@Param('id') id: string, @CurrentUser() user?: any) {
    const requesterId = user?.userId;
    return this.userService.getUserProfile(id, requesterId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/profile')
  getMyProfile(@CurrentUser() user: any) {
    return this.userService.getUserProfile(user.userId, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/profile')
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.userService.updateProfile(user.userId, dto);
  }

  @Public()
  @Get(':id/stats')
  getUserStats(@Param('id') id: string) {
    return this.userService.getUserStats(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/stats')
  getMyStats(@CurrentUser() user: any) {
    return this.userService.getUserStats(user.userId);
  }

  @Public()
  @Get(':id/league')
  getLeagueStatus(@Param('id') id: string) {
    return this.userService.getLeagueStatus(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/league')
  getMyLeagueStatus(@CurrentUser() user: any) {
    return this.userService.getLeagueStatus(user.userId);
  }

  @Public()
  @Get(':id/karma')
  getKarmaBalance(@Param('id') id: string) {
    return this.userService.getKarmaBalance(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/karma')
  getMyKarmaBalance(@CurrentUser() user: any) {
    return this.userService.getKarmaBalance(user.userId);
  }

  @Public()
  @Get(':id/astras')
  getUnlockedAstras(@Param('id') id: string) {
    return this.userService.getUnlockedAstras(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/astras')
  getMyUnlockedAstras(@CurrentUser() user: any) {
    return this.userService.getUnlockedAstras(user.userId);
  }
}
