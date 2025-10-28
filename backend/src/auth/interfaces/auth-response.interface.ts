export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserPayload {
  userId: string;
  username: string;
  email: string;
  karma: number;
  league: string;
  role: string;
}

export interface AuthResponse {
  user: UserPayload;
  tokens: TokenPair;
}
