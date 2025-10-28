import { Controller, Get } from '@nestjs/common';
import { MarketplaceService } from './marketplace.service';

@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Get('rewards')
  listRewards() {
    return this.marketplaceService.listRewards();
  }
}
