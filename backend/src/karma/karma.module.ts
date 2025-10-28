import { Module } from '@nestjs/common';
import { KarmaService } from './karma.service';
import { KarmaController } from './karma.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [PrismaModule, BlockchainModule],
  controllers: [KarmaController],
  providers: [KarmaService],
  exports: [KarmaService],
})
export class KarmaModule {}
