/**
 * WS-209: Touch-Optimized Personalization Controls
 * Enhanced touch interactions for mobile content personalization
 * Supports gestures, quick actions, and accessibility
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Zap,
  RotateCcw,
  Copy,
  Share2,
  Download,
  Upload,
  Trash2,
  Star,
  StarOff,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface TouchPersonalizationControlsProps {
  template: any;
  onTemplateChange: (template: any) => void;
  isEditing: boolean;
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  action: () => void;
  color: string;
  enabled: boolean;
  longPressAction?: () => void;
}

interface GestureState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isActive: boolean;
  startTime: number;
}

export function TouchPersonalizationControls({
  template,
  onTemplateChange,
  isEditing,
  className = '',
}: TouchPersonalizationControlsProps) {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [gestureState, setGestureState] = useState<GestureState | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const controlsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Haptic feedback function (modern browsers)
  const triggerHaptic = useCallback(
    (type: 'light' | 'medium' | 'heavy' = 'light') => {
      if (!hapticFeedback) return;

      try {
        if ('vibrate' in navigator) {
          const patterns = {
            light: [10],
            medium: [20],
            heavy: [50],
          };
          navigator.vibrate(patterns[type]);
        }
      } catch (error) {
        // Silently fail if vibration not supported
      }
    },
    [hapticFeedback],
  );

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      id: 'favorite',
      label: template?.isFavorite ? 'Unfavorite' : 'Favorite',
      icon: template?.isFavorite ? StarOff : Star,
      action: () => handleToggleFavorite(),
      color: 'text-yellow-600',
      enabled: true,
      longPressAction: () => showFavoriteOptions(),
    },
    {
      id: 'copy',
      label: 'Copy Template',
      icon: Copy,
      action: () => handleCopyTemplate(),
      color: 'text-blue-600',
      enabled: true,
      longPressAction: () => showCopyOptions(),
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      action: () => handleShare(),
      color: 'text-green-600',
      enabled: true,
      longPressAction: () => showShareOptions(),
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      action: () => handleExport(),
      color: 'text-purple-600',
      enabled: true,
      longPressAction: () => showExportOptions(),
    },
    {
      id: 'reset',
      label: 'Reset',
      icon: RotateCcw,
      action: () => handleReset(),
      color: 'text-red-600',
      enabled: isEditing,
      longPressAction: () => showResetOptions(),
    },
    {
      id: 'voice',
      label: voiceMode ? 'Stop Voice' : 'Voice Mode',
      icon: voiceMode ? VolumeX : Volume2,
      action: () => handleVoiceToggle(),
      color: 'text-indigo-600',
      enabled: true,
    },
  ];

  // Handle touch gestures
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const newGestureState: GestureState = {
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        isActive: true,
        startTime: Date.now(),
      };

      setGestureState(newGestureState);
      triggerHaptic('light');

      // Start long press detection
      const timer = setTimeout(() => {
        handleLongPress(e);
      }, 500);
      setLongPressTimer(timer);
    },
    [triggerHaptic],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!gestureState) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - gestureState.startX;
      const deltaY = touch.clientY - gestureState.startY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Cancel long press if moved too much
      if (distance > 10 && longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }

      setGestureState((prev) =>
        prev
          ? {
              ...prev,
              currentX: touch.clientX,
              currentY: touch.clientY,
            }
          : null,
      );

      // Handle swipe gestures
      if (distance > 50) {
        const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;

        if (Math.abs(angle) < 45) {
          // Swipe right - show quick actions
          setShowQuickActions(true);
        } else if (Math.abs(angle) > 135) {
          // Swipe left - hide quick actions
          setShowQuickActions(false);
        } else if (angle > 45 && angle < 135) {
          // Swipe down - minimize
          setIsFullscreen(false);
        } else if (angle > -135 && angle < -45) {
          // Swipe up - maximize
          setIsFullscreen(true);
        }
      }
    },
    [gestureState, longPressTimer],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }

      if (gestureState) {
        const duration = Date.now() - gestureState.startTime;
        const deltaX = gestureState.currentX - gestureState.startX;
        const deltaY = gestureState.currentY - gestureState.startY;
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

        // Handle tap (short touch with minimal movement)
        if (duration < 200 && distance < 10) {
          handleTap(e);
        }
      }

      setGestureState(null);
    },
    [gestureState, longPressTimer],
  );

  const handleTap = useCallback(
    (e: React.TouchEvent) => {
      triggerHaptic('light');
      // Handle single tap actions
    },
    [triggerHaptic],
  );

  const handleLongPress = useCallback(
    (e: React.TouchEvent) => {
      triggerHaptic('heavy');
      setShowQuickActions(true);

      toast({
        title: 'Quick Actions',
        description: 'Swipe or tap to access personalization tools',
        duration: 2000,
      });
    },
    [triggerHaptic, toast],
  );

  // Action handlers
  const handleToggleFavorite = useCallback(() => {
    triggerHaptic('medium');
    onTemplateChange({
      ...template,
      isFavorite: !template?.isFavorite,
    });

    toast({
      title: template?.isFavorite
        ? 'Removed from favorites'
        : 'Added to favorites',
      duration: 2000,
    });
  }, [template, onTemplateChange, triggerHaptic, toast]);

  const handleCopyTemplate = useCallback(async () => {
    triggerHaptic('medium');
    try {
      const templateData = JSON.stringify(template, null, 2);
      await navigator.clipboard.writeText(templateData);

      toast({
        title: 'Template copied',
        description: 'Template data copied to clipboard',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy template data',
        variant: 'destructive',
        duration: 2000,
      });
    }
  }, [template, triggerHaptic, toast]);

  const handleShare = useCallback(async () => {
    triggerHaptic('medium');
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${template?.name} - Wedding Template`,
          text: `Check out this personalized wedding template: ${template?.name}`,
          url: window.location.href,
        });
      } else {
        // Fallback to copying URL
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: 'Link copied',
          description: 'Template link copied to clipboard',
          duration: 2000,
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [template, triggerHaptic, toast]);

  const handleExport = useCallback(() => {
    triggerHaptic('medium');
    try {
      const dataStr = JSON.stringify(template, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${template?.name || 'template'}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: 'Template exported',
        description: 'Template downloaded as JSON file',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Export failed',
        description: 'Failed to export template',
        variant: 'destructive',
        duration: 2000,
      });
    }
  }, [template, triggerHaptic, toast]);

  const handleReset = useCallback(() => {
    triggerHaptic('heavy');
    // Show confirmation dialog
    const confirmed = confirm(
      'Reset template to original state? This cannot be undone.',
    );

    if (confirmed) {
      // Reset to default template
      onTemplateChange({
        ...template,
        variables: template?.variables?.map((v: any) => ({
          ...v,
          currentValue: undefined,
        })),
      });

      toast({
        title: 'Template reset',
        description: 'Template restored to original state',
        duration: 2000,
      });
    }
  }, [template, onTemplateChange, triggerHaptic, toast]);

  const handleVoiceToggle = useCallback(() => {
    triggerHaptic('medium');
    setVoiceMode(!voiceMode);

    toast({
      title: voiceMode ? 'Voice mode disabled' : 'Voice mode enabled',
      description: voiceMode
        ? 'Manual editing restored'
        : 'Use voice commands to edit',
      duration: 2000,
    });
  }, [voiceMode, triggerHaptic, toast]);

  // Extended action handlers for long press
  const showFavoriteOptions = useCallback(() => {
    // Could show favorite categories, etc.
  }, []);

  const showCopyOptions = useCallback(() => {
    // Could show format options (JSON, text, etc.)
  }, []);

  const showShareOptions = useCallback(() => {
    // Could show different share destinations
  }, []);

  const showExportOptions = useCallback(() => {
    // Could show format options (JSON, PDF, etc.)
  }, []);

  const showResetOptions = useCallback(() => {
    // Could show partial reset options
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  return (
    <div
      ref={controlsRef}
      className={`touch-personalization-controls ${isFullscreen ? 'fullscreen' : ''} ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Control Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="flex items-center justify-between">
          {/* Quick Access Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="w-5 h-5" />
              ) : (
                <Maximize className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={handleToggleFavorite}
              className={`p-3 rounded-full transition-colors ${
                template?.isFavorite
                  ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              aria-label="Toggle favorite"
            >
              {template?.isFavorite ? (
                <Star className="w-5 h-5 fill-current" />
              ) : (
                <Star className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={() => setVoiceMode(!voiceMode)}
              className={`p-3 rounded-full transition-colors ${
                voiceMode
                  ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              aria-label="Toggle voice mode"
            >
              {voiceMode ? (
                <Volume2 className="w-5 h-5" />
              ) : (
                <VolumeX className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Action Menu Toggle */}
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="p-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all transform active:scale-95"
            aria-label="Toggle quick actions"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center justify-center mt-3 space-x-4 text-xs text-gray-500">
          {isEditing && (
            <div className="flex items-center space-x-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              <span>Unsaved changes</span>
            </div>
          )}

          {voiceMode && (
            <div className="flex items-center space-x-1">
              <Volume2 className="w-3 h-3 text-indigo-500" />
              <span>Voice mode active</span>
            </div>
          )}

          <div className="flex items-center space-x-1">
            <Info className="w-3 h-3 text-blue-500" />
            <span>Long press for options</span>
          </div>
        </div>
      </div>

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <div className="fixed bottom-24 left-4 right-4 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <div className="grid grid-cols-3 gap-3">
            {quickActions
              .filter((action) => action.enabled)
              .map((action) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={action.action}
                    onTouchStart={(e) => {
                      // Handle long press for extended options
                      const timer = setTimeout(() => {
                        if (action.longPressAction) {
                          action.longPressAction();
                        }
                      }, 500);

                      const cleanup = () => clearTimeout(timer);
                      e.currentTarget.addEventListener('touchend', cleanup, {
                        once: true,
                      });
                      e.currentTarget.addEventListener('touchcancel', cleanup, {
                        once: true,
                      });
                    }}
                    className={`flex flex-col items-center space-y-2 p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors ${
                      selectedAction === action.id
                        ? 'border-purple-400 bg-purple-50'
                        : ''
                    }`}
                  >
                    <IconComponent className={`w-6 h-6 ${action.color}`} />
                    <span className="text-xs font-medium text-gray-700">
                      {action.label}
                    </span>
                  </button>
                );
              })}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">
              Hold any action for more options
            </p>
          </div>
        </div>
      )}

      {/* Gesture Guide Overlay (First Time) */}
      {gestureState && (
        <div className="fixed inset-0 bg-black/20 z-30 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 mx-4 max-w-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Touch Gestures</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Swipe right: Show actions</li>
              <li>• Swipe left: Hide actions</li>
              <li>• Swipe up: Fullscreen</li>
              <li>• Swipe down: Minimize</li>
              <li>• Long press: Quick menu</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
