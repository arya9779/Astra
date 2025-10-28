'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PostCard } from './PostCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Filter } from 'lucide-react';
import { useContentStore } from '@/store/contentStore';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

interface FeedProps {
  type?: 'feed' | 'discover' | 'recommended';
  filters?: {
    validationStatus?: string;
    minKarma?: number;
    league?: string;
  };
}

export const Feed: React.FC<FeedProps> = ({ type = 'feed', filters }) => {
  const [activeTab, setActiveTab] = useState(type);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const { 
    posts, 
    isLoading, 
    getFeed, 
    getDiscoveryFeed, 
    getRecommendedPosts,
    getUserEngagementsForPost 
  } = useContentStore();

  const loadPosts = useCallback(async (pageNum: number = 1, refresh: boolean = false) => {
    try {
      let newPosts;
      const pagination = { page: pageNum, limit: 20 };

      switch (activeTab) {
        case 'discover':
          newPosts = await getDiscoveryFeed(pagination, filters);
          break;
        case 'recommended':
          newPosts = await getRecommendedPosts(pagination);
          break;
        default:
          newPosts = await getFeed(pagination);
      }

      if (newPosts.length < 20) {
        setHasMore(false);
      }

      return newPosts;
    } catch (error) {
      console.error('Failed to load posts:', error);
      return [];
    }
  }, [activeTab, filters, getFeed, getDiscoveryFeed, getRecommendedPosts]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    
    const nextPage = page + 1;
    await loadPosts(nextPage);
    setPage(nextPage);
  }, [page, hasMore, isLoading, loadPosts]);

  const refresh = async () => {
    setIsRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadPosts(1, true);
    setIsRefreshing(false);
  };

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setPage(1);
    setHasMore(true);
  };

  // Infinite scroll hook
  const { targetRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore,
    isLoading,
  });

  // Load initial posts
  useEffect(() => {
    loadPosts(1, true);
  }, [activeTab]);

  const renderPosts = () => {
    if (isLoading && posts.length === 0) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-lg border p-6 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (posts.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No posts found</p>
          <p className="text-gray-400 text-sm mt-2">
            {activeTab === 'feed' 
              ? 'Follow some users to see their posts in your feed'
              : 'Try adjusting your filters or check back later'
            }
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onEngagement={() => {
              // Refresh engagement data for this post
              getUserEngagementsForPost(post.id);
            }}
          />
        ))}
        
        {/* Infinite scroll trigger */}
        <div ref={targetRef} className="h-10 flex items-center justify-center">
          {isLoading && hasMore && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          )}
        </div>

        {!hasMore && posts.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            You've reached the end of the feed
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="feed">Following</TabsTrigger>
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="recommended">Recommended</TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {activeTab === 'discover' && (
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-1" />
                  Filters
                </Button>
              )}
            </div>
          </div>

          <TabsContent value="feed" className="mt-6">
            {renderPosts()}
          </TabsContent>

          <TabsContent value="discover" className="mt-6">
            {renderPosts()}
          </TabsContent>

          <TabsContent value="recommended" className="mt-6">
            {renderPosts()}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};