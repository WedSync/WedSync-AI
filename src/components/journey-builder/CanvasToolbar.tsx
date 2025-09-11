'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Save,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid,
  Undo,
  Redo,
  Download,
  Upload,
  Play,
  Pause,
} from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

interface CanvasToolbarProps {
  onSave?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onActivate?: () => void;
  onPause?: () => void;
  isSaving?: boolean;
  isActive?: boolean;
}

export function CanvasToolbar({
  onSave,
  onExport,
  onImport,
  onActivate,
  onPause,
  isSaving,
  isActive,
}: CanvasToolbarProps) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { showSuccess, showError } = useToast();

  const handleSave = async () => {
    try {
      if (onSave) {
        await onSave();
        showSuccess(
          'Journey saved',
          'Your journey has been saved successfully',
        );
      }
    } catch (error) {
      showError('Failed to save journey', 'Please try again');
    }
  };

  const handleActivate = async () => {
    try {
      if (onActivate) {
        await onActivate();
        showSuccess(
          'Journey activated',
          'Your journey is now live and running',
        );
      }
    } catch (error) {
      showError(
        'Failed to activate journey',
        'Please check your journey configuration and try again',
      );
    }
  };

  const handlePause = async () => {
    try {
      if (onPause) {
        await onPause();
        showSuccess(
          'Journey paused',
          'Your journey has been paused successfully',
        );
      }
    } catch (error) {
      showError('Failed to pause journey', 'Please try again');
    }
  };

  const handleExport = async () => {
    try {
      if (onExport) {
        await onExport();
        showSuccess(
          'Journey exported',
          'Your journey template has been exported',
        );
      }
    } catch (error) {
      showError('Failed to export journey', 'Please try again');
    }
  };

  const handleImport = async () => {
    try {
      if (onImport) {
        await onImport();
        showSuccess('Journey imported', 'Journey template loaded successfully');
      }
    } catch (error) {
      showError(
        'Failed to import journey',
        'Please check the file and try again',
      );
    }
  };

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b bg-card">
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => zoomOut()}
          className="h-8 w-8 p-0"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => zoomIn()}
          className="h-8 w-8 p-0"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fitView()}
          className="h-8 w-8 p-0"
          title="Fit View"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          title="Grid View"
        >
          <Grid className="h-4 w-4" />
        </Button>

        <div className="h-6 w-px bg-border" />

        <Button
          variant="outline"
          size="sm"
          disabled
          className="h-8 w-8 p-0"
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled
          className="h-8 w-8 p-0"
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        {onImport && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleImport}
            className="flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
        )}

        {onExport && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}

        {onSave && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center space-x-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save</span>
              </>
            )}
          </Button>
        )}

        {onActivate && !isActive && (
          <Button
            size="sm"
            onClick={handleActivate}
            variant="default"
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
          >
            <Play className="h-4 w-4" />
            <span>Activate</span>
          </Button>
        )}

        {onPause && isActive && (
          <Button
            size="sm"
            onClick={handlePause}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Pause className="h-4 w-4" />
            <span>Pause</span>
          </Button>
        )}
      </div>
    </div>
  );
}
