import { IsString, IsUUID, MinLength, MaxLength, IsObject } from 'class-validator';

export class CreateAnonymousPostDto {
  @IsUUID()
  boardId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  content: string;

  @IsString()
  secret: string; // Used for ZK proof generation

  @IsObject()
  zkProof?: {
    proof: string;
    publicSignal: string;
    nullifierHash: string;
  };
}

export class AnonymousPostResponse {
  id: string;
  content: string;
  boardId: string;
  anonymousId: string;
  createdAt: Date;
}