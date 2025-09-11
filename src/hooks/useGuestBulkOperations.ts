import { useState, useCallback } from 'react';
import { BulkOperationsState } from '@/types/guest-management';

interface UseGuestBulkOperationsReturn {
  selectedGuests: Set<string>;
  bulkOperationsState: BulkOperationsState;
  toggleGuestSelection: (guestId: string) => void;
  selectAllVisible: (guests: { id: string }[]) => void;
  clearSelection: () => void;
  setBulkOperationType: (type: BulkOperationsState['operationType']) => void;
  closeBulkModal: () => void;
}

export function useBulkOperations(): UseGuestBulkOperationsReturn {
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [bulkOperationsState, setBulkOperationsState] =
    useState<BulkOperationsState>({
      selectedGuests: new Set(),
      isSelectionMode: false,
      showModal: false,
    });

  const toggleGuestSelection = useCallback((guestId: string) => {
    setSelectedGuests((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(guestId)) {
        newSet.delete(guestId);
      } else {
        newSet.add(guestId);
      }

      setBulkOperationsState((prevState) => ({
        ...prevState,
        selectedGuests: newSet,
        isSelectionMode: newSet.size > 0,
      }));

      return newSet;
    });
  }, []);

  const selectAllVisible = useCallback((guests: { id: string }[]) => {
    const guestIds = guests.map((g) => g.id);
    setSelectedGuests(new Set(guestIds));
    setBulkOperationsState((prevState) => ({
      ...prevState,
      selectedGuests: new Set(guestIds),
      isSelectionMode: true,
    }));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedGuests(new Set());
    setBulkOperationsState((prevState) => ({
      ...prevState,
      selectedGuests: new Set(),
      isSelectionMode: false,
      showModal: false,
    }));
  }, []);

  const setBulkOperationType = useCallback(
    (type: BulkOperationsState['operationType']) => {
      setBulkOperationsState((prevState) => ({
        ...prevState,
        operationType: type,
        showModal: true,
      }));
    },
    [],
  );

  const closeBulkModal = useCallback(() => {
    setBulkOperationsState((prevState) => ({
      ...prevState,
      operationType: undefined,
      showModal: false,
    }));
  }, []);

  return {
    selectedGuests,
    bulkOperationsState,
    toggleGuestSelection,
    selectAllVisible,
    clearSelection,
    setBulkOperationType,
    closeBulkModal,
  };
}
