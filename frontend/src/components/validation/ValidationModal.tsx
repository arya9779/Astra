'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  HelpCircle,
  AlertTriangle 
} from 'lucide-react';
import { useValidationStore, SubmitValidationData } from '@/store/validationStore';
import { useAuthStore } from '@/store/authStore';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: {
    id: string;
    content: string;
    author: {
      username: string;
      league: string;
    };
    validationStatus: string;
  };
  onValidationSubmitted?: () => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  post,
  onValidationSubmitted,
}) => {
  const [verdict, setVerdict] = useState<'AUTHENTIC' | 'FAKE' | 'UNCERTAIN' | null>(null);
  const [confidence, setConfidence] = useState([0.7]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { submitValidation, error } = useValidationStore();
  const { user } = useAuthStore();

  const handleSubmit = async () => {
    if (!verdict) return;

    setIsSubmitting(true);
    try {
      const validationData: SubmitValidationData = {
        postId: post.id,
        verdict,
        confidence: confidence[0],
        notes: notes.trim() || undefined,
      };

      await submitValidation(validationData);
      onValidationSubmitted?.();
      onClose();
      
      // Reset form
      setVerdict(null);
      setConfidence([0.7]);
      setNotes('');
    } catch (error) {
      console.error('Failed to submit validation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getVerdictIcon = (verdictType: string) => {
    switch (verdictType) {
      case 'AUTHENTIC':
        return <ShieldCheck className="w-5 h-5" />;
      case 'FAKE':
        return <ShieldX className="w-5 h-5" />;
      case 'UNCERTAIN':
        return <HelpCircle className="w-5 h-5" />;
      default:
        return <Shield className="w-5 h-5" />;
    }
  };

  const getVerdictColor = (verdictType: string) => {
    switch (verdictType) {
      case 'AUTHENTIC':
        return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200';
      case 'FAKE':
        return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200';
      case 'UNCERTAIN':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200';
    }
  };

  const verdictOptions = [
    {
      value: 'AUTHENTIC' as const,
      label: 'Authentic',
      description: 'This content appears to be genuine and truthful',
    },
    {
      value: 'FAKE' as const,
      label: 'Fake/Misleading',
      description: 'This content contains misinformation or is manipulated',
    },
    {
      value: 'UNCERTAIN' as const,
      label: 'Uncertain',
      description: 'Unable to determine authenticity with confidence',
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Validate Content
          </DialogTitle>
          <DialogDescription>
            Help maintain platform integrity by validating this content. Your assessment will contribute to the consensus mechanism.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Post Preview */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">@{post.author.username}</span>
              <Badge variant="secondary">{post.author.league}</Badge>
            </div>
            <p className="text-sm text-gray-700 line-clamp-3">{post.content}</p>
          </div>

          {/* Verdict Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Your Assessment</Label>
            <div className="grid gap-3">
              {verdictOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setVerdict(option.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    verdict === option.value
                      ? getVerdictColor(option.value)
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getVerdictIcon(option.value)}
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-sm text-gray-600">{option.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Confidence Level */}
          {verdict && (
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Confidence Level: {Math.round(confidence[0] * 100)}%
              </Label>
              <Slider
                value={confidence}
                onValueChange={setConfidence}
                max={1}
                min={0.1}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>Low Confidence</span>
                <span>High Confidence</span>
              </div>
            </div>
          )}

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-base font-medium">
              Additional Notes (Optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Provide additional context or reasoning for your assessment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Validation Requirements */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">Validation Guidelines</p>
                <ul className="text-blue-800 space-y-1">
                  <li>• Consider the source credibility and evidence provided</li>
                  <li>• Look for signs of manipulation or deepfakes in media</li>
                  <li>• Your validation will be recorded on the blockchain</li>
                  <li>• You'll earn Karma for participating in consensus</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!verdict || isSubmitting}
            className="min-w-[120px]"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Validation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};