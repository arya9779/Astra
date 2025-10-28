'use client';

import { useEffect } from 'react';
import { useKarmaStore } from '@/store/karmaStore';
import { api } from '@/lib/api';

const ASTRA_INFO: Record<string, { name: string; description: string; icon: string }> = {
  CONTENT_VALIDATION: {
    name: 'Content Validation',
    description: 'Validate content authenticity and flag misinformation',
    icon: '✓',
  },
  DOWNVOTE_FAKE: {
    name: 'Downvote Fake Posts',
    description: 'Downvote and report fake or misleading content',
    icon: '↓',
  },
  FAKE_MEDIA_DETECTION: {
    name: 'Fake Media Detection',
    description: 'Detect and flag manipulated images and deepfakes',
    icon: '🔍',
  },
  LIVE_STREAMING: {
    name: 'Live Streaming',
    description: 'Host live streams and events for your audience',
    icon: '📹',
  },
  ENCRYPTED_BOARDS: {
    name: 'Encrypted Boards',
    description: 'Create and access encrypted community boards',
    icon: '🔒',
  },
  PROFESSIONAL_COLLABORATION: {
    name: 'Professional Collaboration',
    description: 'Access professional boards with video conferencing',
    icon: '💼',
  },
  TRUTH_COUNCIL_VOTING: {
    name: 'Truth Council Voting',
    description: 'Vote on platform governance proposals',
    icon: '🗳️',
  },
  MODERATOR_PRIVILEGES: {
    name: 'Moderator Privileges',
    description: 'Access moderation tools and review flagged content',
    icon: '⚖️',
  },
  ASTRAL_NEXUS_DAO: {
    name: 'Astral Nexus DAO',
    description: 'Access the founder\'s DAO and submit proposals',
    icon: '✨',
  },
  ALL_ASTRA_POWERS: {
    name: 'All Astra Powers',
    description: 'Full access to all platform features and capabilities',
    icon: '👑',
  },
};

export default function AstraShowcase() {
  const { unlockedAstras, isLoading, setUnlockedAstras, setLoading } = useKarmaStore();

  useEffect(() => {
    fetchUnlockedAstras();
  }, []);

  const fetchUnlockedAstras = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me/astras');
      setUnlockedAstras(response.data);
    } catch (error) {
      console.error('Failed to fetch unlocked astras:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Unlocked Astras</h3>
        <p className="text-sm text-gray-600 mt-1">
          Your special powers and abilities ({unlockedAstras.length} unlocked)
        </p>
      </div>

      {unlockedAstras.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🔒</div>
          <p className="text-gray-600">No Astras unlocked yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Earn karma and progress through leagues to unlock powerful abilities
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {unlockedAstras.map((astraType) => {
            const astra = ASTRA_INFO[astraType] || {
              name: astraType,
              description: 'Special ability',
              icon: '⭐',
            };

            return (
              <div
                key={astraType}
                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl">
                    {astra.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {astra.name}
                    </h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {astra.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Progress through leagues to unlock more Astras and gain new abilities
        </p>
      </div>
    </div>
  );
}
