'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  Play, 
  Pause,
  Volume2,
  VolumeX,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useContentStore } from '@/store/contentStore';

interface ReelProps {
  reel: {
    id: string;
    content: string;
    mediaUrls: string[];
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
  isActive: boolean;
  onEngagement?: () => void;
}

const ReelCard: React.FC<ReelProps> = ({ reel, isActive, onEngagement }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isEngaging, setIsEngaging] = useState(false);
  
  const { engageWithPost, removeEngagement } = useContentStore();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const handleEngagement = async (type: 'LIKE' | 'SHARE') => {
    if (isEngaging) return;
    
    setIsEngaging(true);
    try {
      await engageWithPost(reel.id, type);
      onEngagement?.();
    } catch (error) {
      console.error(`Failed to ${type.toLowerCase()} reel:`, error);
    } finally {
      setIsEngaging(false);
    }
  };

  const getValidationIcon = () => {
    switch (reel.validationStatus) {
      case 'VERIFIED':
        return <ShieldCheck className="w-4 h-4 text-green-500" />;
      case 'FLAGGED':
      case 'REJECTED':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getLeagueColor = (league: string) => {
    const colors = {
      CHANDRIKA: 'text-gray-400',
      VAJRA: 'text-blue-400',
      AGNEYASTRA: 'text-orange-400',
      VARUNASTRA: 'text-cyan-400',
      PASHUPATASTRA: 'text-purple-400',
      BRAHMASTRA: 'text-yellow-400',
    };
    return colors[league as keyof typeof colors] || colors.CHANDRIKA;
  };

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        src={reel.mediaUrls[0]}
        className="w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlayPause}
      />

      {/* Play/Pause Overlay */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 cursor-pointer"
          onClick={togglePlayPause}
        >
          <Play className="w-16 h-16 text-white opacity-80" />
        </div>
      )}

      {/* Top Controls */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {getValidationIcon()}
          {reel.validationCount > 0 && (
            <Badge variant="secondary" className="bg-black bg-opacity-50 text-white">
              {reel.validationCount} validations
            </Badge>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleMute}
          className="bg-black bg-opacity-50 text-white hover:bg-black hover:bg-opacity-70"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Bottom Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
        <div className="flex items-end justify-between">
          <div className="flex-1 space-y-2">
            {/* Author Info */}
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={reel.author.avatarUrl} />
                <AvatarFallback className="text-xs">
                  {reel.author.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold text-sm">
                    {reel.author.username}
                  </span>
                  <Badge className={`text-xs ${getLeagueColor(reel.author.league)}`}>
                    {reel.author.league}
                  </Badge>
                </div>
                <div className="text-gray-300 text-xs">
                  {reel.author.karma} Karma • {formatDistanceToNow(new Date(reel.createdAt))} ago
                </div>
              </div>
            </div>

            {/* Content */}
            {reel.content && (
              <p className="text-white text-sm line-clamp-2">
                {reel.content}
              </p>
            )}
          </div>

          {/* Engagement Actions */}
          <div className="flex flex-col items-center gap-3 ml-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEngagement('LIKE')}
              disabled={isEngaging}
              className="flex flex-col items-center gap-1 text-white hover:text-red-400 p-2"
            >
              <Heart className="w-6 h-6" />
              <span className="text-xs">{reel.engagementCounts.likes}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-1 text-white hover:text-blue-400 p-2"
            >
              <MessageCircle className="w-6 h-6" />
              <span className="text-xs">{reel.engagementCounts.comments}</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEngagement('SHARE')}
              disabled={isEngaging}
              className="flex flex-col items-center gap-1 text-white hover:text-green-400 p-2"
            >
              <Share2 className="w-6 h-6" />
              <span className="text-xs">{reel.engagementCounts.shares}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ReelsViewer: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reels, setReels] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { getReels } = useContentStore();

  useEffect(() => {
    loadReels();
  }, []);

  const loadReels = async () => {
    setIsLoading(true);
    try {
      const reelsData = await getReels({ page: 1, limit: 20 });
      setReels(reelsData);
    } catch (error) {
      console.error('Failed to load reels:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScroll = (e: React.WheelEvent) => {
    e.preventDefault();
    
    if (e.deltaY > 0 && currentIndex < reels.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else if (e.deltaY < 0 && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Reels Available</h2>
          <p className="text-gray-400">Check back later for new video content</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="w-full h-screen overflow-hidden bg-black"
      onWheel={handleScroll}
    >
      <div 
        className="flex flex-col transition-transform duration-300 ease-in-out h-full"
        style={{ transform: `translateY(-${currentIndex * 100}vh)` }}
      >
        {reels.map((reel, index) => (
          <div key={reel.id} className="w-full h-screen flex-shrink-0">
            <ReelCard
              reel={reel}
              isActive={index === currentIndex}
              onEngagement={loadReels}
            />
          </div>
        ))}
      </div>

      {/* Navigation Indicators */}
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 space-y-2">
        {reels.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-8 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
};