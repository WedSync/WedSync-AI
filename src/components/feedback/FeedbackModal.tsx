'use client';

/**
 * Feedback Modal Component
 * Feature: WS-236 User Feedback System
 * Modal wrapper for the feedback form with trigger button
 */

import { useState, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FeedbackForm } from './FeedbackForm';
import { useFeedbackCategories } from '@/hooks/useFeedbackCategories';

interface FeedbackModalProps {
  trigger?: React.ReactNode;
  initialData?: {
    feedback_type?: string;
    category?: string;
    subject?: string;
    description?: string;
    page_url?: string;
  };
  autoOpen?: boolean;
  onSubmit?: (data: any) => Promise<void>;
}

export function FeedbackModal({
  trigger,
  initialData,
  autoOpen = false,
  onSubmit,
}: FeedbackModalProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const { data: categories = [] } = useFeedbackCategories();

  useEffect(() => {
    if (autoOpen) {
      setIsOpen(true);
    }
  }, [autoOpen]);

  const handleSubmit = async (data: any) => {
    if (onSubmit) {
      await onSubmit(data);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <MessageSquare className="h-4 w-4" />
      Give Feedback
    </Button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {!autoOpen && (
        <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      )}

      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Share Your Feedback</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 pt-2">
          <FeedbackForm
            initialData={initialData}
            categories={categories}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Feedback Widget - Floating feedback button
 */
interface FeedbackWidgetProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  className?: string;
}

export function FeedbackWidget({
  position = 'bottom-right',
  className = '',
}: FeedbackWidgetProps) {
  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  return (
    <div className={`fixed z-50 ${positionClasses[position]} ${className}`}>
      <FeedbackModal
        trigger={
          <Button
            size="lg"
            className="rounded-full shadow-lg hover:shadow-xl transition-all duration-200 gap-2"
          >
            <MessageSquare className="h-5 w-5" />
            <span className="hidden sm:inline">Feedback</span>
          </Button>
        }
      />
    </div>
  );
}

/**
 * Quick Feedback Button - For specific contexts
 */
interface QuickFeedbackProps {
  feedbackType?: string;
  category?: string;
  subject?: string;
  pageContext?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  className?: string;
  children?: React.ReactNode;
}

export function QuickFeedback({
  feedbackType = 'general_feedback',
  category,
  subject,
  pageContext,
  variant = 'outline',
  size = 'sm',
  className = '',
  children,
}: QuickFeedbackProps) {
  const initialData = {
    feedback_type: feedbackType,
    category,
    subject,
    page_url: typeof window !== 'undefined' ? window.location.href : undefined,
  };

  return (
    <FeedbackModal
      initialData={initialData}
      trigger={
        <Button variant={variant} size={size} className={`gap-2 ${className}`}>
          <MessageSquare className="h-4 w-4" />
          {children || 'Report Issue'}
        </Button>
      }
    />
  );
}
