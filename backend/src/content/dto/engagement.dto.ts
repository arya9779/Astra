import { IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';

export enum EngagementType {
  LIKE = 'LIKE',
  COMMENT = 'COMMENT',
  SHARE = 'SHARE',
}

export class CreateEngagementDto {
  @IsString()
  postId: string;

  @IsEnum(EngagementType)
  type: EngagementType;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string; // For comments
}

export class RemoveEngagementDto {
  @IsString()
  postId: string;

  @IsEnum(EngagementType)
  type: EngagementType;
}