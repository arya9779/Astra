'use client';

import { useEffect, useState } from 'react';
import { useKarmaStore, KarmaTransaction } from '@/store/karmaStore';
import { api } from '@/lib/api';

const REASON_LABELS: Record<string, string> = {
  CONTENT_VALIDATION: 'Content Validation',
  ORIGINAL_CONTENT: 'Original Content',
  POSITIVE_ENGAGEMENT: 'Positive Engagement',
  MODERATION_HELP: 'Moderation Help',
  TRUTH_CAMPAIGN: 'Truth Campaign',
  MISINFORMATION: 'Misinformation',
  FAKE_ENGAGEMENT: 'Fake Engagement',
  DECEPTION: 'Deception',
};

export default function KarmaHistory() {
  const { transactions, setTransactions, isLoading, setLoading } = useKarmaStore();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchKarmaHistory();
  }, [page]);

  const fetchKarmaHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/karma/history/me?page=${page}&limit=10`);
      
      if (page === 1) {
        setTransactions(response.data.transactions);
      } else {
        setTransactions([...transactions, ...response.data.transactions]);
      }
      
      setHasMore(response.data.transactions.length === 10);
    } catch (error) {
      console.error('Failed to fetch karma history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Karma History</h3>
        <p className="text-sm text-gray-600 mt-1">Track your karma earnings and deductions</p>
      </div>

      <div className="divide-y divide-gray-200">
        {transactions.length === 0 && !isLoading ? (
          <div className="p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto text-gray-400 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-600">No karma transactions yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Start contributing to earn your first karma!
            </p>
          </div>
        ) : (
          <>
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'AWARD'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {transaction.type === 'AWARD' ? '+' : '-'}
                        {transaction.amount}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {REASON_LABELS[transaction.reason] || transaction.reason}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Balance: {transaction.balanceAfter.toLocaleString()} karma
                    </p>
                    {transaction.blockchainTxHash && (
                      <div className="flex items-center gap-1 mt-1">
                        <svg
                          className="w-3 h-3 text-blue-500"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="text-xs text-blue-600">Verified on blockchain</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                    {formatDate(transaction.createdAt)}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="p-4">
                <div className="h-16 bg-gray-100 rounded animate-pulse" />
              </div>
            )}

            {hasMore && !isLoading && (
              <div className="p-4">
                <button
                  onClick={() => setPage(page + 1)}
                  className="w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
