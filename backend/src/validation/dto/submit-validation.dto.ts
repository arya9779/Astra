import { IsString, IsEnum, IsNumber, IsOptional, Min, Max } from 'class-validator';

export enum ValidationVerdict {
  AUTHENTIC = 'AUTHENTIC',
  FAKE = 'FAKE',
  UNCERTAIN = 'UNCERTAIN',
}

export class SubmitValidationDto {
  @IsString()
  postId: string;

  @IsEnum(ValidationVerdict)
  verdict: ValidationVerdict;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsOptional()
  @IsString()
  notes?: string;
}