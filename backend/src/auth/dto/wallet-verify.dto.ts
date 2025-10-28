import { IsString, Matches } from 'class-validator';

export class WalletVerifyDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Invalid Ethereum wallet address',
  })
  walletAddress: string;

  @IsString()
  signature: string;

  @IsString()
  message: string;
}
