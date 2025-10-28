'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Shield, Send, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

interface AnonymousPostData {
  id: string;
  content: string;
  anonymousId: string;
  createdAt: string;
}

interface AnonymousPostProps {
  boardId: string;
  boardName: string;
}

export function AnonymousPost({ boardId, boardName }: AnonymousPostProps) {
  const [posts, setPosts] = useState<AnonymousPostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [secret, setSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
  }, [boardId]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/social/boards/${boardId}/anonymous-posts`);
      setPosts(response.data);
    } catch (error: any) {
      if (error.response?.status !== 403) {
        console.error('Failed to load anonymous posts:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitPost = async () => {
    if (!postContent.trim() || !secret.trim()) {
      toast({
        title: 'Error',
        description: 'Both content and secret are required',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post(`/social/boards/${boardId}/anonymous-post`, {
        content: postContent,
        secret: secret,
      });
      
      setPosts(prev => [response.data, ...prev]);
      setPostContent('');
      setSecret('');
      setPostDialogOpen(false);
      
      toast({
        title: 'Post submitted',
        description: 'Your anonymous post has been submitted successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to submit post',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const generateSecret = () => {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const secret = Array.from(randomBytes, byte => byte.toString(16).padStart(2, '0')).join('');
    setSecret(secret);
  };

  if (loading) {
    return <div className="text-center py-8">Loading anonymous posts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold flex items-center space-x-2">
            <Shield className="h-5 w-5 text-red-600" />
            <span>Anonymous Posts - {boardName}</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Posts are anonymous and verified through zero-knowledge proofs
          </p>
        </div>
        
        <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Shield className="h-4 w-4 mr-2" />
              Post Anonymously
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submit Anonymous Post</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-yellow-800">Privacy Notice</p>
                    <p className="text-yellow-700">
                      Your identity will be protected through zero-knowledge proofs. 
                      Only your League status will be verified without revealing who you are.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="content">Your Message</Label>
                <Textarea
                  id="content"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Share your information anonymously..."
                  rows={6}
                />
              </div>
              
              <div>
                <Label htmlFor="secret">Secret Key</Label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Input
                      id="secret"
                      type={showSecret ? 'text' : 'password'}
                      value={secret}
                      onChange={(e) => setSecret(e.target.value)}
                      placeholder="Enter a secret key for your post"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button type="button" variant="outline" onClick={generateSecret}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This secret prevents duplicate posts and maintains anonymity
                </p>
              </div>
              
              <Button 
                onClick={submitPost} 
                disabled={submitting || !postContent.trim() || !secret.trim()}
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Anonymous Post'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {posts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No anonymous posts yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share information anonymously on this board.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary" className="bg-red-100 text-red-800">
                      {post.anonymousId}
                    </Badge>
                    <Badge variant="outline">
                      <Shield className="h-3 w-3 mr-1" />
                      Verified Anonymous
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="whitespace-pre-wrap">{post.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}