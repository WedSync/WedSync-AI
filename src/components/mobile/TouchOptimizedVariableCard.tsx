'use client';

/**
 * Touch-Optimized Environment Variable Card for WedSync
 * Team D - Performance Optimization & Mobile Experience
 * Mobile-first card component with swipe gestures and haptic feedback
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Copy,
  ExternalLink,
  Lock,
  Unlock,
  Smartphone,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useSwipeToDelete, useGestureHandler } from '@/hooks/useGestureHandler';
import { cn } from '@/lib/utils';

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  category: string;
  isPublic: boolean;
  isEncrypted: boolean;
  description?: string;
  updatedAt: Date;
  updatedBy?: string;
  isRequired?: boolean;
  environment: 'production' | 'staging' | 'development';
}

interface TouchOptimizedVariableCardProps {
  variable: EnvironmentVariable;
  isOffline?: boolean;
  showValues?: boolean;
  onEdit?: (variable: EnvironmentVariable) => void;
  onDelete?: (variable: EnvironmentVariable) => void;
  onCopy?: (value: string) => void;
  onToggleVisibility?: (id: string) => void;
  onToggleEncryption?: (id: string) => void;
  className?: string;
  enableSwipeActions?: boolean;
  enableHapticFeedback?: boolean;
}

/**
 * Mobile-optimized environment variable card with touch gestures
 * Designed for wedding suppliers working on mobile devices
 */
