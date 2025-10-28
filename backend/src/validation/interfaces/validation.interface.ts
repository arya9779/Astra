import { ValidationVerdict } from '../dto/submit-validation.dto';

export interface ValidationResponse {
  id: string;
  postId: string;
  validatorId: string;
  validator: {
    id: string;
    username: string;
    league: string;
    karma: number;
  };
  verdict: ValidationVerdict;
  confidence: number;
  notes?: string;
  blockchainTxHash?: string;
  createdAt: Date;
}

export interface ConsensusResult {
  reached: boolean;
  finalVerdict: 'VERIFIED' | 'FLAGGED' | 'PENDING';
  validatorCount: number;
  consensusPercentage: number;
  verdictCounts: {
    authentic: number;
    fake: number;
    uncertain: number;
  };
}

export interface ValidationStats {
  totalValidations: number;
  authenticCount: number;
  fakeCount: number;
  uncertainCount: number;
  consensusReached: boolean;
}