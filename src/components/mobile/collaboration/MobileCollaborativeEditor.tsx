'use client';

/**
 * MobileCollaborativeEditor - Mobile-first real-time collaborative editing
 * WS-244 Team D - Mobile-First Real-Time Collaboration System
 *
 * Features:
 * - Touch-optimized collaborative editing with Y.js CRDT
 * - Mobile keyboard handling and viewport adaptation
 * - Wedding industry document types (guest_list, vendor_selection, timeline, family_input)
 * - Auto-save every 5 seconds with visual feedback
 * - Offline-capable with local persistence
 * - Real-time presence and collaborative cursors
 */

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  startTransition,
  useDeferredValue,
} from 'react';
import { useActionState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Save,
  Wifi,
  WifiOff,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Keyboard,
  Eye,
  EyeOff,
} from 'lucide-react';

// Wedding-specific document types
type DocumentType =
  | 'guest_list'
  | 'vendor_selection'
  | 'timeline'
  | 'family_input';

interface MobileCollaborativeEditorProps {
  documentId: string;
  documentType: DocumentType;
  weddingId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  initialContent?: string;
  onSave?: (content: string, yDocState: Uint8Array) => void;
  onError?: (error: string) => void;
  className?: string;
  readOnly?: boolean;
  placeholder?: string;
  maxLength?: number;
  enableVoiceInput?: boolean;
  enableHapticFeedback?: boolean;
}

interface SaveState {
  success: boolean;
  error?: string;
  version?: number;
  timestamp?: string;
}

// Server action for saving collaborative content
async function saveCollaborativeContent(
  prevState: SaveState,
  formData: FormData,
): Promise<SaveState> {
  try {
    const content = formData.get('content') as string;
    const documentId = formData.get('documentId') as string;
    const weddingId = formData.get('weddingId') as string;
    const yDocState = formData.get('yDocState') as string;

    const response = await fetch('/api/collaboration/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
        documentId,
        weddingId,
        yDocState,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error };
    }

    const result = await response.json();
    return {
      success: true,
      version: result.document.version,
      timestamp: result.document.updated_at,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Save failed',
    };
  }
}

