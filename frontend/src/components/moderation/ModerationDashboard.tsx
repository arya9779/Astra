'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';

interface ModerationQueueItem {
  id: string;
  postId: string;
  post: {
    id: string;
    content: string;
    mediaUrls: string[];
    mediaType: string;
    author: {
      id: string;
      username: string;
      karma: number;
      league: string;
    };
    createdAt: string;
  };
  reason: string;
  aiFlags: string[];
  confidence: number;
  status: string;
  createdAt: string;
}

interface ModerationStats {
  totalReviewed: number;
  approved: number;
  rejected: number;
  karmaEarned: number;
}

export default function ModerationDashboard() {
  const { user, token } = useAuthStore();
  const [queueItems, setQueueItems] = useState<ModerationQueueItem[]>([]);
  const [stats, setStats] = useState<ModerationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Check if user has moderation privileges
  const canModerate = user?.league && ['VAJRA', 'AGNEYASTRA', 'VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'].includes(user.league);

  useEffect(() => {
    if (canModerate) {
      fetchModerationQueue();
      fetchModerationStats();
    }
  }, [canModerate, currentPage]);

  const fetchModerationQueue = async () => {
    try {
      const response = await fetch(`/api/moderation/queue?page=${currentPage}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch moderation queue');
      }

      const data = await response.json();
      setQueueItems(data.items);
      setTotalItems(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load moderation queue');
    } finally {
      setLoading(false);
    }
  };

  const fetchModerationStats = async () => {
    try {
      const response = await fetch('/api/moderation/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch moderation stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch moderation stats:', err);
    }
  };

  const handleReview = async (moderationId: string, action: 'APPROVE' | 'REJECT') => {
    setReviewingId(moderationId);
    try {
      const response = await fetch('/api/moderation/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          moderationId,
          action,
          notes: reviewNotes,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      // Remove the reviewed item from the queue
      setQueueItems(items => items.filter(item => item.id !== moderationId));
      setReviewNotes('');
      
      // Refresh stats
      fetchModerationStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setReviewingId(null);
    }
  };

  const getLeagueBadgeColor = (league: string) => {
    const colors = {
      CHANDRIKA: 'bg-gray-100 text-gray-800',
      VAJRA: 'bg-blue-100 text-blue-800',
      AGNEYASTRA: 'bg-red-100 text-red-800',
      VARUNASTRA: 'bg-green-100 text-green-800',
      PASHUPATASTRA: 'bg-purple-100 text-purple-800',
      BRAHMASTRA: 'bg-yellow-100 text-yellow-800',
    };
    return colors[league as keyof typeof colors] || colors.CHANDRIKA;
  };

  const getFlagBadgeColor = (flag: string) => {
    const colors = {
      inappropriate_content: 'bg-red-100 text-red-800',
      misinformation: 'bg-orange-100 text-orange-800',
      deepfake: 'bg-purple-100 text-purple-800',
      moderation_error: 'bg-gray-100 text-gray-800',
    };
    return colors[flag as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  if (!canModerate) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You need Vajra League or higher to access the moderation dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading moderation dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Moderation Dashboard</h1>
        <p className="text-gray-600">Review flagged content and help maintain platform quality</p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Reviewed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalReviewed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Karma Earned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.karmaEarned}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Moderation Queue */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold">Pending Reviews ({totalItems})</h2>
        
        {queueItems.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-gray-600">No content pending moderation review.</p>
            </CardContent>
          </Card>
        ) : (
          queueItems.map((item) => (
            <Card key={item.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getLeagueBadgeColor(item.post.author.league)}>
                        {item.post.author.league}
                      </Badge>
                      <span className="font-medium">@{item.post.author.username}</span>
                      <span className="text-sm text-gray-500">
                        {item.post.author.karma} Karma
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.aiFlags.map((flag) => (
                        <Badge key={flag} variant="outline" className={getFlagBadgeColor(flag)}>
                          {flag.replace('_', ' ')}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-sm text-gray-600">
                      AI Confidence: {Math.round(item.confidence * 100)}%
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>Flagged {new Date(item.createdAt).toLocaleDateString()}</p>
                    <p>Posted {new Date(item.post.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Flagged Content:</h4>
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm">{item.post.content}</p>
                    {item.post.mediaUrls.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">
                          Media ({item.post.mediaType}):
                        </p>
                        {item.post.mediaUrls.map((url, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <Eye className="h-4 w-4" />
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Media {index + 1}
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">AI Reasoning:</h4>
                  <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-md">
                    {item.reason}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Review Notes (Optional):
                  </label>
                  <Textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add any notes about your decision..."
                    className="mb-4"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    onClick={() => handleReview(item.id, 'APPROVE')}
                    disabled={reviewingId === item.id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {reviewingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Approve Content
                  </Button>
                  <Button
                    onClick={() => handleReview(item.id, 'REJECT')}
                    disabled={reviewingId === item.id}
                    variant="destructive"
                  >
                    {reviewingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-2" />
                    )}
                    Reject Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Pagination */}
        {totalItems > 10 && (
          <div className="flex justify-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4">
              Page {currentPage} of {Math.ceil(totalItems / 10)}
            </span>
            <Button
              variant="outline"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(totalItems / 10)}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}