export interface ModerationResult {
  flagged: boolean;
  confidence: number;
  categories: {
    hate: number;
    violence: number;
    sexual: number;
    selfHarm: number;
    harassment: number;
  };
  reason?: string;
}

export interface DeepfakeResult {
  isDeepfake: boolean;
  confidence: number;
  reason?: string;
}

export interface MisinformationResult {
  isMisinformation: boolean;
  confidence: number;
  reason?: string;
}

export interface ContentModerationResult {
  approved: boolean;
  confidence: number;
  flags: string[];
  reason?: string;
  requiresManualReview: boolean;
}