import { Controller, Post, Body } from '@nestjs/common';
import { GovernanceService } from './governance.service';

@Controller('governance')
export class GovernanceController {
  constructor(private readonly governanceService: GovernanceService) {}

  @Post('proposals')
  createProposal(@Body() dto: any) {
    return this.governanceService.createProposal('user-id', dto);
  }
}
