'use client';

import { useEffect } from 'react';
import { useKarmaStore } from '@/store/karmaStore';
import { api } from '@/lib/api';

export default function KarmaBalance() {
  const { balance, isLoading, setBalance, setLoading } = useKarmaStore();

  useEffect(() => {
    fetchKarmaBalance();
  }, []);

  const fetchKarmaBalance = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me/karma');
      setBalance(response.data);
    } catch (error) {
      console.error('Failed to fetch karma balance:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">Your Karma</p>
          {isLoading ? (
            <div className="h-10 w-24 bg-white/20 rounded animate-pulse mt-2" />
          ) : (
            <h2 className="text-4xl font-bold mt-1">{balance.toLocaleString()}</h2>
          )}
        </div>
        <div className="bg-white/20 rounded-full p-4">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
      </div>
      <p className="text-xs mt-4 opacity-75">
        Earn karma through authentic contributions and truth validation
      </p>
    </div>
  );
}
