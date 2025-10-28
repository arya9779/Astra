export enum ValidationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FLAGGED = 'FLAGGED',
  REJECTED = 'REJECTED',
}

export interface PostResponse {
  id: string;
  authorId: string;
  author: {
    id: string;
    username: string;
    karma: number;
    league: string;
    avatarUrl?: string;
  };
  content: string;
  mediaUrls: string[];
  mediaType?: string;
  ipfsHash?: string;
  validationStatus: ValidationStatus;
  validationCount: number;
  engagementCounts: {
    likes: number;
    comments: number;
    shares: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ModerationResult {
  approved: boolean;
  confidence: number;
  flags: string[];
  reason?: string;
}

export interface PaginationDto {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}