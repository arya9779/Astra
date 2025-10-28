'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { FollowButton } from './FollowButton';

interface UserFollowInfo {
  id: string;
  username: string;
  avatarUrl?: string;
  karma: number;
  league: string;
  followedAt: string;
}

interface FollowListProps {
  userId: string;
  currentUserId?: string;
}

export function FollowList({ userId, currentUserId }: FollowListProps) {
  const [followers, setFollowers] = useState<UserFollowInfo[]>([]);
  const [following, setFollowing] = useState<UserFollowInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersPage, setFollowersPage] = useState(1);
  const [followingPage, setFollowingPage] = useState(1);

  useEffect(() => {
    loadFollowData();
  }, [userId]);

  const loadFollowData = async () => {
    setLoading(true);
    try {
      const [followersRes, followingRes] = await Promise.all([
        api.get(`/social/followers/${userId}?page=1&limit=20`),
        api.get(`/social/following/${userId}?page=1&limit=20`),
      ]);
      
      setFollowers(followersRes.data);
      setFollowing(followingRes.data);
    } catch (error) {
      console.error('Failed to load follow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMoreFollowers = async () => {
    try {
      const res = await api.get(`/social/followers/${userId}?page=${followersPage + 1}&limit=20`);
      setFollowers(prev => [...prev, ...res.data]);
      setFollowersPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more followers:', error);
    }
  };

  const loadMoreFollowing = async () => {
    try {
      const res = await api.get(`/social/following/${userId}?page=${followingPage + 1}&limit=20`);
      setFollowing(prev => [...prev, ...res.data]);
      setFollowingPage(prev => prev + 1);
    } catch (error) {
      console.error('Failed to load more following:', error);
    }
  };

  const UserCard = ({ user }: { user: UserFollowInfo }) => (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback>{user.username[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold">{user.username}</h3>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">{user.league}</Badge>
                <span className="text-sm text-muted-foreground">{user.karma} Karma</span>
              </div>
            </div>
          </div>
          {currentUserId && currentUserId !== user.id && (
            <FollowButton userId={user.id} isFollowing={false} />
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return <div className="text-center py-8">Loading follow data...</div>;
  }

  return (
    <Tabs defaultValue="followers" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="followers">Followers ({followers.length})</TabsTrigger>
        <TabsTrigger value="following">Following ({following.length})</TabsTrigger>
      </TabsList>
      
      <TabsContent value="followers" className="space-y-4">
        {followers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No followers yet</p>
        ) : (
          <>
            {followers.map(user => (
              <UserCard key={user.id} user={user} />
            ))}
            <Button 
              onClick={loadMoreFollowers} 
              variant="outline" 
              className="w-full"
            >
              Load More
            </Button>
          </>
        )}
      </TabsContent>
      
      <TabsContent value="following" className="space-y-4">
        {following.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Not following anyone yet</p>
        ) : (
          <>
            {following.map(user => (
              <UserCard key={user.id} user={user} />
            ))}
            <Button 
              onClick={loadMoreFollowing} 
              variant="outline" 
              className="w-full"
            >
              Load More
            </Button>
          </>
        )}
      </TabsContent>
    </Tabs>
  );
}