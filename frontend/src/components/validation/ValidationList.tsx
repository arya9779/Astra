'use client';

import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  ShieldCheck, 
  ShieldX, 
  HelpCircle,
  ExternalLink,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useValidationStore, ValidationResponse } from '@/store/validationStore';

interface ValidationListProps {
  postId: string;
  className?: string;
}

export const ValidationList: React.FC<ValidationListProps> = ({
  postId,
  className = '',
}) => {
  const { 
    validations, 
    stats, 
    consensus, 
    isLoading, 
    error, 
    getValidations 
  } = useValidationStore();

  useEffect(() => {
    getValidations(postId);
  }, [postId, getValidations]);

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'AUTHENTIC':
        return <ShieldCheck className="w-4 h-4 text-green-600" />;
      case 'FAKE':
        return <ShieldX className="w-4 h-4 text-red-600" />;
      case 'UNCERTAIN':
        return <HelpCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'AUTHENTIC':
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Authentic
          </Badge>
        );
      case 'FAKE':
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Fake
          </Badge>
        );
      case 'UNCERTAIN':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Uncertain
          </Badge>
        );
      default:
        return null;
    }
  };

  const getLeagueBadge = (league: string) => {
    const colors = {
      CHANDRIKA: 'bg-gray-100 text-gray-800',
      VAJRA: 'bg-blue-100 text-blue-800',
      AGNEYASTRA: 'bg-orange-100 text-orange-800',
      VARUNASTRA: 'bg-cyan-100 text-cyan-800',
      PASHUPATASTRA: 'bg-purple-100 text-purple-800',
      BRAHMASTRA: 'bg-yellow-100 text-yellow-800',
    };

    return (
      <Badge className={colors[league as keyof typeof colors] || colors.CHANDRIKA}>
        {league}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading validations...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load validations: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Content Validations</span>
          {stats && (
            <Badge variant="outline">
              {stats.totalValidations} validation{stats.totalValidations !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        
        {/* Consensus Summary */}
        {consensus && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Consensus Status:</span>
              <Badge 
                variant={consensus.reached ? 'default' : 'secondary'}
                className={consensus.reached ? 'bg-green-100 text-green-800' : ''}
              >
                {consensus.reached ? 'Reached' : 'Pending'}
              </Badge>
              {consensus.reached && (
                <span className="text-sm text-gray-600">
                  ({Math.round(consensus.consensusPercentage)}% agreement)
                </span>
              )}
            </div>
            
            {stats && (
              <div className="flex gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-green-600" />
                  {stats.authenticCount} Authentic
                </span>
                <span className="flex items-center gap-1">
                  <ShieldX className="w-3 h-3 text-red-600" />
                  {stats.fakeCount} Fake
                </span>
                <span className="flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-yellow-600" />
                  {stats.uncertainCount} Uncertain
                </span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {validations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No validations yet</p>
            <p className="text-sm">Be the first to validate this content</p>
          </div>
        ) : (
          <div className="space-y-3">
            {validations.map((validation) => (
              <div
                key={validation.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Avatar className="w-8 h-8">
                  <AvatarFallback>
                    {validation.validator.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        @{validation.validator.username}
                      </span>
                      {getLeagueBadge(validation.validator.league)}
                      <span className="text-xs text-gray-500">
                        {validation.validator.karma} Karma
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getVerdictIcon(validation.verdict)}
                      {getVerdictBadge(validation.verdict)}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Confidence: {Math.round(validation.confidence * 100)}%
                    </span>
                    <span>
                      {formatDistanceToNow(new Date(validation.createdAt))} ago
                    </span>
                  </div>
                  
                  {validation.notes && (
                    <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                      {validation.notes}
                    </p>
                  )}
                  
                  {validation.blockchainTxHash && (
                    <div className="flex items-center gap-1 text-xs text-blue-600">
                      <ExternalLink className="w-3 h-3" />
                      <span>Recorded on blockchain</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};