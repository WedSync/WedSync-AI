'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export interface ArticleRatingProps {
  articleId: string;
  currentRating?: number;
  onRatingSubmit?: (
    articleId: string,
    rating: number,
    feedback: string,
  ) => void;
  showFeedbackForm?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ArticleRating({
  articleId,
  currentRating = 0,
  onRatingSubmit,
  showFeedbackForm = true,
  disabled = false,
  className = '',
}: ArticleRatingProps) {
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const handleRatingClick = useCallback(
    (rating: number) => {
      if (disabled || hasSubmitted) return;
      setSelectedRating(rating);
    },
    [disabled, hasSubmitted],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!selectedRating || isSubmitting || hasSubmitted) return;

      setIsSubmitting(true);
      try {
        await onRatingSubmit?.(articleId, selectedRating, feedback);
        setHasSubmitted(true);
      } catch (error) {
        console.error('Rating submission failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      articleId,
      selectedRating,
      feedback,
      onRatingSubmit,
      isSubmitting,
      hasSubmitted,
    ],
  );

  if (hasSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`text-center py-4 ${className}`}
      >
        <p className="text-sm text-green-600 font-medium">
          Thank you for your feedback!
        </p>
        <div className="flex items-center justify-center mt-2">
          {[...Array(5)].map((_, index) => (
            <StarIconSolid
              key={index}
              className={`w-5 h-5 ${
                index < selectedRating ? 'text-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`${className}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">
            Rate this article
          </h3>
          <div className="flex items-center space-x-1">
            {[...Array(5)].map((_, index) => {
              const starNumber = index + 1;
              const isActive = starNumber <= (hoveredRating || selectedRating);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => handleRatingClick(starNumber)}
                  onMouseEnter={() => setHoveredRating(starNumber)}
                  onMouseLeave={() => setHoveredRating(0)}
                  disabled={disabled || hasSubmitted}
                  className={`p-1 transition-colors duration-150 ${
                    disabled
                      ? 'cursor-not-allowed'
                      : 'cursor-pointer hover:scale-110'
                  }`}
                  aria-label={`Rate ${starNumber} star${starNumber > 1 ? 's' : ''}`}
                >
                  {isActive ? (
                    <StarIconSolid className="w-6 h-6 text-yellow-400" />
                  ) : (
                    <StarIcon className="w-6 h-6 text-gray-300 hover:text-yellow-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {selectedRating > 0 && showFeedbackForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-3">
                <label
                  htmlFor={`feedback-${articleId}`}
                  className="block text-sm font-medium text-gray-700"
                >
                  Additional feedback (optional)
                </label>
                <textarea
                  id={`feedback-${articleId}`}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  placeholder="Tell us what you liked or how we could improve this article..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {feedback.length}/500 characters
                  </span>
                  <button
                    type="submit"
                    disabled={!selectedRating || isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Rating'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </div>
  );
}
