import { KarmaReason } from '../enums/karma-reason.enum';

export interface KarmaTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'AWARD' | 'DEDUCT';
  reason: KarmaReason;
  balanceAfter: number;
  blockchainTxHash?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface LeagueProgressionResult {
  promoted: boolean;
  oldLeague?: string;
  newLeague?: string;
  unlockedAstras?: string[];
}
