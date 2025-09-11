'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  WifiOffIcon,
  WifiIcon,
  SaveIcon,
  UndoIcon,
  RedoIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  RefreshCwIcon,
  UploadCloudIcon,
  XMarkIcon,
  PlusIcon,
  MinusIcon,
  EditIcon,
} from 'lucide-react';
import {
  TouchInput,
  TouchTextarea,
  TouchSelect,
} from '@/components/touch/TouchInput';
import { useToast } from '@/components/ui/use-toast';
import { useWeddingDayOffline } from '@/hooks/useWeddingDayOffline';
import { cn } from '@/lib/utils';

// Types
interface PhotoGroup {
  id: string;
  name: string;
  description: string;
  maxGuests?: number;
  estimatedTime: string;
  priority: 'high' | 'medium' | 'low';
  venue?: string;
  timeSlot?: string;
  assignedGuests: Array<{
    id: string;
    name: string;
    relationship: string;
  }>;
  photoStyle?: string;
  specialInstructions?: string;
  lastModified: string;
  version: number;
}

interface OfflineChange {
  id: string;
  type: 'create' | 'update' | 'delete';
  timestamp: string;
  data: Partial<PhotoGroup>;
  synced: boolean;
}

interface HistoryState {
  id: string;
  data: PhotoGroup;
  timestamp: string;
  description: string;
}

interface OfflinePhotoGroupEditorProps {
  photoGroupId: string;
  weddingId: string;
  onSave?: (photoGroup: PhotoGroup) => Promise<void>;
  onCancel?: () => void;
  isReadOnly?: boolean;
}

// Local Storage Keys
const STORAGE_KEYS = {
  DRAFTS: 'wedme_photo_group_drafts',
  CHANGES: 'wedme_pending_changes',
  HISTORY: 'wedme_edit_history',
} as const;

// Auto-save interval (3 seconds)
const AUTO_SAVE_INTERVAL = 3000;

