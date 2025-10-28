'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ImageIcon, VideoIcon, MicIcon, FileIcon, X } from 'lucide-react';
import { useContentStore } from '@/store/contentStore';

interface PostComposerProps {
  onPostCreated?: () => void;
}

export const PostComposer: React.FC<PostComposerProps> = ({ onPostCreated }) => {
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO'>('TEXT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { createPost } = useContentStore();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setMediaFiles(prev => [...prev, ...files]);
    
    // Auto-detect media type based on first file
    if (files.length > 0) {
      const firstFile = files[0];
      if (firstFile.type.startsWith('image/')) {
        setMediaType('IMAGE');
      } else if (firstFile.type.startsWith('video/')) {
        setMediaType('VIDEO');
      } else if (firstFile.type.startsWith('audio/')) {
        setMediaType('AUDIO');
      }
    }
  };

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    if (mediaFiles.length === 1) {
      setMediaType('TEXT');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() && mediaFiles.length === 0) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createPost({
        content: content.trim(),
        mediaType,
        files: mediaFiles,
      });
      
      // Reset form
      setContent('');
      setMediaFiles([]);
      setMediaType('TEXT');
      
      onPostCreated?.();
    } catch (error) {
      console.error('Failed to create post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <VideoIcon className="w-4 h-4" />;
    if (file.type.startsWith('audio/')) return <MicIcon className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create Post</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind? Share your thoughts, insights, or discoveries..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] resize-none"
            maxLength={5000}
          />
          
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>{content.length}/5000 characters</span>
            <Badge variant={mediaType === 'TEXT' ? 'secondary' : 'default'}>
              {mediaType}
            </Badge>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Input
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="flex items-center gap-2 p-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <ImageIcon className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                Add images, videos, or audio files
              </span>
            </label>

            {/* Selected Files */}
            {mediaFiles.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Selected Files:</h4>
                <div className="space-y-1">
                  {mediaFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        {getFileIcon(file)}
                        <span className="text-sm truncate max-w-[200px]">
                          {file.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({(file.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setContent('');
                setMediaFiles([]);
                setMediaType('TEXT');
              }}
              disabled={isSubmitting}
            >
              Clear
            </Button>
            <Button
              type="submit"
              disabled={(!content.trim() && mediaFiles.length === 0) || isSubmitting}
            >
              {isSubmitting ? 'Posting...' : 'Post'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};