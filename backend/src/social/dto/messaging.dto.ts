import { IsString, IsUUID, IsArray, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';

export class CreateDirectMessageDto {
  @IsUUID()
  recipientId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;
}

export class CreateGroupChatDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];

  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean = false;
}

export class SendMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  message: string;
}

export class InviteToRoomDto {
  @IsArray()
  @IsUUID(4, { each: true })
  userIds: string[];
}