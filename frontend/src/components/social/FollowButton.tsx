'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface FollowButtonProps {
  userId: string;
  isFollowing: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export function FollowButton({ userId, isFollowing, onFollowChange }: FollowButtonProps) {
  const [loading, setLoading] = useState(false);
  const [following, setFollowing] = useState(isFollowing);
  const { toast } = useToast();

  const handleFollow = async () => {
    setLoading(true);
    try {
      if (following) {
        await api.delete(`/social/follow/${userId}`);
        setFollowing(false);
        onFollowChange?.(false);
        toast({
          title: 'Unfollowed',
          description: 'You are no longer following this user.',
        });
      } else {
        await api.post('/social/follow', { followeeId: userId });
        setFollowing(true);
        onFollowChange?.(true);
        toast({
          title: 'Following',
          description: 'You are now following this user.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update follow status',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleFollow}
      disabled={loading}
      variant={following ? 'outline' : 'default'}
      size="sm"
    >
      {loading ? 'Loading...' : following ? 'Unfollow' : 'Follow'}
    </Button>
  );
}