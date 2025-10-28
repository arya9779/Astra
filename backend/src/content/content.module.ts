import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { IpfsService } from './services/ipfs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { KarmaModule } from '../karma/karma.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    KarmaModule,
    AiModule,
    MulterModule.register({
      storage: 'memory', // Store files in memory for IPFS upload
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit
      },
    }),
  ],
  controllers: [ContentController],
  providers: [ContentService, IpfsService],
  exports: [ContentService, IpfsService],
})
export class ContentModule {}