export function OfflinePhotoGroupEditor({
  photoGroupId,
  weddingId,
  onSave,
  onCancel,
  isReadOnly = false,
}: OfflinePhotoGroupEditorProps) {
  const [photoGroup, setPhotoGroup] = useState<PhotoGroup | null>(null);
  const [lastSavedData, setLastSavedData] = useState<PhotoGroup | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pendingChanges, setPendingChanges] = useState<OfflineChange[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictData, setConflictData] = useState<PhotoGroup | null>(null);

  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  // Enhanced offline support
  const offlineHook = useWeddingDayOffline({
    weddingId,
    coordinatorId: 'current-user',
    enablePreCaching: true,
    enablePerformanceOptimization: true,
  });

  // Load data from various sources
  const loadPhotoGroupData = useCallback(async () => {
    try {
      // First, try to load from draft
      const drafts = localStorage.getItem(STORAGE_KEYS.DRAFTS);
      if (drafts) {
        const parsedDrafts = JSON.parse(drafts);
        const draft = parsedDrafts[photoGroupId];
        if (draft && draft.lastModified) {
          setPhotoGroup(draft);
          setLastSavedData({ ...draft });
          return;
        }
      }

      // Mock loading from API/cache (would be actual API call)
      const mockData: PhotoGroup = {
        id: photoGroupId,
        name: 'Family Portraits',
        description: 'Immediate family group shots',
        maxGuests: 12,
        estimatedTime: '30 min',
        priority: 'high',
        venue: 'Main Garden',
        timeSlot: '2:00 PM - 2:30 PM',
        assignedGuests: [
          { id: '1', name: 'John Doe', relationship: 'Father' },
          { id: '2', name: 'Jane Doe', relationship: 'Mother' },
        ],
        photoStyle: 'Traditional',
        specialInstructions: 'Please ensure good natural lighting',
        lastModified: new Date().toISOString(),
        version: 1,
      };

      setPhotoGroup(mockData);
      setLastSavedData({ ...mockData });
    } catch (error) {
      toast({
        title: 'Failed to load photo group',
        description: 'Working with cached version',
        variant: 'destructive',
      });
    }
  }, [photoGroupId, toast]);

  // Initialize editor
  useEffect(() => {
    loadPhotoGroupData();

    // Load pending changes and history
    const changes = localStorage.getItem(STORAGE_KEYS.CHANGES);
    if (changes) {
      setPendingChanges(
        JSON.parse(changes).filter((c: OfflineChange) => !c.synced),
      );
    }

    const historyData = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (historyData) {
      const parsedHistory = JSON.parse(historyData);
      const groupHistory = parsedHistory[photoGroupId] || [];
      setHistory(groupHistory);
      setHistoryIndex(groupHistory.length - 1);
    }
  }, [loadPhotoGroupData, photoGroupId]);

  // Auto-save functionality
  const saveToLocalStorage = useCallback(
    (data: PhotoGroup) => {
      try {
        // Save as draft
        const drafts = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.DRAFTS) || '{}',
        );
        drafts[photoGroupId] = {
          ...data,
          lastModified: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));

        // Add to pending changes if online status requires it
        if (!offlineHook.isOnline || hasUnsavedChanges) {
          const change: OfflineChange = {
            id: `${photoGroupId}_${Date.now()}`,
            type: 'update',
            timestamp: new Date().toISOString(),
            data: data,
            synced: false,
          };

          const existingChanges = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.CHANGES) || '[]',
          );
          const updatedChanges = [...existingChanges, change];
          localStorage.setItem(
            STORAGE_KEYS.CHANGES,
            JSON.stringify(updatedChanges),
          );
          setPendingChanges(updatedChanges.filter((c) => !c.synced));
        }

        setLastSaved(new Date());
        setHasUnsavedChanges(false);

        toast({
          title: offlineHook.isOnline ? 'Auto-saved' : 'Saved offline',
          description: `Changes saved ${offlineHook.isOnline ? 'to cloud' : 'locally'}`,
        });
      } catch (error) {
        toast({
          title: 'Save failed',
          description: 'Unable to save changes locally',
          variant: 'destructive',
        });
      }
    },
    [photoGroupId, offlineHook.isOnline, hasUnsavedChanges, toast],
  );

  // Add to history
  const addToHistory = useCallback(
    (data: PhotoGroup, description: string) => {
      const historyState: HistoryState = {
        id: `${photoGroupId}_${Date.now()}`,
        data: { ...data },
        timestamp: new Date().toISOString(),
        description,
      };

      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(historyState);

        // Limit history to last 20 items
        const limitedHistory = newHistory.slice(-20);

        // Save to localStorage
        const allHistory = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.HISTORY) || '{}',
        );
        allHistory[photoGroupId] = limitedHistory;
        localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(allHistory));

        return limitedHistory;
      });

      setHistoryIndex((prev) => Math.min(prev + 1, 19)); // Max 20 items
    },
    [photoGroupId, historyIndex],
  );

  // Update photo group with auto-save
  const updatePhotoGroup = useCallback(
    (updates: Partial<PhotoGroup>, description?: string) => {
      if (!photoGroup || isReadOnly) return;

      const updatedGroup = {
        ...photoGroup,
        ...updates,
        version: photoGroup.version + 1,
        lastModified: new Date().toISOString(),
      };

      setPhotoGroup(updatedGroup);
      setHasUnsavedChanges(true);

      // Add to history if significant change
      if (description) {
        addToHistory(updatedGroup, description);
      }

      // Clear existing timeout and set new one for auto-save
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        saveToLocalStorage(updatedGroup);
      }, AUTO_SAVE_INTERVAL);
    },
    [photoGroup, isReadOnly, addToHistory, saveToLocalStorage],
  );

  // Manual save
  const handleSave = useCallback(async () => {
    if (!photoGroup || isSaving) return;

    setIsSaving(true);

    try {
      if (offlineHook.isOnline && onSave) {
        await onSave(photoGroup);

        // Clear from drafts and pending changes
        const drafts = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.DRAFTS) || '{}',
        );
        delete drafts[photoGroupId];
        localStorage.setItem(STORAGE_KEYS.DRAFTS, JSON.stringify(drafts));

        const changes = JSON.parse(
          localStorage.getItem(STORAGE_KEYS.CHANGES) || '[]',
        );
        const updatedChanges = changes.map((c: OfflineChange) =>
          c.data.id === photoGroupId ? { ...c, synced: true } : c,
        );
        localStorage.setItem(
          STORAGE_KEYS.CHANGES,
          JSON.stringify(updatedChanges),
        );
        setPendingChanges(updatedChanges.filter((c) => !c.synced));

        setLastSavedData({ ...photoGroup });
        setHasUnsavedChanges(false);

        toast({
          title: 'Saved successfully',
          description: 'Photo group updated in the cloud',
        });
      } else {
        // Offline save
        saveToLocalStorage(photoGroup);
      }
    } catch (error) {
      toast({
        title: 'Save failed',
        description: "Changes saved locally for when you're back online",
        variant: 'destructive',
      });

      // Still save locally as fallback
      saveToLocalStorage(photoGroup);
    } finally {
      setIsSaving(false);
    }
  }, [
    photoGroup,
    isSaving,
    offlineHook.isOnline,
    onSave,
    photoGroupId,
    saveToLocalStorage,
    toast,
  ]);

  // Undo/Redo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setPhotoGroup(previousState.data);
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);

      toast({
        title: 'Undone',
        description: previousState.description,
      });
    }
  }, [history, historyIndex, toast]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setPhotoGroup(nextState.data);
      setHistoryIndex(historyIndex + 1);
      setHasUnsavedChanges(true);

      toast({
        title: 'Redone',
        description: nextState.description,
      });
    }
  }, [history, historyIndex, toast]);

  // Sync pending changes when online
  useEffect(() => {
    if (offlineHook.isOnline && pendingChanges.length > 0) {
      // Auto-sync pending changes
      const syncChanges = async () => {
        try {
          // Mock sync process - would be actual API calls
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Mark all changes as synced
          const changes = JSON.parse(
            localStorage.getItem(STORAGE_KEYS.CHANGES) || '[]',
          );
          const updatedChanges = changes.map((c: OfflineChange) => ({
            ...c,
            synced: true,
          }));
          localStorage.setItem(
            STORAGE_KEYS.CHANGES,
            JSON.stringify(updatedChanges),
          );
          setPendingChanges([]);

          toast({
            title: 'Synced',
            description: `${pendingChanges.length} changes synced to cloud`,
          });
        } catch (error) {
          toast({
            title: 'Sync failed',
            description: 'Will retry when connection improves',
            variant: 'destructive',
          });
        }
      };

      syncChanges();
    }
  }, [offlineHook.isOnline, pendingChanges.length, toast]);

  // Cleanup auto-save timeout
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);

  if (!photoGroup) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
          <p className="text-gray-600">Loading photo group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Status */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-gray-900">
                Edit Photo Group
              </h1>
              {isReadOnly && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  Read Only
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {/* Online/Offline Status */}
              <div
                className={cn(
                  'flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full',
                  offlineHook.isOnline
                    ? 'bg-success-50 text-success-700 border border-success-200'
                    : 'bg-warning-50 text-warning-700 border border-warning-200',
                )}
              >
                {offlineHook.isOnline ? (
                  <>
                    <WifiIcon className="w-3 h-3" />
                    <span>Online</span>
                  </>
                ) : (
                  <>
                    <WifiOffIcon className="w-3 h-3" />
                    <span>Offline</span>
                  </>
                )}
              </div>

              {/* Pending Changes */}
              {pendingChanges.length > 0 && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full border border-primary-200">
                  <UploadCloudIcon className="w-3 h-3" />
                  <span>{pendingChanges.length} pending</span>
                </div>
              )}

              {/* Unsaved Changes */}
              {hasUnsavedChanges && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                  <ClockIcon className="w-3 h-3" />
                  <span>Unsaved</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Undo/Redo */}
              <button
                onClick={undo}
                disabled={historyIndex <= 0 || isReadOnly}
                className={cn(
                  'p-2 rounded-lg text-gray-500 touch-manipulation',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'enabled:hover:bg-gray-100',
                )}
                title="Undo"
              >
                <UndoIcon className="w-4 h-4" />
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1 || isReadOnly}
                className={cn(
                  'p-2 rounded-lg text-gray-500 touch-manipulation',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'enabled:hover:bg-gray-100',
                )}
                title="Redo"
              >
                <RedoIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Save Status */}
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              {lastSaved && (
                <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
              )}
              {isSaving && (
                <div className="flex items-center space-x-1">
                  <RefreshCwIcon className="w-3 h-3 animate-spin" />
                  <span>Saving...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Offline Banner */}
      {!offlineHook.isOnline && (
        <div className="bg-warning-50 border-b border-warning-200 px-4 py-2">
          <div className="flex items-center space-x-2 text-sm text-warning-700">
            <WifiOffIcon className="w-4 h-4" />
            <span>
              You're working offline. Changes will sync when you're back online.
            </span>
          </div>
        </div>
      )}

      {/* Editor Form */}
      <div className="p-4 space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">
            Basic Information
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Group Name *
              </label>
              <TouchInput
                value={photoGroup.name}
                onChange={(e) =>
                  updatePhotoGroup(
                    { name: e.target.value },
                    'Updated group name',
                  )
                }
                placeholder="e.g., Family Portraits"
                disabled={isReadOnly}
                className="w-full"
                size="md"
                preventZoom={true}
                touchOptimized={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Description
              </label>
              <TouchTextarea
                value={photoGroup.description}
                onChange={(e) =>
                  updatePhotoGroup(
                    { description: e.target.value },
                    'Updated description',
                  )
                }
                placeholder="Describe the photo group..."
                disabled={isReadOnly}
                className="w-full"
                rows={3}
                preventZoom={true}
                touchOptimized={true}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Priority
                </label>
                <TouchSelect
                  value={photoGroup.priority}
                  onChange={(e) =>
                    updatePhotoGroup(
                      { priority: e.target.value as 'high' | 'medium' | 'low' },
                      'Updated priority',
                    )
                  }
                  disabled={isReadOnly}
                  className="w-full"
                  preventZoom={true}
                  touchOptimized={true}
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="low">Low Priority</option>
                </TouchSelect>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Estimated Time
                </label>
                <TouchInput
                  value={photoGroup.estimatedTime}
                  onChange={(e) =>
                    updatePhotoGroup(
                      { estimatedTime: e.target.value },
                      'Updated estimated time',
                    )
                  }
                  placeholder="e.g., 30 min"
                  disabled={isReadOnly}
                  className="w-full"
                  size="md"
                  preventZoom={true}
                  touchOptimized={true}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Location & Timing */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">
            Location & Timing
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Venue
              </label>
              <TouchInput
                value={photoGroup.venue || ''}
                onChange={(e) =>
                  updatePhotoGroup({ venue: e.target.value }, 'Updated venue')
                }
                placeholder="e.g., Main Garden"
                disabled={isReadOnly}
                className="w-full"
                size="md"
                preventZoom={true}
                touchOptimized={true}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Time Slot
              </label>
              <TouchInput
                value={photoGroup.timeSlot || ''}
                onChange={(e) =>
                  updatePhotoGroup(
                    { timeSlot: e.target.value },
                    'Updated time slot',
                  )
                }
                placeholder="e.g., 2:00 PM - 2:30 PM"
                disabled={isReadOnly}
                className="w-full"
                size="md"
                preventZoom={true}
                touchOptimized={true}
              />
            </div>
          </div>
        </div>

        {/* Photo Style & Instructions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
          <h2 className="text-lg font-medium text-gray-900">
            Photo Style & Instructions
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Photo Style
              </label>
              <TouchSelect
                value={photoGroup.photoStyle || ''}
                onChange={(e) =>
                  updatePhotoGroup(
                    { photoStyle: e.target.value },
                    'Updated photo style',
                  )
                }
                disabled={isReadOnly}
                className="w-full"
                preventZoom={true}
                touchOptimized={true}
              >
                <option value="">Select style...</option>
                <option value="Traditional">Traditional</option>
                <option value="Candid">Candid</option>
                <option value="Artistic">Artistic</option>
                <option value="Documentary">Documentary</option>
              </TouchSelect>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Special Instructions
              </label>
              <TouchTextarea
                value={photoGroup.specialInstructions || ''}
                onChange={(e) =>
                  updatePhotoGroup(
                    { specialInstructions: e.target.value },
                    'Updated special instructions',
                  )
                }
                placeholder="Any special instructions for the photographer..."
                disabled={isReadOnly}
                className="w-full"
                rows={4}
                preventZoom={true}
                touchOptimized={true}
              />
            </div>
          </div>
        </div>

        {/* Assigned Guests Preview */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-900">
              Assigned Guests
            </h2>
            <span className="text-sm text-gray-500">
              {photoGroup.assignedGuests.length} guest
              {photoGroup.assignedGuests.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-2">
            {photoGroup.assignedGuests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-medium">
                  {guest.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">
                    {guest.name}
                  </p>
                  <p className="text-xs text-gray-500">{guest.relationship}</p>
                </div>
              </div>
            ))}

            {photoGroup.assignedGuests.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">No guests assigned yet</p>
                <p className="text-xs mt-1">
                  Use the guest assignment tool to add guests
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-lg font-medium touch-manipulation hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || isReadOnly}
            className={cn(
              'flex-1 py-3 px-4 rounded-lg font-medium touch-manipulation',
              'flex items-center justify-center space-x-2',
              'transition-colors',
              isSaving || isReadOnly
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : hasUnsavedChanges
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-success-600 text-white hover:bg-success-700',
            )}
          >
            {isSaving ? (
              <>
                <RefreshCwIcon className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <SaveIcon className="w-4 h-4" />
                <span>
                  {offlineHook.isOnline ? 'Save Changes' : 'Save Offline'}
                </span>
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>Saved</span>
              </>
            )}
          </button>
        </div>

        {/* Save Status */}
        <div className="mt-2 text-center text-xs text-gray-500">
          {hasUnsavedChanges && (
            <span>Auto-save in {AUTO_SAVE_INTERVAL / 1000} seconds</span>
          )}
          {lastSaved && !hasUnsavedChanges && (
            <span>Last saved: {lastSaved.toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Development Debug Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded max-w-xs z-30">
          <div>Online: {offlineHook.isOnline ? '✅' : '❌'}</div>
          <div>Unsaved: {hasUnsavedChanges ? '⚠️' : '✅'}</div>
          <div>Pending: {pendingChanges.length}</div>
          <div>
            History: {historyIndex + 1}/{history.length}
          </div>
          <div>Version: {photoGroup.version}</div>
        </div>
      )}
    </div>
  );
}
