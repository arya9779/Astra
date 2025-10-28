import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';

export enum ModerationAction {
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
}

export class ReviewModerationDto {
  @IsUUID()
  moderationId: string;

  @IsEnum(ModerationAction)
  action: ModerationAction;

  @IsOptional()
  @IsString()
  notes?: string;
}

export interface ModerationQueueItem {
  id: string;
  postId: string;
  post: {
    id: string;
    content: string;
    mediaUrls: string[];
    mediaType: string;
    author: {
      id: string;
      username: string;
      karma: number;
      league: string;
    };
    createdAt: Date;
  };
  reason: string;
  aiFlags: string[];
  confidence: number;
  status: string;
  createdAt: Date;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
}