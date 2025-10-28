import { IsUUID, IsNotEmpty } from 'class-validator';

export class FollowUserDto {
  @IsUUID()
  @IsNotEmpty()
  followeeId: string;
}

export class UnfollowUserDto {
  @IsUUID()
  @IsNotEmpty()
  followeeId: string;
}

export class PaginationDto {
  page?: number = 1;
  limit?: number = 20;
}