'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  X,
  Zap,
  Users,
  Utensils,
  Settings,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  ConflictMobileBannerProps,
  ConflictFlag,
} from '@/types/mobile-seating';

/**
 * ConflictMobileBanner - WS-154 Mobile Conflict Component
 *
 * Non-intrusive conflict warnings for mobile:
 * - Swipe-to-dismiss functionality
 * - Priority-based display system
 * - Quick-fix action buttons
 * - Expandable details
 * - Auto-hide timers
 */
export const ConflictMobileBanner: React.FC<ConflictMobileBannerProps> = ({
  conflicts,
  onDismiss,
  onQuickFix,
  priority = 'medium',
  className = '',
}) => {
  const [dismissedConflicts, setDismissedConflicts] = useState<string[]>([]);
  const [expandedConflict, setExpandedConflict] = useState<string | null>(null);
  const [swipeStates, setSwipeStates] = useState<
    Record<string, { offset: number; isDismissing: boolean }>
  >({});

  // Filter out dismissed conflicts
  const visibleConflicts = conflicts.filter(
    (_, index) => !dismissedConflicts.includes(index.toString()),
  );

  // Sort conflicts by severity (high -> medium -> low)
  const sortedConflicts = [...visibleConflicts].sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 };
    return severityOrder[b.severity] - severityOrder[a.severity];
  });

  // Auto-dismiss low priority conflicts after 5 seconds
  useEffect(() => {
    const lowPriorityConflicts = sortedConflicts
      .map((conflict, index) => ({ conflict, index }))
      .filter(({ conflict }) => conflict.severity === 'low');

    if (lowPriorityConflicts.length > 0) {
      const timer = setTimeout(() => {
        lowPriorityConflicts.forEach(({ index }) => {
          handleDismiss(index.toString(), false);
        });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [sortedConflicts]);

  const handleDismiss = (conflictId: string, userAction: boolean = true) => {
    if (userAction) {
      // Add dismissing animation
      setSwipeStates((prev) => ({
        ...prev,
        [conflictId]: { ...prev[conflictId], isDismissing: true },
      }));

      // Wait for animation before actually dismissing
      setTimeout(() => {
        setDismissedConflicts((prev) => [...prev, conflictId]);
        onDismiss(conflictId);
      }, 200);
    } else {
      // Immediate dismiss for auto-hide
      setDismissedConflicts((prev) => [...prev, conflictId]);
      onDismiss(conflictId);
    }
  };

  const handleQuickFix = (conflictId: string) => {
    onQuickFix?.(conflictId);
    handleDismiss(conflictId);
  };

  const handleSwipeStart = (conflictId: string, startX: number) => {
    setSwipeStates((prev) => ({
      ...prev,
      [conflictId]: { offset: 0, isDismissing: false },
    }));
  };

  const handleSwipeMove = (
    conflictId: string,
    currentX: number,
    startX: number,
  ) => {
    const offset = currentX - startX;
    setSwipeStates((prev) => ({
      ...prev,
      [conflictId]: { ...prev[conflictId], offset },
    }));
  };

  const handleSwipeEnd = (conflictId: string) => {
    const swipeState = swipeStates[conflictId];

    if (swipeState && Math.abs(swipeState.offset) > 100) {
      // Trigger dismiss on significant swipe
      handleDismiss(conflictId);
    } else {
      // Reset position
      setSwipeStates((prev) => ({
        ...prev,
        [conflictId]: { offset: 0, isDismissing: false },
      }));
    }
  };

  const getConflictIcon = (type: ConflictFlag['type']) => {
    switch (type) {
      case 'dietary':
        return <Utensils className="w-4 h-4" />;
      case 'personal':
        return <Users className="w-4 h-4" />;
      case 'seating_preference':
        return <Settings className="w-4 h-4" />;
      case 'accessibility':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: ConflictFlag['severity']) => {
    switch (severity) {
      case 'high':
        return 'border-red-400 bg-red-50';
      case 'medium':
        return 'border-yellow-400 bg-yellow-50';
      case 'low':
        return 'border-blue-400 bg-blue-50';
      default:
        return 'border-gray-400 bg-gray-50';
    }
  };

  const getSeverityTextColor = (severity: ConflictFlag['severity']) => {
    switch (severity) {
      case 'high':
        return 'text-red-800';
      case 'medium':
        return 'text-yellow-800';
      case 'low':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  if (sortedConflicts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {sortedConflicts.map((conflict, index) => {
        const conflictId = index.toString();
        const swipeState = swipeStates[conflictId] || {
          offset: 0,
          isDismissing: false,
        };
        const isExpanded = expandedConflict === conflictId;

        return (
          <div
            key={conflictId}
            className={`
              relative transition-all duration-200 ease-out
              ${swipeState.isDismissing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
            `}
            style={{
              transform: `translateX(${swipeState.offset}px)`,
            }}
          >
            <Alert
              className={`
                ${getSeverityColor(conflict.severity)} 
                border-l-4 shadow-sm touch-manipulation
                ${Math.abs(swipeState.offset) > 50 ? 'opacity-70' : ''}
              `}
            >
              <div className="flex items-start space-x-3">
                {/* Icon */}
                <div
                  className={`flex-shrink-0 ${getSeverityTextColor(conflict.severity)}`}
                >
                  {getConflictIcon(conflict.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Main message */}
                      <p
                        className={`text-sm font-medium ${getSeverityTextColor(conflict.severity)}`}
                      >
                        {conflict.message}
                      </p>

                      {/* Severity badge */}
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge
                          variant={
                            conflict.severity === 'high'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className="text-xs"
                        >
                          {conflict.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-gray-500 capitalize">
                          {conflict.type.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && conflict.suggestedAction && (
                        <div className="mt-3 p-2 bg-white/50 rounded border border-gray-200">
                          <p className="text-xs text-gray-700">
                            <strong>Suggestion:</strong>{' '}
                            {conflict.suggestedAction}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1 ml-2">
                      {/* Expand/Collapse */}
                      {conflict.suggestedAction && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 w-8 h-8"
                          onClick={() =>
                            setExpandedConflict(isExpanded ? null : conflictId)
                          }
                          aria-label={
                            isExpanded ? 'Collapse details' : 'Expand details'
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3" />
                          ) : (
                            <ChevronDown className="w-3 h-3" />
                          )}
                        </Button>
                      )}

                      {/* Quick fix */}
                      {conflict.suggestedAction && onQuickFix && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 w-8 h-8"
                          onClick={() => handleQuickFix(conflictId)}
                          aria-label="Apply quick fix"
                        >
                          <Zap className="w-3 h-3" />
                        </Button>
                      )}

                      {/* Dismiss */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 w-8 h-8"
                        onClick={() => handleDismiss(conflictId)}
                        aria-label="Dismiss conflict"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick actions */}
                  {isExpanded && (
                    <div className="flex space-x-2 mt-3">
                      {onQuickFix && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-8"
                          onClick={() => handleQuickFix(conflictId)}
                        >
                          <Zap className="w-3 h-3 mr-1" />
                          Quick Fix
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={() => handleDismiss(conflictId)}
                      >
                        Ignore
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Swipe indicator */}
              {Math.abs(swipeState.offset) > 30 && (
                <div
                  className={`
                  absolute top-1/2 transform -translate-y-1/2 transition-opacity
                  ${swipeState.offset > 0 ? 'left-2' : 'right-2'}
                `}
                >
                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                    <X className="w-3 h-3" />
                    <span>Dismiss</span>
                  </div>
                </div>
              )}
            </Alert>

            {/* Touch handler overlay */}
            <div
              className="absolute inset-0 touch-manipulation"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                handleSwipeStart(conflictId, touch.clientX);
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                handleSwipeMove(conflictId, touch.clientX, 0);
                e.preventDefault();
              }}
              onTouchEnd={() => handleSwipeEnd(conflictId)}
              style={{ zIndex: Math.abs(swipeState.offset) > 10 ? 10 : 'auto' }}
            />
          </div>
        );
      })}

      {/* Summary when multiple conflicts */}
      {sortedConflicts.length > 1 && (
        <div className="text-xs text-gray-600 text-center mt-2">
          {sortedConflicts.length} conflicts found. Swipe to dismiss individual
          items.
        </div>
      )}
    </div>
  );
};