export function TouchOptimizedVariableCard({
  variable,
  isOffline = false,
  showValues = false,
  onEdit,
  onDelete,
  onCopy,
  onToggleVisibility,
  onToggleEncryption,
  className,
  enableSwipeActions = true,
  enableHapticFeedback = true,
}: TouchOptimizedVariableCardProps) {
  const [isValueVisible, setIsValueVisible] = useState(showValues);
  const [isExpanded, setIsExpanded] = useState(false);
  const [swipeTransform, setSwipeTransform] = useState(0);
  const [showDeleteButton, setShowDeleteButton] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Handle swipe-to-delete functionality
  const {
    eventHandlers: swipeEventHandlers,
    swipeProgress,
    isDeleting,
    resetSwipe,
  } = useSwipeToDelete(() => onDelete?.(variable), {
    threshold: 120, // 120px swipe threshold
    enableHaptics: enableHapticFeedback,
  });

  // Handle other gestures (double-tap to expand, long-press menu)
  const { eventHandlers: gestureEventHandlers, triggerHaptic } =
    useGestureHandler(
      {
        onDoubleTap: () => {
          setIsExpanded(!isExpanded);
          triggerHaptic('light');
        },
        onLongPress: () => {
          setShowDeleteButton(true);
          triggerHaptic('medium');
          setTimeout(() => setShowDeleteButton(false), 3000);
        },
        onTap: () => {
          if (showDeleteButton) {
            setShowDeleteButton(false);
          }
        },
      },
      {
        enableHaptics: enableHapticFeedback,
      },
    );

  // Combine event handlers
  const combinedEventHandlers = enableSwipeActions
    ? { ...swipeEventHandlers, ...gestureEventHandlers }
    : gestureEventHandlers;

  // Handle copy action with haptic feedback
  const handleCopy = useCallback(async () => {
    if (!onCopy) return;

    try {
      await navigator.clipboard.writeText(variable.value);
      onCopy(variable.value);
      triggerHaptic('light');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      // Fallback for older browsers
      onCopy(variable.value);
      triggerHaptic('light');
    }
  }, [variable.value, onCopy, triggerHaptic]);

  // Toggle value visibility
  const handleToggleVisibility = useCallback(() => {
    setIsValueVisible(!isValueVisible);
    onToggleVisibility?.(variable.id);
    triggerHaptic('light');
  }, [isValueVisible, variable.id, onToggleVisibility, triggerHaptic]);

  // Handle edit action
  const handleEdit = useCallback(() => {
    onEdit?.(variable);
    triggerHaptic('light');
  }, [onEdit, variable, triggerHaptic]);

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors = {
      system: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      integration:
        'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      ui: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      performance:
        'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      security: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return (
      colors[category as keyof typeof colors] ||
      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    );
  };

  // Get environment color
  const getEnvironmentColor = (env: string) => {
    const colors = {
      production: 'bg-red-500',
      staging: 'bg-yellow-500',
      development: 'bg-green-500',
    };
    return colors[env as keyof typeof colors] || 'bg-gray-500';
  };

  // Format value based on type
  const formatValue = (value: string, type: string) => {
    if (!isValueVisible) {
      return '••••••••';
    }

    switch (type) {
      case 'boolean':
        return value === 'true' ? '✓ True' : '✗ False';
      case 'number':
        return Number(value).toLocaleString();
      case 'json':
        try {
          return JSON.stringify(JSON.parse(value), null, 2);
        } catch {
          return value;
        }
      default:
        return value;
    }
  };

  // Calculate swipe transform
  useEffect(() => {
    if (enableSwipeActions) {
      const transform = swipeProgress * -120; // Slide left on swipe
      setSwipeTransform(transform);
    }
  }, [swipeProgress, enableSwipeActions]);

  return (
    <div className="relative overflow-hidden">
      {/* Delete indicator background */}
      {enableSwipeActions && swipeProgress > 0 && (
        <div className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500 text-white px-4 z-0">
          <Trash2 className="h-5 w-5" />
          <span className="ml-2 text-sm font-medium">Delete</span>
        </div>
      )}

      {/* Main card */}
      <Card
        ref={cardRef}
        className={cn(
          'relative z-10 transition-all duration-200 ease-out',
          isDeleting && 'opacity-50 scale-95',
          showDeleteButton && 'ring-2 ring-red-500',
          isOffline && 'opacity-75',
          className,
        )}
        style={{
          transform: `translateX(${swipeTransform}px)`,
        }}
        {...combinedEventHandlers}
      >
        <CardContent className="p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* Environment indicator */}
                <div
                  className={cn(
                    'w-2 h-2 rounded-full',
                    getEnvironmentColor(variable.environment),
                  )}
                />

                <h3 className="text-sm font-medium font-mono text-gray-900 dark:text-gray-100 truncate">
                  {variable.key}
                </h3>

                {/* Offline indicator */}
                {isOffline && <WifiOff className="h-4 w-4 text-gray-400" />}

                {/* Required indicator */}
                {variable.isRequired && (
                  <span className="text-red-500 text-xs font-medium">*</span>
                )}
              </div>

              {/* Category and type badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  className={cn('text-xs', getCategoryColor(variable.category))}
                >
                  {variable.category}
                </Badge>

                <Badge variant="outline" className="text-xs">
                  {variable.type}
                </Badge>

                {variable.isPublic && (
                  <Badge variant="outline" className="text-xs text-green-600">
                    Public
                  </Badge>
                )}

                {variable.isEncrypted && (
                  <Lock className="h-3 w-3 text-gray-500" />
                )}
              </div>
            </div>

            {/* Quick actions - Always visible on mobile */}
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleVisibility}
                className="h-8 w-8 p-0"
              >
                {isValueVisible ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-8 w-8 p-0"
                disabled={!isValueVisible}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Value display */}
          <div className="mb-3">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <div className="text-sm">
                {variable.type === 'json' && isValueVisible ? (
                  <pre className="whitespace-pre-wrap font-mono text-xs overflow-x-auto">
                    {formatValue(variable.value, variable.type)}
                  </pre>
                ) : (
                  <p
                    className={cn(
                      'font-mono break-all',
                      variable.type === 'json' ? 'text-xs' : 'text-sm',
                      !isValueVisible && 'select-none',
                    )}
                  >
                    {formatValue(variable.value, variable.type)}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {variable.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {variable.description}
            </p>
          )}

          {/* Expandable details */}
          {isExpanded && (
            <div className="border-t pt-3 mt-3">
              <div className="grid grid-cols-1 gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Environment:</span>
                  <span className="font-medium capitalize">
                    {variable.environment}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Updated:</span>
                  <span>{variable.updatedAt.toLocaleDateString()}</span>
                </div>
                {variable.updatedBy && (
                  <div className="flex justify-between">
                    <span>Updated by:</span>
                    <span>{variable.updatedBy}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Encrypted:</span>
                  <span>{variable.isEncrypted ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Public API:</span>
                  <span>{variable.isPublic ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs"
              >
                {isExpanded ? 'Less' : 'More'} Details
              </Button>
            </div>

            {/* Mobile action buttons */}
            <div className="flex items-center gap-1">
              {onToggleEncryption && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleEncryption(variable.id)}
                  className="h-8 w-8 p-0"
                  disabled={isOffline}
                >
                  {variable.isEncrypted ? (
                    <Lock className="h-4 w-4" />
                  ) : (
                    <Unlock className="h-4 w-4" />
                  )}
                </Button>
              )}

              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="h-8 w-8 p-0"
                  disabled={isOffline}
                >
                  <Edit className="h-4 w-4" />
                </Button>
              )}

              {/* Show delete button on long press or when swipe actions disabled */}
              {(showDeleteButton || !enableSwipeActions) && onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(variable)}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                  disabled={isOffline}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile-specific instructions */}
          <div className="mt-2 pt-2 border-t">
            <div className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 gap-4">
              <span className="flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                Double-tap: Details
              </span>
              {enableSwipeActions && <span>Swipe left: Delete</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Virtualized list of environment variable cards for performance
 * Optimized for large datasets on mobile devices
 */
interface VirtualizedVariableListProps {
  variables: EnvironmentVariable[];
  itemHeight?: number;
  containerHeight?: number;
  onEdit?: (variable: EnvironmentVariable) => void;
  onDelete?: (variable: EnvironmentVariable) => void;
  onCopy?: (value: string) => void;
  showValues?: boolean;
  isOffline?: boolean;
  className?: string;
}

export function VirtualizedVariableList({
  variables,
  itemHeight = 200,
  containerHeight = 400,
  onEdit,
  onDelete,
  onCopy,
  showValues = false,
  isOffline = false,
  className,
}: VirtualizedVariableListProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate visible items
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight) + 1,
    variables.length,
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleVariables = variables.slice(visibleStart, visibleEnd);

  return (
    <div
      ref={containerRef}
      className={cn('overflow-auto', className)}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Spacer for items before visible area */}
      <div style={{ height: visibleStart * itemHeight }} />

      {/* Visible items */}
      {visibleVariables.map((variable, index) => (
        <div key={variable.id} style={{ height: itemHeight }} className="mb-4">
          <TouchOptimizedVariableCard
            variable={variable}
            onEdit={onEdit}
            onDelete={onDelete}
            onCopy={onCopy}
            showValues={showValues}
            isOffline={isOffline}
            enableSwipeActions={true}
            enableHapticFeedback={true}
          />
        </div>
      ))}

      {/* Spacer for items after visible area */}
      <div style={{ height: (variables.length - visibleEnd) * itemHeight }} />
    </div>
  );
}

export default TouchOptimizedVariableCard;
