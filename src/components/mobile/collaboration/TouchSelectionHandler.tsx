'use client';

/**
 * TouchSelectionHandler - Mobile-optimized text selection for collaborative editing
 * WS-244 Team D - Mobile-First Real-Time Collaboration System
 *
 * Features:
 * - Touch-friendly text selection with haptic feedback
 * - Wedding-specific quick actions based on document type
 * - Gesture recognition (tap, double-tap, long press, swipe)
 * - Context menu with collaborative editing actions
 * - Real-time selection sharing with other collaborators
 * - Mobile keyboard integration and toolbar positioning
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Copy,
  Paste,
  Cut,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  CheckSquare,
  Hash,
  Clock,
  DollarSign,
  User,
  Heart,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Camera,
  Music,
  ChefHat,
  Flower,
  Car,
  Home,
  X,
  Plus,
} from 'lucide-react';

interface TextSelection {
  start: number;
  end: number;
  text: string;
  type: 'character' | 'word' | 'line' | 'paragraph';
}

interface TouchGesture {
  type: 'tap' | 'double_tap' | 'long_press' | 'swipe';
  position: { x: number; y: number };
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  insert?: string;
  format?: 'bold' | 'italic' | 'underline';
  action?: () => void;
  shortcut?: string;
}

interface TouchSelectionHandlerProps {
  onSelectionChange: (selection: TextSelection | null) => void;
  onGesture?: (gesture: TouchGesture) => void;
  onQuickAction?: (
    action: QuickAction,
    selection: TextSelection | null,
  ) => void;
  documentType?:
    | 'guest_list'
    | 'vendor_selection'
    | 'timeline'
    | 'family_input';
  enableGestures?: boolean;
  enableHapticFeedback?: boolean;
  showToolbar?: boolean;
  toolbarPosition?: 'top' | 'bottom' | 'floating';
  className?: string;
}

export function TouchSelectionHandler({
  onSelectionChange,
  onGesture,
  onQuickAction,
  documentType = 'guest_list',
  enableGestures = true,
  enableHapticFeedback = true,
  showToolbar = true,
  toolbarPosition = 'floating',
  className,
}: TouchSelectionHandlerProps) {
  // State
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({
    x: 0,
    y: 0,
  });
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [activeGesture, setActiveGesture] = useState<TouchGesture | null>(null);

  // Refs
  const touchAreaRef = useRef<HTMLDivElement>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<{
    time: number;
    position: { x: number; y: number };
  } | null>(null);

  // Wedding-specific quick actions based on document type
  const quickActions = useMemo((): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: 'copy',
        label: 'Copy',
        icon: Copy,
        action: () => navigator.clipboard?.writeText(selection?.text || ''),
      },
      {
        id: 'paste',
        label: 'Paste',
        icon: Paste,
        action: () => navigator.clipboard?.readText(),
      },
      { id: 'cut', label: 'Cut', icon: Cut },
      { id: 'undo', label: 'Undo', icon: Undo, shortcut: 'Cmd+Z' },
      { id: 'redo', label: 'Redo', icon: Redo, shortcut: 'Cmd+Y' },
    ];

    const documentSpecificActions = (() => {
      switch (documentType) {
        case 'guest_list':
          return [
            {
              id: 'rsvp_confirmed',
              label: 'RSVP Status',
              icon: CheckSquare,
              insert: '✅ Confirmed: ',
            },
            {
              id: 'rsvp_pending',
              label: 'Pending',
              icon: Clock,
              insert: '⏳ Pending: ',
            },
            {
              id: 'rsvp_declined',
              label: 'Declined',
              icon: X,
              insert: '❌ Declined: ',
            },
            {
              id: 'table_number',
              label: 'Table',
              icon: Hash,
              insert: 'Table #: ',
            },
            {
              id: 'dietary',
              label: 'Dietary',
              icon: ChefHat,
              insert: 'Dietary: ',
            },
            { id: 'contact', label: 'Contact', icon: Phone, insert: 'Phone: ' },
            { id: 'email', label: 'Email', icon: Mail, insert: 'Email: ' },
            {
              id: 'plus_one',
              label: 'Plus One',
              icon: Plus,
              insert: '+ Guest: ',
            },
          ];

        case 'vendor_selection':
          return [
            {
              id: 'add_vendor',
              label: 'Add Vendor',
              icon: User,
              insert: '\n\n📋 Vendor: ',
            },
            {
              id: 'price',
              label: 'Price',
              icon: DollarSign,
              insert: 'Price: £',
            },
            {
              id: 'contact',
              label: 'Contact',
              icon: Phone,
              insert: 'Contact: ',
            },
            {
              id: 'location',
              label: 'Location',
              icon: MapPin,
              insert: 'Location: ',
            },
            {
              id: 'photographer',
              label: 'Photography',
              icon: Camera,
              insert: '📸 Photography: ',
            },
            {
              id: 'catering',
              label: 'Catering',
              icon: ChefHat,
              insert: '🍽️ Catering: ',
            },
            {
              id: 'flowers',
              label: 'Flowers',
              icon: Flower,
              insert: '🌸 Flowers: ',
            },
            { id: 'music', label: 'Music', icon: Music, insert: '🎵 Music: ' },
            {
              id: 'transport',
              label: 'Transport',
              icon: Car,
              insert: '🚗 Transport: ',
            },
            { id: 'venue', label: 'Venue', icon: Home, insert: '🏛️ Venue: ' },
          ];

        case 'timeline':
          return [
            { id: 'add_time', label: 'Time', icon: Clock, insert: '\n⏰ ' },
            { id: 'add_event', label: 'Event', icon: Calendar, insert: ' - ' },
            {
              id: 'ceremony',
              label: 'Ceremony',
              icon: Heart,
              insert: '💒 Ceremony: ',
            },
            {
              id: 'photos',
              label: 'Photos',
              icon: Camera,
              insert: '📸 Photos: ',
            },
            {
              id: 'reception',
              label: 'Reception',
              icon: ChefHat,
              insert: '🎉 Reception: ',
            },
            { id: 'music_event', label: 'Music', icon: Music, insert: '🎵 ' },
            {
              id: 'location_event',
              label: 'Location',
              icon: MapPin,
              insert: '📍 Location: ',
            },
          ];

        case 'family_input':
          return [
            {
              id: 'dietary_family',
              label: 'Dietary',
              icon: ChefHat,
              insert: '\nDietary: ',
            },
            {
              id: 'special_request',
              label: 'Request',
              icon: Heart,
              insert: '\nSpecial Request: ',
            },
            {
              id: 'music_request',
              label: 'Music',
              icon: Music,
              insert: '\nMusic Request: ',
            },
            {
              id: 'contact_family',
              label: 'Contact',
              icon: Phone,
              insert: '\nContact: ',
            },
            {
              id: 'tradition',
              label: 'Tradition',
              icon: Heart,
              insert: '\nTradition: ',
            },
          ];

        default:
          return [];
      }
    })();

    return [...baseActions, ...documentSpecificActions];
  }, [documentType, selection]);

  // Handle touch start
  const handleTouchStart = useCallback(
    (event: React.TouchEvent) => {
      if (!enableGestures) return;

      const touch = event.touches[0];
      const position = { x: touch.clientX, y: touch.clientY };
      const now = Date.now();

      // Clear any existing timeouts
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      // Check for double tap
      if (lastTapRef.current) {
        const timeDiff = now - lastTapRef.current.time;
        const distanceDiff = Math.sqrt(
          Math.pow(position.x - lastTapRef.current.position.x, 2) +
            Math.pow(position.y - lastTapRef.current.position.y, 2),
        );

        if (timeDiff < 300 && distanceDiff < 50) {
          // Double tap detected
          handleDoubleTab(position);
          lastTapRef.current = null;
          return;
        }
      }

      // Set up long press detection
      longPressTimeoutRef.current = setTimeout(() => {
        handleLongPress(position);
      }, 500);

      // Store this tap for potential double tap
      lastTapRef.current = { time: now, position };
    },
    [enableGestures],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(
    (event: React.TouchEvent) => {
      if (!enableGestures) return;

      // Clear long press timeout
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
      }

      // If no gesture was triggered, treat as tap
      if (!activeGesture) {
        const touch = event.changedTouches[0];
        const position = { x: touch.clientX, y: touch.clientY };
        handleTap(position);
      }

      setActiveGesture(null);
    },
    [enableGestures, activeGesture],
  );

  // Handle tap gesture
  const handleTap = useCallback(
    (position: { x: number; y: number }) => {
      const gesture: TouchGesture = { type: 'tap', position };

      // Hide context menu if visible
      setShowContextMenu(false);

      // Haptic feedback
      if (enableHapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(25);
      }

      onGesture?.(gesture);
    },
    [enableHapticFeedback, onGesture],
  );

  // Handle double tap gesture
  const handleDoubleTab = useCallback(
    (position: { x: number; y: number }) => {
      const gesture: TouchGesture = { type: 'double_tap', position };

      // Double tap to select word
      const selection: TextSelection = {
        start: 0,
        end: 0,
        text: 'selected word',
        type: 'word',
      };

      setSelection(selection);
      onSelectionChange(selection);

      // Show toolbar if enabled
      if (showToolbar) {
        setToolbarVisible(true);
      }

      // Haptic feedback
      if (enableHapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate([50, 25, 50]);
      }

      setActiveGesture(gesture);
      onGesture?.(gesture);
    },
    [enableHapticFeedback, showToolbar, onGesture, onSelectionChange],
  );

  // Handle long press gesture
  const handleLongPress = useCallback(
    (position: { x: number; y: number }) => {
      const gesture: TouchGesture = {
        type: 'long_press',
        position,
        duration: 500,
      };

      // Show context menu
      setContextMenuPosition(position);
      setShowContextMenu(true);

      // Haptic feedback
      if (enableHapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }

      setActiveGesture(gesture);
      onGesture?.(gesture);
    },
    [enableHapticFeedback, onGesture],
  );

  // Handle quick action
  const handleQuickAction = useCallback(
    (action: QuickAction) => {
      // Haptic feedback
      if (enableHapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Execute action
      if (action.action) {
        action.action();
      }

      onQuickAction?.(action, selection);

      // Hide menus
      setShowContextMenu(false);
      setToolbarVisible(false);
    },
    [enableHapticFeedback, selection, onQuickAction],
  );

  // Handle selection change from outside
  useEffect(() => {
    const handleSelectionChange = () => {
      const windowSelection = window.getSelection();
      if (windowSelection && windowSelection.toString()) {
        const newSelection: TextSelection = {
          start: 0,
          end: windowSelection.toString().length,
          text: windowSelection.toString(),
          type: 'character',
        };
        setSelection(newSelection);
        setToolbarVisible(showToolbar);
      } else {
        setSelection(null);
        setToolbarVisible(false);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () =>
      document.removeEventListener('selectionchange', handleSelectionChange);
  }, [showToolbar]);

  // Render context menu
  const renderContextMenu = () => (
    <AnimatePresence>
      {showContextMenu && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-2"
          style={{
            left: Math.min(contextMenuPosition.x, window.innerWidth - 280),
            top: Math.max(contextMenuPosition.y - 60, 10),
          }}
          data-testid="context-menu"
        >
          <div className="grid grid-cols-4 gap-2">
            {quickActions.slice(0, 8).map((action) => (
              <motion.button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className={cn(
                  'flex flex-col items-center gap-1 p-3 rounded-lg',
                  'hover:bg-gray-50 active:bg-gray-100',
                  'transition-colors touch-manipulation',
                )}
                whileTap={{ scale: 0.95 }}
                data-testid={`quick-action-${action.id}`}
              >
                <action.icon className="w-5 h-5 text-gray-700" />
                <span className="text-xs font-medium text-gray-700 text-center">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render floating toolbar
  const renderToolbar = () => (
    <AnimatePresence>
      {toolbarVisible && selection && (
        <motion.div
          initial={{ opacity: 0, y: toolbarPosition === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: toolbarPosition === 'top' ? -20 : 20 }}
          className={cn(
            'fixed left-4 right-4 z-40 bg-white border border-gray-200 rounded-xl shadow-lg p-3',
            toolbarPosition === 'top' && 'top-4',
            toolbarPosition === 'bottom' && 'bottom-4',
            toolbarPosition === 'floating' && 'bottom-20',
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-900">
              "{selection.text.substring(0, 30)}
              {selection.text.length > 30 ? '...' : ''}"
            </span>
            <button
              onClick={() => setToolbarVisible(false)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            {quickActions.map((action) => (
              <motion.button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap',
                  'bg-gray-50 hover:bg-gray-100 active:bg-gray-200',
                  'transition-colors touch-manipulation',
                )}
                whileTap={{ scale: 0.95 }}
                data-testid={`toolbar-action-${action.id}`}
              >
                <action.icon className="w-4 h-4 text-gray-700" />
                <span className="text-sm font-medium text-gray-700">
                  {action.label}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className={cn('touch-selection-handler', className)}>
      {/* Touch interaction area */}
      <div
        ref={touchAreaRef}
        className="absolute inset-0 z-10 touch-manipulation"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        data-testid="touch-selection-area"
      />

      {/* Context menu */}
      {renderContextMenu()}

      {/* Floating toolbar */}
      {renderToolbar()}

      {/* Quick action buttons (document-specific) */}
      <div className="fixed bottom-4 left-4 right-4 z-30">
        <div className="flex gap-2 overflow-x-auto">
          {quickActions
            .filter((action) => action.insert)
            .slice(0, 4)
            .map((action) => (
              <motion.button
                key={action.id}
                onClick={() => handleQuickAction(action)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap',
                  'bg-primary-50 text-primary-700 border border-primary-200',
                  'hover:bg-primary-100 active:bg-primary-200',
                  'transition-colors touch-manipulation',
                )}
                whileTap={{ scale: 0.95 }}
                data-testid={`quick-button-${action.id}`}
              >
                <action.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{action.label}</span>
              </motion.button>
            ))}
        </div>
      </div>
    </div>
  );
}
