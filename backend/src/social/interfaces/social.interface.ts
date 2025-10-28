export interface FollowRelation {
  followerId: string;
  followeeId: string;
  createdAt: Date;
}

export interface UserFollowInfo {
  id: string;
  username: string;
  avatarUrl?: string;
  karma: number;
  league: string;
  followedAt: Date;
}

export interface FollowStats {
  followersCount: number;
  followingCount: number;
  isFollowing?: boolean;
}

export interface BoardInfo {
  id: string;
  name: string;
  description?: string;
  type: string;
  isEncrypted: boolean;
  matrixRoomId?: string;
  ownerId: string;
  owner: {
    id: string;
    username: string;
    avatarUrl?: string;
  };
  memberCount: number;
  createdAt: Date;
}

export interface BoardMember {
  userId: string;
  username: string;
  avatarUrl?: string;
  karma: number;
  league: string;
  role: string;
  joinedAt: Date;
}