'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck } from 'lucide-react';
import { ValidationModal } from './ValidationModal';
import { useAuthStore } from '@/store/authStore';

interface ValidationButtonProps {
  post: {
    id: string;
    content: string;
    authorId: string;
    author: {
      username: string;
      league: string;
    };
    validationStatus: string;
  };
  onValidationSubmitted?: () => void;
  className?: string;
}

export const ValidationButton: React.FC<ValidationButtonProps> = ({
  post,
  onValidationSubmitted,
  className = '',
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuthStore();

  // Check if user can validate (Vajra+ league and not own post)
  const canValidate = user && 
    user.userId !== post.authorId &&
    ['VAJRA', 'AGNEYASTRA', 'VARUNASTRA', 'PASHUPATASTRA', 'BRAHMASTRA'].includes(user.league);

  // Don't show button if user can't validate
  if (!canValidate) {
    return null;
  }

  // Don't show button if already verified or rejected
  if (['VERIFIED', 'REJECTED'].includes(post.validationStatus)) {
    return null;
  }

  const handleClick = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleValidationSubmitted = () => {
    onValidationSubmitted?.();
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        className={`${className}`}
      >
        <Shield className="w-4 h-4 mr-1" />
        Validate
      </Button>

      <ValidationModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        post={post}
        onValidationSubmitted={handleValidationSubmitted}
      />
    </>
  );
};