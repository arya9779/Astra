'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ShieldCheck, 
  ShieldX, 
  AlertTriangle,
  Clock,
  Users
} from 'lucide-react';
import { ConsensusResult } from '@/store/validationStore';

interface ValidationBadgeProps {
  validationStatus: 'PENDING' | 'VERIFIED' | 'FLAGGED' | 'REJECTED';
  validationCount: number;
  consensus?: ConsensusResult;
  showDetails?: boolean;
  className?: string;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  validationStatus,
  validationCount,
  consensus,
  showDetails = false,
  className = '',
}) => {
  const getBadgeContent = () => {
    switch (validationStatus) {
      case 'VERIFIED':
        return {
          icon: <ShieldCheck className="w-3 h-3" />,
          label: 'Verified',
          variant: 'default' as const,
          className: 'bg-green-100 text-green-800 border-green-200',
        };
      case 'FLAGGED':
        return {
          icon: <ShieldX className="w-3 h-3" />,
          label: 'Flagged',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
        };
      case 'REJECTED':
        return {
          icon: <AlertTriangle className="w-3 h-3" />,
          label: 'Rejected',
          variant: 'destructive' as const,
          className: 'bg-red-100 text-red-800 border-red-200',
        };
      default:
        return {
          icon: validationCount > 0 ? <Clock className="w-3 h-3" /> : <Shield className="w-3 h-3" />,
          label: validationCount > 0 ? 'Under Review' : 'Pending',
          variant: 'secondary' as const,
          className: 'bg-gray-100 text-gray-800 border-gray-200',
        };
    }
  };

  const badgeContent = getBadgeContent();

  if (!showDetails) {
    return (
      <Badge 
        variant={badgeContent.variant} 
        className={`${badgeContent.className} ${className}`}
      >
        {badgeContent.icon}
        <span className="ml-1">{badgeContent.label}</span>
      </Badge>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <Badge 
        variant={badgeContent.variant} 
        className={badgeContent.className}
      >
        {badgeContent.icon}
        <span className="ml-1">{badgeContent.label}</span>
      </Badge>
      
      {validationCount > 0 && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Users className="w-3 h-3" />
          <span>{validationCount} validator{validationCount !== 1 ? 's' : ''}</span>
        </div>
      )}
      
      {consensus && consensus.reached && (
        <div className="text-xs text-gray-600">
          <div>Consensus: {Math.round(consensus.consensusPercentage)}%</div>
          {consensus.verdictCounts && (
            <div className="flex gap-2 mt-1">
              {consensus.verdictCounts.authentic > 0 && (
                <span className="text-green-600">✓{consensus.verdictCounts.authentic}</span>
              )}
              {consensus.verdictCounts.fake > 0 && (
                <span className="text-red-600">✗{consensus.verdictCounts.fake}</span>
              )}
              {consensus.verdictCounts.uncertain > 0 && (
                <span className="text-yellow-600">?{consensus.verdictCounts.uncertain}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};