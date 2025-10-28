import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ModerationService } from './moderation.service';
import { ModerationController } from './moderation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KarmaModule } from '../karma/karma.module';

@Module({
  imports: [PrismaModule, ConfigModule, KarmaModule],
  controllers: [ModerationController],
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}