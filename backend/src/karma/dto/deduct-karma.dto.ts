import { IsString, IsInt, IsPositive, IsEnum, IsOptional, IsObject } from 'class-validator';
import { KarmaReason } from '../enums/karma-reason.enum';

export class DeductKarmaDto {
  @IsString()
  userId: string;

  @IsInt()
  @IsPositive()
  amount: number;

  @IsEnum(KarmaReason)
  reason: KarmaReason;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
