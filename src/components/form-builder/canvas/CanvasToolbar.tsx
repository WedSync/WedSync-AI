'use client';

import React from 'react';
import {
  Undo2,
  Redo2,
  Save,
  Eye,
  Settings,
  Info,
  Smartphone,
  Tablet,
  Monitor,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface CanvasToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  fieldsCount: number;
  maxFields: number;
  lastSavedAt?: Date;
  onSave: () => void;
  onPreview?: () => void;
  onSettings?: () => void;
  className?: string;
}

/**
 * CanvasToolbar - Top toolbar for the form builder canvas
 *
 * Features:
 * - Undo/redo functionality
 * - Save progress indicator
 * - Field count and limits
 * - Preview and settings access
 * - Mobile-responsive design
 * - Wedding-themed messaging
 */
export function CanvasToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  fieldsCount,
  maxFields,
  lastSavedAt,
  onSave,
  onPreview,
  onSettings,
  className,
}: CanvasToolbarProps) {
  // Format last saved time
  const formatLastSaved = (date?: Date) => {
    if (!date) return 'Never saved';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 60) return 'Just saved';
    if (minutes < 60) return `Saved ${minutes}m ago`;
    return `Saved at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Calculate field limit status
  const isNearLimit = maxFields !== -1 && fieldsCount >= maxFields * 0.8;
  const isAtLimit = maxFields !== -1 && fieldsCount >= maxFields;

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center justify-between gap-4 p-4 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800',
          'min-h-[60px] flex-wrap',
          className,
        )}
      >
        {/* Left Section - Form Actions */}
        <div className="flex items-center gap-3">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                  className="p-2 h-8 w-8"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Undo last change (Cmd+Z)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                  className="p-2 h-8 w-8"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Redo change (Cmd+Shift+Z)</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Save Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onSave}
                className="flex items-center gap-2 px-3"
              >
                <Save className="w-4 h-4" />
                <span className="text-sm font-medium">Save</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Save questionnaire (Cmd+S)</p>
            </TooltipContent>
          </Tooltip>

          {/* Auto-save indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Zap className="w-3 h-3 text-green-500" />
            <span>{formatLastSaved(lastSavedAt)}</span>
          </div>
        </div>

        {/* Center Section - Field Count and Limits */}
        <div className="flex items-center gap-3">
          {/* Field Count Badge */}
          <Badge
            variant={
              isAtLimit ? 'destructive' : isNearLimit ? 'secondary' : 'outline'
            }
            className="flex items-center gap-1"
          >
            <span className="font-mono">
              {fieldsCount}
              {maxFields !== -1 ? `/${maxFields}` : ''} fields
            </span>
          </Badge>

          {/* Limit Warning */}
          {isNearLimit && !isAtLimit && (
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-amber-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Approaching field limit. Upgrade for unlimited fields.</p>
              </TooltipContent>
            </Tooltip>
          )}

          {isAtLimit && (
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-red-500" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Field limit reached. Upgrade to add more fields.</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Right Section - Preview and Settings */}
        <div className="flex items-center gap-2">
          {/* Preview Options */}
          {onPreview && (
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPreview}
                    className="p-2 h-8 w-8"
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Preview on mobile</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPreview}
                    className="p-2 h-8 w-8"
                  >
                    <Tablet className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Preview on tablet</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onPreview}
                    className="p-2 h-8 w-8"
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Preview on desktop</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          <Separator orientation="vertical" className="h-6" />

          {/* Primary Actions */}
          <div className="flex items-center gap-2">
            {onPreview && (
              <Button
                variant="outline"
                size="sm"
                onClick={onPreview}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Preview</span>
              </Button>
            )}

            {onSettings && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSettings}
                    className="p-2 h-8 w-8"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Form settings</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Mobile Responsive - Stack elements on very small screens */}
        <div className="w-full sm:hidden flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            💍 Building questionnaire for your couples
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Auto-saves every 30s
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default CanvasToolbar;
