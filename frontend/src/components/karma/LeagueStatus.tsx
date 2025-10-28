'use client';

import { useEffect } from 'react';
import { useKarmaStore } from '@/store/karmaStore';
import { api } from '@/lib/api';

const LEAGUE_COLORS = {
  CHANDRIKA: 'from-gray-400 to-gray-600',
  VAJRA: 'from-blue-400 to-blue-600',
  AGNEYASTRA: 'from-orange-400 to-red-600',
  VARUNASTRA: 'from-cyan-400 to-blue-600',
  PASHUPATASTRA: 'from-purple-400 to-purple-600',
  BRAHMASTRA: 'from-yellow-400 to-yellow-600',
};

const LEAGUE_ICONS = {
  CHANDRIKA: '🌙',
  VAJRA: '⚡',
  AGNEYASTRA: '🔥',
  VARUNASTRA: '🌊',
  PASHUPATASTRA: '🏹',
  BRAHMASTRA: '✨',
};

export default function LeagueStatus() {
  const { leagueInfo, isLoading, setLeagueInfo, setLoading } = useKarmaStore();

  useEffect(() => {
    fetchLeagueStatus();
  }, []);

  const fetchLeagueStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me/league');
      setLeagueInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch league status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !leagueInfo) {
    return (
      <div className="bg-white rounded-lg p-6 shadow-md">
        <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4" />
        <div className="h-4 w-full bg-gray-200 rounded animate-pulse" />
      </div>
    );
  }

  const gradientClass = LEAGUE_COLORS[leagueInfo.current as keyof typeof LEAGUE_COLORS] || LEAGUE_COLORS.CHANDRIKA;
  const icon = LEAGUE_ICONS[leagueInfo.current as keyof typeof LEAGUE_ICONS] || '🌙';

  return (
    <div className="bg-white rounded-lg p-6 shadow-md">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-600 font-medium">Current League</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl">{icon}</span>
            <h3 className="text-2xl font-bold text-gray-900">{leagueInfo.current}</h3>
          </div>
        </div>
        {leagueInfo.nextLeague && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Next League</p>
            <p className="text-sm font-semibold text-gray-700">{leagueInfo.nextLeague}</p>
          </div>
        )}
      </div>

      {leagueInfo.nextLeague && leagueInfo.karmaRequired && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress to {leagueInfo.nextLeague}</span>
            <span className="font-semibold text-gray-900">
              {Math.round(leagueInfo.karmaProgress)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${gradientClass} transition-all duration-500 rounded-full`}
              style={{ width: `${Math.min(leagueInfo.karmaProgress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 text-right">
            {leagueInfo.karmaRequired} Karma required
          </p>
        </div>
      )}

      {leagueInfo.unlockedPowers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Unlocked Powers</p>
          <div className="space-y-1">
            {leagueInfo.unlockedPowers.map((power, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{power}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
