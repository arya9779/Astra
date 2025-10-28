import { 
  Controller, 
  Post, 
  Get, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  Request
} from '@nestjs/common';
import { ValidationService } from './validation.service';
import { SubmitValidationDto } from './dto/submit-validation.dto';
import { PaginationDto } from './dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('validations')
@UseGuards(JwtAuthGuard)
export class ValidationController {
  constructor(private readonly validationService: ValidationService) {}

  @Post()
  async submitValidation(@Request() req: any, @Body() dto: SubmitValidationDto) {
    return this.validationService.submitValidation(req.user.id, dto);
  }

  @Get('post/:postId')
  async getValidations(
    @Param('postId') postId: string,
    @Query() pagination: PaginationDto
  ) {
    return this.validationService.getValidations(postId, pagination);
  }

  @Get('post/:postId/consensus')
  async getConsensus(@Param('postId') postId: string) {
    return this.validationService.checkConsensus(postId);
  }
}
