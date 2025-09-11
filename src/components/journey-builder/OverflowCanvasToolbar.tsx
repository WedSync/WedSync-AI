'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Play,
  Pause,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Eye,
  Settings,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface OverflowCanvasToolbarProps {
  onSave: () => void;
  onActivate: () => void;
  onPause: () => void;
  onPreview?: () => void;
  isSaving: boolean;
  isActive: boolean;
  className?: string;
}

export function OverflowCanvasToolbar({
  onSave,
  onActivate,
  onPause,
  onPreview,
  isSaving,
  isActive,
  className,
}: OverflowCanvasToolbarProps) {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`
        flex items-center justify-between p-4 border-b 
        bg-gradient-to-r from-background via-background/95 to-background
        backdrop-blur-md ${className || ''}
      `}
    >
      {/* Left section - Tools */}
      <div className="flex items-center gap-2">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-card border rounded-lg p-1 flex items-center gap-1"
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </motion.div>

        <Separator orientation="vertical" className="h-6" />

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-card border rounded-lg p-1 flex items-center gap-1"
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="Fit to Screen"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </motion.div>

        <Separator orientation="vertical" className="h-6" />

        {onPreview && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPreview}
            className="flex items-center gap-2 bg-card hover:bg-accent"
          >
            <Eye className="h-4 w-4" />
            Preview
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-card hover:bg-accent"
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>

      {/* Center section - Status */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex items-center gap-3"
      >
        <Badge
          variant={isActive ? 'default' : 'secondary'}
          className={`
            flex items-center gap-1.5 px-3 py-1
            ${
              isActive
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }
          `}
        >
          {isActive ? (
            <>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 bg-white rounded-full"
              />
              Active
            </>
          ) : (
            <>
              <div className="w-2 h-2 bg-gray-400 rounded-full" />
              Draft
            </>
          )}
        </Badge>

        {isSaving && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-sm text-muted-foreground"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
            />
            Saving...
          </motion.div>
        )}
      </motion.div>

      {/* Right section - Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 bg-card hover:bg-accent"
        >
          <Settings className="h-4 w-4" />
          Settings
        </Button>

        <motion.div whileHover={{ scale: 1.02 }}>
          <Button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </motion.div>

        {!isActive ? (
          <motion.div whileHover={{ scale: 1.02 }}>
            <Button
              onClick={onActivate}
              className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              <Play className="h-4 w-4" />
              <Sparkles className="h-4 w-4" />
              Activate
            </Button>
          </motion.div>
        ) : (
          <motion.div whileHover={{ scale: 1.02 }}>
            <Button
              onClick={onPause}
              variant="outline"
              className="flex items-center gap-2 border-orange-200 text-orange-600 hover:bg-orange-50"
            >
              <Pause className="h-4 w-4" />
              Pause
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
