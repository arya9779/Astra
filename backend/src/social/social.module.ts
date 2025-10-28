import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController } from './social.controller';
import { MatrixService } from './services/matrix.service';
import { ZKProofService } from './services/zk-proof.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SocialController],
  providers: [SocialService, MatrixService, ZKProofService],
  exports: [SocialService, MatrixService, ZKProofService],
})
export class SocialModule {}
