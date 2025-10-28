import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { KarmaService } from './karma.service';
import { AwardKarmaDto } from './dto/award-karma.dto';
import { DeductKarmaDto } from './dto/deduct-karma.dto';
import { PaginationDto } from './dto/pagination.dto';

@Controller('karma')
export class KarmaController {
  constructor(private readonly karmaService: KarmaService) {}

  @Post('award')
  async awardKarma(@Body() dto: AwardKarmaDto) {
    return this.karmaService.awardKarma(dto);
  }

  @Post('deduct')
  async deductKarma(@Body() dto: DeductKarmaDto) {
    return this.karmaService.deductKarma(dto);
  }

  @Get('history/:userId')
  async getKarmaHistory(
    @Param('userId') userId: string,
    @Query() pagination: PaginationDto
  ) {
    return this.karmaService.getKarmaHistory(userId, pagination);
  }

  @Get('league-status/:userId')
  async checkLeagueProgression(@Param('userId') userId: string) {
    return this.karmaService.checkLeagueProgression(userId);
  }

  @Post('sync-blockchain/:transactionId')
  async syncToBlockchain(@Param('transactionId') transactionId: string) {
    const txHash = await this.karmaService.syncToBlockchain(transactionId);
    return { blockchainTxHash: txHash };
  }
}