export function MobileCollaborativeEditor({
  documentId,
  documentType,
  weddingId,
  userId,
  userName,
  userAvatar,
  initialContent = '',
  onSave,
  onError,
  className,
  readOnly = false,
  placeholder,
  maxLength = 50000,
  enableVoiceInput = true,
  enableHapticFeedback = true,
}: MobileCollaborativeEditorProps) {
  // React 19 useActionState for form handling
  const [saveState, saveAction, isPendingSave] = useActionState(
    saveCollaborativeContent,
    { success: false },
  );

  // Y.js document and providers
  const [yDoc] = useState(() => new Y.Doc());
  const [yText] = useState(() => yDoc.getText('content'));
  const [wsProvider, setWsProvider] = useState<WebsocketProvider | null>(null);
  const [indexeddbProvider] = useState(
    () => new IndexeddbPersistence(`wedsync-collab-${documentId}`, yDoc),
  );

  // Component state
  const [content, setContent] = useState(initialContent);
  const [isConnected, setIsConnected] = useState(navigator.onLine);
  const [collaborators, setCollaborators] = useState<Map<string, any>>(
    new Map(),
  );
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef(initialContent);

  // Deferred values for performance
  const deferredContent = useDeferredValue(content);

  // Wedding-specific placeholders
  const getPlaceholder = useCallback(() => {
    if (placeholder) return placeholder;

    switch (documentType) {
      case 'guest_list':
        return 'Guest List - Add names, RSVP status, dietary requirements...\n\nExample:\n1. John & Jane Smith - Confirmed\n   Dietary: Vegetarian\n   Table: 5';
      case 'vendor_selection':
        return 'Vendor Selection - Compare options, pricing, notes...\n\nPhotographer:\n- Option 1: Studio Name (£2,500)\n- Option 2: Another Studio (£3,200)';
      case 'timeline':
        return 'Wedding Timeline - Schedule your perfect day...\n\n9:00 AM - Bridal preparation begins\n1:00 PM - First look photos\n3:00 PM - Ceremony starts';
      case 'family_input':
        return 'Family Input - Special requests, dietary needs, traditions...\n\nDietary Requirements:\n- Aunt Sarah: Vegetarian\n\nSpecial Requests:\n- Family photo before ceremony';
      default:
        return 'Start collaborating on your wedding document...';
    }
  }, [documentType, placeholder]);

  // Initialize Y.js providers and sync
  useEffect(() => {
    // Set initial content if Y.js document is empty
    if (yText.length === 0 && initialContent) {
      yText.insert(0, initialContent);
    }

    // Initialize WebSocket provider for real-time sync
    const wsUrl = `ws://localhost:1234/${documentId}`;
    const provider = new WebsocketProvider(wsUrl, documentId, yDoc);
    setWsProvider(provider);

    // Set up awareness (user presence)
    provider.awareness.setLocalState({
      userId,
      userName,
      userAvatar,
      documentType,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      cursor: null,
    });

    // Handle connection status
    provider.on('status', (event: { status: string }) => {
      setIsConnected(event.status === 'connected');
    });

    // Handle awareness changes (other users)
    provider.awareness.on('change', () => {
      const states = provider.awareness.getStates();
      setCollaborators(new Map(states));
    });

    // Sync Y.js content with local state
    const syncContent = () => {
      const yjsContent = yText.toString();
      if (yjsContent !== lastContentRef.current) {
        setContent(yjsContent);
        lastContentRef.current = yjsContent;
      }
    };

    // Listen for Y.js changes
    yText.observe(syncContent);
    syncContent(); // Initial sync

    // Network status listeners
    const handleOnline = () => {
      setIsConnected(true);
      provider.connect();
    };

    const handleOffline = () => {
      setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      provider.awareness.off('change', () => {});
      provider.off('status', () => {});
      yText.unobserve(syncContent);
      provider.destroy();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [
    documentId,
    yDoc,
    yText,
    userId,
    userName,
    userAvatar,
    documentType,
    initialContent,
  ]);

  // Handle virtual keyboard visibility (mobile)
  useEffect(() => {
    const handleViewportChange = () => {
      if (window.visualViewport) {
        const isKeyboardVisible =
          window.visualViewport.height < window.innerHeight * 0.75;
        setKeyboardVisible(isKeyboardVisible);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () =>
        window.visualViewport?.removeEventListener(
          'resize',
          handleViewportChange,
        );
    }
  }, []);

  // Auto-save functionality
  useEffect(() => {
    if (isDirty && !isPendingSave) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      // Set new auto-save timeout (5 seconds)
      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 5000);
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [isDirty, isPendingSave]);

  // Handle auto-save
  const handleAutoSave = useCallback(async () => {
    if (!isDirty || isPendingSave) return;

    setIsAutoSaving(true);

    try {
      const formData = new FormData();
      formData.append('content', content);
      formData.append('documentId', documentId);
      formData.append('weddingId', weddingId);
      formData.append(
        'yDocState',
        Buffer.from(Y.encodeStateAsUpdate(yDoc)).toString('base64'),
      );

      await saveAction(formData);

      setIsDirty(false);
      setLastSaved(new Date());

      // Haptic feedback on successful save
      if (enableHapticFeedback && 'vibrate' in navigator) {
        navigator.vibrate(50);
      }

      // Callback
      if (onSave) {
        onSave(content, Y.encodeStateAsUpdate(yDoc));
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Auto-save failed';
      onError?.(errorMessage);
    } finally {
      setIsAutoSaving(false);
    }
  }, [
    isDirty,
    isPendingSave,
    content,
    documentId,
    weddingId,
    yDoc,
    saveAction,
    onSave,
    onError,
    enableHapticFeedback,
  ]);

  // Handle content changes
  const handleContentChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = event.target.value;

      // Length limit check
      if (maxLength && newContent.length > maxLength) {
        return;
      }

      // Update Y.js document in a transaction
      yDoc.transact(() => {
        const currentContent = yText.toString();
        if (newContent !== currentContent) {
          yText.delete(0, currentContent.length);
          yText.insert(0, newContent);
        }
      });

      setContent(newContent);
      setIsDirty(true);
      lastContentRef.current = newContent;

      // Update cursor position in awareness
      if (wsProvider?.awareness) {
        const { selectionStart, selectionEnd } = event.target;
        wsProvider.awareness.setLocalState({
          ...wsProvider.awareness.getLocalState(),
          cursor: { start: selectionStart, end: selectionEnd },
        });
      }
    },
    [yDoc, yText, maxLength, wsProvider],
  );

  // Handle selection changes
  const handleSelectionChange = useCallback(
    (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const target = event.target as HTMLTextAreaElement;
      setSelectionStart(target.selectionStart);
      setSelectionEnd(target.selectionEnd);

      // Update awareness with cursor position
      if (wsProvider?.awareness) {
        wsProvider.awareness.setLocalState({
          ...wsProvider.awareness.getLocalState(),
          cursor: { start: target.selectionStart, end: target.selectionEnd },
        });
      }
    },
    [wsProvider],
  );

  // Handle focus events
  const handleFocus = useCallback(() => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(25);
    }
  }, [enableHapticFeedback]);

  // Status indicators
  const getStatusIndicator = useMemo(() => {
    if (isAutoSaving || isPendingSave) {
      return { icon: Clock, text: 'Auto-saving...', color: 'text-warning-600' };
    }
    if (!isConnected) {
      return {
        icon: WifiOff,
        text: 'Offline - Changes saved locally',
        color: 'text-error-600',
      };
    }
    if (lastSaved) {
      return {
        icon: CheckCircle,
        text: `Saved ${lastSaved.toLocaleTimeString()}`,
        color: 'text-success-600',
      };
    }
    return { icon: Wifi, text: 'Connected', color: 'text-success-600' };
  }, [isAutoSaving, isPendingSave, isConnected, lastSaved]);

  const StatusIcon = getStatusIndicator.icon;

  return (
    <div
      className={cn(
        'mobile-collaborative-editor relative w-full',
        keyboardVisible && 'keyboard-visible',
        focusMode && 'focus-mode',
        className,
      )}
      data-testid="mobile-collaborative-editor"
    >
      {/* Mobile toolbar */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn('w-4 h-4', getStatusIndicator.color)} />
          <span className={cn('text-sm font-medium', getStatusIndicator.color)}>
            {getStatusIndicator.text}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Collaborators count */}
          {collaborators.size > 1 && (
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-600">
                {collaborators.size - 1}
              </span>
            </div>
          )}

          {/* Focus mode toggle */}
          <button
            onClick={() => setFocusMode(!focusMode)}
            className="p-1 rounded-lg hover:bg-gray-200 transition-colors"
            title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
          >
            {focusMode ? (
              <EyeOff className="w-4 h-4 text-gray-600" />
            ) : (
              <Eye className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Character count (mobile-friendly) */}
      {maxLength && (
        <div className="px-3 py-1 bg-gray-25 border-b border-gray-200">
          <div className="text-xs text-gray-500 text-right">
            {content.length.toLocaleString()} / {maxLength.toLocaleString()}
            {content.length > maxLength * 0.9 && (
              <span className="ml-1 text-warning-600">
                ({maxLength - content.length} remaining)
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main editor */}
      <div className="relative">
        <form action={saveAction}>
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="weddingId" value={weddingId} />
          <input
            type="hidden"
            name="yDocState"
            value={Buffer.from(Y.encodeStateAsUpdate(yDoc)).toString('base64')}
          />

          <textarea
            ref={textareaRef}
            name="content"
            value={deferredContent}
            onChange={handleContentChange}
            onSelect={handleSelectionChange}
            onFocus={handleFocus}
            placeholder={getPlaceholder()}
            readOnly={readOnly}
            className={cn(
              // Base styles
              'w-full min-h-[400px] p-4 resize-none',
              'bg-white border-0 outline-none',
              'text-gray-900 text-base leading-relaxed',
              'placeholder:text-gray-400',

              // Mobile optimizations
              'touch-manipulation',
              'selection:bg-primary-100 selection:text-primary-900',

              // Focus mode
              focusMode && 'min-h-[calc(100vh-200px)]',

              // Keyboard visible
              keyboardVisible && 'min-h-[250px]',

              // Read-only state
              readOnly && 'bg-gray-50 text-gray-700',
            )}
            data-testid="collaborative-editor-textarea"
            spellCheck="true"
            autoCapitalize="sentences"
            autoCorrect="on"
            autoComplete="off"
            rows={focusMode ? 25 : 12}
          />
        </form>

        {/* Collaborative cursors overlay */}
        {collaborators.size > 1 && (
          <div className="absolute inset-0 pointer-events-none">
            {Array.from(collaborators.entries())
              .filter(([id, state]) => id !== userId && state.cursor)
              .map(([id, state]) => (
                <motion.div
                  key={id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute"
                  style={{
                    left: `${(state.cursor.start / content.length) * 100}%`,
                    top: `${Math.floor(state.cursor.start / 80) * 24}px`,
                    borderColor: state.color,
                  }}
                  data-testid={`collaborative-cursor-${state.userName?.toLowerCase().replace(' ', '')}`}
                >
                  <div
                    className="w-0.5 h-5 bg-current animate-pulse"
                    style={{ backgroundColor: state.color }}
                  />
                  <div
                    className="absolute top-0 left-1 px-1 py-0.5 text-xs text-white rounded whitespace-nowrap"
                    style={{ backgroundColor: state.color }}
                  >
                    {state.userName}
                  </div>
                </motion.div>
              ))}
          </div>
        )}

        {/* Mobile-specific loading overlay */}
        <AnimatePresence>
          {(isAutoSaving || isPendingSave) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/80 flex items-center justify-center"
            >
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Clock className="w-5 h-5 text-primary-600" />
                </motion.div>
                <span className="text-sm font-medium text-gray-900">
                  Saving...
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile footer with quick stats */}
      {!focusMode && (
        <div className="flex items-center justify-between p-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
          <div>
            {documentType
              .replace('_', ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase())}{' '}
            Document
          </div>
          <div className="flex items-center gap-3">
            <span>{content.split('\n').length} lines</span>
            <span>
              {content.split(/\s+/).filter((w) => w.length > 0).length} words
            </span>
            {isConnected && <span className="text-success-600">● Online</span>}
          </div>
        </div>
      )}

      {/* Error display */}
      {saveState.error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute bottom-4 left-4 right-4 p-3 bg-error-50 border border-error-200 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-error-600" />
            <span className="text-sm text-error-800">{saveState.error}</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
