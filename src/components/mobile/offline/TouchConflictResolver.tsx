'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Clock,
  User,
  ChevronRight,
  Check,
  X,
  RotateCcw,
} from 'lucide-react';
import type { TouchConflictResolverProps, ConflictData } from './types';

export const TouchConflictResolver: React.FC<TouchConflictResolverProps> = ({
  conflicts,
  onResolveConflict,
  weddingId,
  className = '',
}) => {
  const [selectedConflict, setSelectedConflict] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);

  // Swipe handling for conflict resolution
  const handleSwipe = useCallback(
    async (conflictId: string, direction: 'left' | 'right' | 'up') => {
      if (resolving) return;

      // Haptic feedback
      if ('navigator' in window && 'vibrate' in navigator) {
        navigator.vibrate(direction === 'left' ? 100 : 50);
      }

      setResolving(conflictId);

      try {
        let resolution: 'local' | 'server' | 'merge';

        switch (direction) {
          case 'left':
            resolution = 'server'; // Accept server version
            break;
          case 'right':
            resolution = 'local'; // Keep local version
            break;
          case 'up':
            resolution = 'merge'; // Attempt to merge
            break;
          default:
            return;
        }

        await onResolveConflict(conflictId, resolution);
      } finally {
        setResolving(null);
      }
    },
    [onResolveConflict, resolving],
  );

  if (conflicts.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Conflicts</h3>
        <p className="text-gray-500">All data is synchronized successfully!</p>
      </div>
    );
  }

  const sortedConflicts = [...conflicts].sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Swipe to Resolve</h3>
        <div className="space-y-1 text-sm text-blue-800">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Swipe right: Keep local changes</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Swipe left: Accept server version</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Swipe up: Attempt merge</span>
          </div>
        </div>
      </div>

      {/* Conflicts list */}
      <div className="space-y-3">
        {sortedConflicts.map((conflict) => (
          <SwipableConflictCard
            key={conflict.id}
            conflict={conflict}
            isResolving={resolving === conflict.id}
            isSelected={selectedConflict === conflict.id}
            onSwipe={(direction) =>
              handleSwipe(conflict.id, direction as 'left' | 'right' | 'up')
            }
            onSelect={() =>
              setSelectedConflict(
                selectedConflict === conflict.id ? null : conflict.id,
              )
            }
          />
        ))}
      </div>

      {/* Bulk actions */}
      {conflicts.length > 1 && (
        <div className="pt-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3">Bulk Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                conflicts.forEach((conflict) =>
                  handleSwipe(conflict.id, 'right'),
                );
              }}
              disabled={!!resolving}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-lg font-medium active:bg-green-700 transition-colors disabled:opacity-50"
              style={{ minHeight: '48px' }}
            >
              <Check className="w-4 h-4" />
              <span>Keep All Local</span>
            </button>

            <button
              onClick={() => {
                conflicts.forEach((conflict) =>
                  handleSwipe(conflict.id, 'left'),
                );
              }}
              disabled={!!resolving}
              className="flex items-center justify-center gap-2 py-3 px-4 bg-red-600 text-white rounded-lg font-medium active:bg-red-700 transition-colors disabled:opacity-50"
              style={{ minHeight: '48px' }}
            >
              <X className="w-4 h-4" />
              <span>Accept All Server</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Swipable conflict card component
interface SwipableConflictCardProps {
  conflict: ConflictData;
  isResolving: boolean;
  isSelected: boolean;
  onSwipe: (direction: string) => void;
  onSelect: () => void;
}

const SwipableConflictCard: React.FC<SwipableConflictCardProps> = ({
  conflict,
  isResolving,
  isSelected,
  onSwipe,
  onSelect,
}) => {
  const getPriorityColor = (priority: ConflictData['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'high':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low':
        return 'bg-blue-100 border-blue-300 text-blue-800';
    }
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden rounded-lg border border-gray-200 bg-white"
    >
      {/* Main content */}
      <div
        className="relative bg-white p-4 cursor-pointer"
        onClick={onSelect}
        style={{ minHeight: '72px' }}
      >
        {/* Priority badge */}
        <div
          className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(conflict.priority)}`}
        >
          {conflict.priority.toUpperCase()}
        </div>

        <div className="flex items-start gap-3 mr-16">
          <div className="flex-shrink-0 mt-1">
            <div className="p-2 bg-gray-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-gray-600" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">
              {conflict.title}
            </h4>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {conflict.description}
            </p>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{conflict.userName}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{conflict.timestamp.toLocaleTimeString()}</span>
              </div>
            </div>
          </div>

          {/* Expand indicator */}
          <ChevronRight
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isSelected ? 'rotate-90' : ''
            }`}
          />
        </div>

        {/* Resolving overlay */}
        {isResolving && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-white/80 flex items-center justify-center"
          >
            <div className="flex items-center gap-2 text-blue-600">
              <RotateCcw className="w-5 h-5 animate-spin" />
              <span className="font-medium">Resolving...</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {isSelected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-gray-200 bg-gray-50"
          >
            <div className="p-4 space-y-3">
              {/* Quick action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwipe('right');
                  }}
                  className="flex flex-col items-center justify-center py-2 px-3 bg-green-100 text-green-800 rounded-lg font-medium active:bg-green-200 transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  <Check className="w-4 h-4 mb-1" />
                  <span className="text-xs">Local</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwipe('left');
                  }}
                  className="flex flex-col items-center justify-center py-2 px-3 bg-red-100 text-red-800 rounded-lg font-medium active:bg-red-200 transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  <X className="w-4 h-4 mb-1" />
                  <span className="text-xs">Server</span>
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSwipe('up');
                  }}
                  className="flex flex-col items-center justify-center py-2 px-3 bg-blue-100 text-blue-800 rounded-lg font-medium active:bg-blue-200 transition-colors"
                  style={{ minHeight: '44px' }}
                >
                  <RotateCcw className="w-4 h-4 mb-1" />
                  <span className="text-xs">Merge</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
