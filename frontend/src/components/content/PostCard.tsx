'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Shield, 
  ShieldCheck, 
  AlertTriangle,
  MoreHorizontal 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useContentStore } from '@/store/contentStore';
import { ValidationButton, ValidationBadge } from '@/components/validation';

interface PostCardProps {
  post: {
    id: string;
    content: string;
    mediaUrls: string[];
    mediaType?: string;
    validationStatus: 'PENDING' | 'VERIFIED' | 'FLAGGED' | 'REJECTED';
    validationCount: number;
    author: {
      id: string;
      username: string;
      karma: number;
      league: string;
      avatarUrl?: string;
    };
    engagementCounts: {
      likes: number;
      comments: number;
      shares: number;
    };
    createdAt: string;
  };
  userEngagements?: {
    liked: boolean;
    shared: boolean;
  };
  onEngagement?: () => void;
  onValidationUpdate?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  userEngagements = { liked: false, shared: false },
  onEngagement,
  onValidationUpdate
}) => {
  const [isEngaging, setIsEngaging] = useState(false);
  const { engageWithPost, removeEngagement } = useContentStore();

  const handleValidationUpdate = () => {
    onValidationUpdate?.();
  };

  const getLeagueBadge = (league: string) => {
    const colors = {
      CHANDRIKA: 'bg-gray-100 text-gray-800',
      VAJRA: 'bg-blue-100 text-blue-800',
      AGNEYASTRA: 'bg-orange-100 text-orange-800',
      VARUNASTRA: 'bg-cyan-100 text-cyan-800',
      PASHUPATASTRA: 'bg-purple-100 text-purple-800',
      BRAHMASTRA: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <Badge className={colors[league as keyof typeof colors] || colors.CHANDRIKA}>
        {league}
      </Badge>
    );
  };

  const handleEngagement = async (type: 'LIKE' | 'SHARE') => {
    if (isEngaging) return;
    
    setIsEngaging(true);
    try {
      const isCurrentlyEngaged = type === 'LIKE' ? userEngagements.liked : userEngagements.shared;
      
      if (isCurrentlyEngaged) {
        await removeEngagement(post.id, type);
      } else {
        await engageWithPost(post.id, type);
      }
      
      onEngagement?.();
    } catch (error) {
      console.error(`Failed to ${type.toLowerCase()} post:`, error);
    } finally {
      setIsEngaging(false);
    }
  };

  const renderMedia = () => {
    if (!post.mediaUrls || post.mediaUrls.length === 0) return null;

    return (
      <div className="mt-3 space-y-2">
        {post.mediaUrls.map((url, index) => {
          if (post.mediaType === 'IMAGE') {
            return (
              <img
                key={index}
                src={url}
                alt={`Post media ${index + 1}`}
                className="w-full rounded-lg max-h-96 object-cover"
              />
            );
          } else if (post.mediaType === 'VIDEO') {
            return (
              <video
                key={index}
                src={url}
                controls
                className="w-full rounded-lg max-h-96"
              />
            );
          } else if (post.mediaType === 'AUDIO') {
            return (
              <audio
                key={index}
                src={url}
                controls
                className="w-full"
              />
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={post.author.avatarUrl} />
              <AvatarFallback>
                {post.author.username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{post.author.username}</h3>
                {getLeagueBadge(post.author.league)}
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{post.author.karma} Karma</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(post.createdAt))} ago</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ValidationBadge 
              validationStatus={post.validationStatus}
              validationCount={post.validationCount}
            />
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Post Content */}
          <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>

          {/* Media */}
          {renderMedia()}

          {/* Validation Info */}
          {post.validationCount > 0 && (
            <div className="text-sm text-gray-500">
              Validated by {post.validationCount} user{post.validationCount !== 1 ? 's' : ''}
            </div>
          )}

          {/* Engagement Actions */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEngagement('LIKE')}
                disabled={isEngaging}
                className={userEngagements.liked ? 'text-red-500' : ''}
              >
                <Heart 
                  className={`w-4 h-4 mr-1 ${userEngagements.liked ? 'fill-current' : ''}`} 
                />
                {post.engagementCounts.likes}
              </Button>

              <Button variant="ghost" size="sm">
                <MessageCircle className="w-4 h-4 mr-1" />
                {post.engagementCounts.comments}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEngagement('SHARE')}
                disabled={isEngaging}
                className={userEngagements.shared ? 'text-blue-500' : ''}
              >
                <Share2 className="w-4 h-4 mr-1" />
                {post.engagementCounts.shares}
              </Button>

              <ValidationButton
                post={{
                  id: post.id,
                  content: post.content,
                  authorId: post.author.id,
                  author: {
                    username: post.author.username,
                    league: post.author.league,
                  },
                  validationStatus: post.validationStatus,
                }}
                onValidationSubmitted={handleValidationUpdate}
              />
            </div>

            {/* Validation Status */}
            <div className="text-xs text-gray-500">
              {post.mediaType && post.mediaType !== 'TEXT' && (
                <span className="mr-2">{post.mediaType}</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};