export interface UserProfile {
  id: string;
  username: string;
  email: string;
  walletAddress?: string;
  karma: number;
  league: string;
  role: string;
  avatarUrl?: string;
  bio?: string;
  visibility: string;
  createdAt: Date;
  unlockedAstras: string[];
}

export interface UserStats {
  totalPosts: number;
  totalValidations: number;
  totalKarmaEarned: number;
  totalKarmaSpent: number;
  followersCount: number;
  followingCount: number;
}

export interface LeagueInfo {
  current: string;
  nextLeague?: string;
  karmaRequired?: number;
  karmaProgress: number;
  unlockedPowers: string[];
}
