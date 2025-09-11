'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { ClientData } from '../ClientListViews';

interface BulkSelectionContextType {
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  lastSelectedIndex: number | null;
  toggleSelection: (id: string, index?: number) => void;
  selectRange: (
    fromIndex: number,
    toIndex: number,
    clients: ClientData[],
  ) => void;
  selectAll: (clients: ClientData[]) => void;
  clearSelection: () => void;
  enterSelectionMode: () => void;
  exitSelectionMode: () => void;
  isSelected: (id: string) => boolean;
  getSelectedClients: (clients: ClientData[]) => ClientData[];
  selectionCount: number;
}

const BulkSelectionContext = createContext<
  BulkSelectionContextType | undefined
>(undefined);

interface BulkSelectionProviderProps {
  children: ReactNode;
  onSelectionChange?: (selectedIds: string[]) => void;
  maxSelection?: number;
}

export function BulkSelectionProvider({
  children,
  onSelectionChange,
  maxSelection = 10000,
}: BulkSelectionProviderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  // Toggle single selection
  const toggleSelection = useCallback(
    (id: string, index?: number) => {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);

        if (newSet.has(id)) {
          newSet.delete(id);

          // Exit selection mode if no items selected
          if (newSet.size === 0) {
            setIsSelectionMode(false);
            setLastSelectedIndex(null);
          }
        } else {
          // Check max selection limit
          if (newSet.size >= maxSelection) {
            console.warn(`Maximum selection limit (${maxSelection}) reached`);
            return prev;
          }

          newSet.add(id);

          // Enter selection mode on first selection
          if (!isSelectionMode) {
            setIsSelectionMode(true);
          }
        }

        // Update last selected index for range selection
        if (index !== undefined) {
          setLastSelectedIndex(index);
        }

        return newSet;
      });
    },
    [isSelectionMode, maxSelection],
  );

  // Select range (for shift+click on desktop or swipe on mobile)
  const selectRange = useCallback(
    (fromIndex: number, toIndex: number, clients: ClientData[]) => {
      const start = Math.min(fromIndex, toIndex);
      const end = Math.max(fromIndex, toIndex);

      setSelectedIds((prev) => {
        const newSet = new Set(prev);

        for (let i = start; i <= end; i++) {
          if (clients[i] && newSet.size < maxSelection) {
            newSet.add(clients[i].id);
          }
        }

        if (newSet.size > 0) {
          setIsSelectionMode(true);
        }

        return newSet;
      });

      setLastSelectedIndex(toIndex);
    },
    [maxSelection],
  );

  // Select all
  const selectAll = useCallback(
    (clients: ClientData[]) => {
      const limitedClients = clients.slice(0, maxSelection);
      setSelectedIds(new Set(limitedClients.map((c) => c.id)));
      setIsSelectionMode(true);

      if (clients.length > maxSelection) {
        console.warn(
          `Selected first ${maxSelection} of ${clients.length} clients due to limit`,
        );
      }
    },
    [maxSelection],
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setIsSelectionMode(false);
    setLastSelectedIndex(null);
  }, []);

  // Enter/exit selection mode
  const enterSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    clearSelection();
  }, [clearSelection]);

  // Check if item is selected
  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id);
    },
    [selectedIds],
  );

  // Get selected clients
  const getSelectedClients = useCallback(
    (clients: ClientData[]) => {
      return clients.filter((client) => selectedIds.has(client.id));
    },
    [selectedIds],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + A to select all
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && isSelectionMode) {
        e.preventDefault();
        // Would need clients array passed in to select all
      }

      // Escape to clear selection
      if (e.key === 'Escape' && isSelectionMode) {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, clearSelection]);

  // Touch gesture support for mobile
  useEffect(() => {
    let touchStartY = 0;
    let touchStartTime = 0;
    let isSwipeSelecting = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (!isSelectionMode) return;

      touchStartY = e.touches[0].clientY;
      touchStartTime = Date.now();
      isSwipeSelecting = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isSelectionMode) return;

      const touchY = e.touches[0].clientY;
      const deltaY = Math.abs(touchY - touchStartY);
      const deltaTime = Date.now() - touchStartTime;

      // Detect swipe gesture (moved >50px in <500ms)
      if (deltaY > 50 && deltaTime < 500 && !isSwipeSelecting) {
        isSwipeSelecting = true;
        // Trigger haptic feedback if available
        if ('vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    };

    const handleTouchEnd = () => {
      isSwipeSelecting = false;
    };

    if ('ontouchstart' in window) {
      window.addEventListener('touchstart', handleTouchStart);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('touchstart', handleTouchStart);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isSelectionMode]);

  const value: BulkSelectionContextType = {
    selectedIds,
    isSelectionMode,
    lastSelectedIndex,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    enterSelectionMode,
    exitSelectionMode,
    isSelected,
    getSelectedClients,
    selectionCount: selectedIds.size,
  };

  return (
    <BulkSelectionContext.Provider value={value}>
      {children}
    </BulkSelectionContext.Provider>
  );
}

export function useBulkSelection() {
  const context = useContext(BulkSelectionContext);

  if (!context) {
    throw new Error(
      'useBulkSelection must be used within BulkSelectionProvider',
    );
  }

  return context;
}

// Hook for integrating with existing client lists
export function useBulkSelectionIntegration(clients: ClientData[]) {
  const bulkSelection = useBulkSelection();

  const handleItemClick = useCallback(
    (client: ClientData, index: number, event: React.MouseEvent) => {
      if (event.shiftKey && bulkSelection.lastSelectedIndex !== null) {
        // Range selection with shift key
        bulkSelection.selectRange(
          bulkSelection.lastSelectedIndex,
          index,
          clients,
        );
      } else if (event.metaKey || event.ctrlKey) {
        // Multi-select with cmd/ctrl key
        bulkSelection.toggleSelection(client.id, index);
      } else if (bulkSelection.isSelectionMode) {
        // Single select in selection mode
        bulkSelection.toggleSelection(client.id, index);
      }
    },
    [bulkSelection, clients],
  );

  const handleItemLongPress = useCallback(
    (client: ClientData, index: number) => {
      // Enter selection mode on long press (mobile)
      if (!bulkSelection.isSelectionMode) {
        bulkSelection.enterSelectionMode();
      }
      bulkSelection.toggleSelection(client.id, index);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    },
    [bulkSelection],
  );

  return {
    ...bulkSelection,
    handleItemClick,
    handleItemLongPress,
  };
}
