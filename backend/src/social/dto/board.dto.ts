import { IsString, IsOptional, IsBoolean, IsEnum, IsArray, IsUUID, MinLength, MaxLength } from 'class-validator';

export enum BoardType {
  PROFESSIONAL = 'PROFESSIONAL',
  WHISTLEBLOWER = 'WHISTLEBLOWER',
  COMMUNITY = 'COMMUNITY',
}

export class CreateBoardDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(BoardType)
  type: BoardType;

  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean = false;
}

export class InviteToBoardDto {
  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];
}

export class UpdateBoardDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class BoardMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsEnum(['OWNER', 'ADMIN', 'MEMBER'])
  role?: string = 'MEMBER';
}