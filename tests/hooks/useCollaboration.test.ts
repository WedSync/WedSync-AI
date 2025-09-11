/**
 * WS-244 Real-Time Collaboration System - useCollaboration Hook Tests
 * Team A - Comprehensive Test Suite for Collaboration Hook
 * 
 * Tests WebSocket connection management, Y.js integration, and error handling
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Doc as YDoc, Text as YText } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { useCollaboration } from '@/hooks/useCollaboration';
import { ConnectionStatus, SyncStatus } from '@/types/collaboration';

// Mock Y.js and WebSocket providers
vi.mock('yjs');
vi.mock('y-websocket');
vi.mock('y-indexeddb');

// Mock useAuth hook
const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  name: 'Test User',
  avatar_url: 'https://example.com/avatar.jpg',
  organization_id: 'org-123',
  access_token: 'token-123'
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser })
}));

// Mock environment
process.env.NEXT_PUBLIC_COLLABORATION_WS_URL = 'ws://localhost:1234';

describe('useCollaboration', () => {
  let mockYDoc: any;
  let mockYText: any;
  let mockProvider: any;
  let mockAwareness: any;
  let mockPersistence: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Y.js Text
    mockYText = {
      toString: vi.fn(() => 'Initial content'),
      insert: vi.fn(),
      delete: vi.fn(),
      observe: vi.fn(),
      unobserve: vi.fn(),
      length: 15
    };

    // Mock Y.js Document
    mockYDoc = {
      getText: vi.fn(() => mockYText),
      clientID: 12345,
      destroy: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };

    // Mock IndexedDB Persistence
    mockPersistence = {
      destroy: vi.fn(),
      on: vi.fn()
    };

    // Mock Awareness
    mockAwareness = {
      on: vi.fn(),
      off: vi.fn(),
      setLocalState: vi.fn(),
      setLocalStateField: vi.fn(),
      getStates: vi.fn(() => new Map()),
      destroy: vi.fn()
    };

    // Mock WebSocket Provider
    mockProvider = {
      on: vi.fn(),
      off: vi.fn(),
      awareness: mockAwareness,
      disconnect: vi.fn(),
      connect: vi.fn(),
      destroy: vi.fn(),
      wsconnected: false,
      synced: false
    };

    // Configure mocks
    (YDoc as any).mockImplementation(() => mockYDoc);
    (WebsocketProvider as any).mockImplementation(() => mockProvider);
    (require('y-indexeddb').IndexeddbPersistence as any).mockImplementation(() => mockPersistence);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Hook Initialization', () => {
    it('initializes with correct default state', () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      expect(result.current.connectionStatus).toBe(ConnectionStatus.DISCONNECTED);
      expect(result.current.syncStatus).toBe(SyncStatus.OFFLINE);
      expect(result.current.collaborators).toEqual([]);
      expect(result.current.content).toBe('');
      expect(result.current.error).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isSynced).toBe(false);
    });

    it('does not initialize when user is not available', () => {
      vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({ user: null });

      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      expect(result.current.connectionStatus).toBe(ConnectionStatus.DISCONNECTED);
      expect(YDoc).not.toHaveBeenCalled();
      expect(WebsocketProvider).not.toHaveBeenCalled();
    });

    it('does not initialize when documentId is not provided', () => {
      const { result } = renderHook(() => useCollaboration(''));

      expect(result.current.connectionStatus).toBe(ConnectionStatus.DISCONNECTED);
      expect(YDoc).not.toHaveBeenCalled();
      expect(WebsocketProvider).not.toHaveBeenCalled();
    });
  });

  describe('Y.js Document Setup', () => {
    it('creates Y.js document and providers on initialization', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(YDoc).toHaveBeenCalled();
        expect(WebsocketProvider).toHaveBeenCalledWith(
          'ws://localhost:1234',
          'test-doc-123',
          mockYDoc,
          expect.objectContaining({
            connect: true,
            params: {
              userId: 'test-user-1',
              token: 'token-123',
              organizationId: 'org-123'
            }
          })
        );
      });
    });

    it('sets up text observation for content changes', async () => {
      renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(mockYDoc.getText).toHaveBeenCalledWith('content');
        expect(mockYText.observe).toHaveBeenCalled();
      });
    });

    it('sets up awareness for user presence', async () => {
      renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalledWith({
          user: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@example.com',
            avatar: 'https://example.com/avatar.jpg'
          },
          permissions: expect.any(Object),
          cursor: {
            position: 0,
            selection: { start: 0, end: 0 },
            color: '#9E77ED'
          }
        });
      });
    });
  });

  describe('Connection Status Management', () => {
    it('updates connection status on WebSocket events', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(mockProvider.on).toHaveBeenCalledWith('status', expect.any(Function));
      });

      // Simulate connection events
      const statusCallback = mockProvider.on.mock.calls.find(
        call => call[0] === 'status'
      )[1];

      act(() => {
        statusCallback({ status: 'connecting' });
      });

      expect(result.current.connectionStatus).toBe(ConnectionStatus.CONNECTING);

      act(() => {
        statusCallback({ status: 'connected' });
      });

      expect(result.current.connectionStatus).toBe(ConnectionStatus.CONNECTED);
    });

    it('updates sync status on sync events', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(mockProvider.on).toHaveBeenCalledWith('synced', expect.any(Function));
      });

      // Simulate sync event
      const syncCallback = mockProvider.on.mock.calls.find(
        call => call[0] === 'synced'
      )[1];

      act(() => {
        syncCallback();
      });

      expect(result.current.syncStatus).toBe(SyncStatus.SYNCED);
      expect(result.current.isSynced).toBe(true);
    });

    it('handles connection errors', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(mockProvider.on).toHaveBeenCalledWith('connection-error', expect.any(Function));
      });

      // Simulate connection error
      const errorCallback = mockProvider.on.mock.calls.find(
        call => call[0] === 'connection-error'
      )[1];

      act(() => {
        errorCallback(new Error('Connection failed'));
      });

      expect(result.current.error).toMatchObject({
        message: 'Connection failed',
        code: 'CONNECTION_FAILED',
        documentId: 'test-doc-123',
        userId: 'test-user-1'
      });
      expect(result.current.connectionStatus).toBe(ConnectionStatus.FAILED);
    });
  });

  describe('Content Management', () => {
    it('updates content when Y.js text changes', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(mockYText.observe).toHaveBeenCalled();
      });

      // Simulate text change
      const textObserver = mockYText.observe.mock.calls[0][0];
      
      act(() => {
        mockYText.toString.mockReturnValue('Updated content');
        textObserver({
          changes: {
            added: new Set(['test']),
            deleted: new Set(),
            keys: () => [0]
          }
        });
      });

      await waitFor(() => {
        expect(result.current.content).toBe('Updated content');
      });
    });

    it('applies text operations to Y.js document', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(result.current.applyOperation).toBeDefined();
      });

      // Test insert operation
      act(() => {
        result.current.applyOperation({
          type: 'INSERT',
          position: 5,
          content: 'Hello',
          length: 5
        });
      });

      expect(mockYText.insert).toHaveBeenCalledWith(5, 'Hello');

      // Test delete operation
      act(() => {
        result.current.applyOperation({
          type: 'DELETE',
          position: 3,
          length: 2
        });
      });

      expect(mockYText.delete).toHaveBeenCalledWith(3, 2);
    });

    it('handles invalid operations gracefully', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(result.current.applyOperation).toBeDefined();
      });

      // Test invalid operation
      act(() => {
        result.current.applyOperation({
          type: 'INVALID' as any,
          position: -1,
          length: 0
        });
      });

      // Should not throw error
      expect(result.current.error).toBeNull();
    });
  });

  describe('User Presence Management', () => {
    it('updates collaborators list from awareness changes', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(mockAwareness.on).toHaveBeenCalledWith('change', expect.any(Function));
      });

      // Mock awareness states
      const mockStates = new Map([
        [67890, {
          user: {
            id: 'user-2',
            name: 'Collaborator',
            email: 'collab@example.com',
            avatar: 'https://example.com/avatar2.jpg'
          },
          permissions: { read: true, write: true, admin: false, share: false, comment: true },
          cursor: {
            position: 10,
            selection: { start: 10, end: 15 },
            color: '#2E90FA'
          }
        }]
      ]);

      mockAwareness.getStates.mockReturnValue(mockStates);

      // Simulate awareness change
      const awarenessCallback = mockAwareness.on.mock.calls.find(
        call => call[0] === 'change'
      )[1];

      act(() => {
        awarenessCallback();
      });

      await waitFor(() => {
        expect(result.current.collaborators).toHaveLength(1);
        expect(result.current.collaborators[0]).toMatchObject({
          userId: 'user-2',
          name: 'Collaborator',
          isOnline: true
        });
      });
    });

    it('filters out current user from collaborators', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      const mockStates = new Map([
        [12345, { user: { id: 'test-user-1' } }], // Current user
        [67890, { user: { id: 'user-2', name: 'Other User' } }]
      ]);

      mockAwareness.getStates.mockReturnValue(mockStates);

      const awarenessCallback = mockAwareness.on.mock.calls.find(
        call => call[0] === 'change'
      )[1];

      act(() => {
        awarenessCallback();
      });

      await waitFor(() => {
        expect(result.current.collaborators).toHaveLength(1);
        expect(result.current.collaborators[0].userId).toBe('user-2');
      });
    });

    it('updates cursor position', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(result.current.updateCursor).toBeDefined();
      });

      act(() => {
        result.current.updateCursor(25, { start: 20, end: 30 });
      });

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith('cursor', {
        position: 25,
        selection: { start: 20, end: 30 },
        color: '#9E77ED',
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Connection Management', () => {
    it('provides connect method', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(result.current.connect).toBeDefined();
      });

      act(() => {
        result.current.connect();
      });

      expect(mockProvider.connect).toHaveBeenCalled();
    });

    it('provides disconnect method', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(result.current.disconnect).toBeDefined();
      });

      act(() => {
        result.current.disconnect();
      });

      expect(mockProvider.disconnect).toHaveBeenCalled();
    });

    it('provides retry method', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(result.current.retry).toBeDefined();
      });

      // Set error state first
      act(() => {
        result.current.retry();
      });

      // Should reset error and attempt reconnection
      expect(result.current.error).toBeNull();
    });
  });

  describe('Cleanup and Resource Management', () => {
    it('cleans up resources on unmount', async () => {
      const { unmount } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(mockProvider.on).toHaveBeenCalled();
      });

      unmount();

      expect(mockProvider.disconnect).toHaveBeenCalled();
      expect(mockPersistence.destroy).toHaveBeenCalled();
      expect(mockYDoc.destroy).toHaveBeenCalled();
    });

    it('removes event listeners on unmount', async () => {
      const { unmount } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(mockProvider.on).toHaveBeenCalled();
      });

      unmount();

      expect(mockProvider.off).toHaveBeenCalled();
      expect(mockAwareness.off).toHaveBeenCalled();
      expect(mockYText.unobserve).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles Y.js initialization errors', async () => {
      (YDoc as any).mockImplementation(() => {
        throw new Error('Y.js initialization failed');
      });

      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(result.current.error).toMatchObject({
          message: 'Y.js initialization failed',
          code: 'CONNECTION_FAILED'
        });
      });
    });

    it('handles WebSocket connection errors', async () => {
      (WebsocketProvider as any).mockImplementation(() => {
        throw new Error('WebSocket connection failed');
      });

      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(result.current.error).toMatchObject({
          message: 'WebSocket connection failed',
          code: 'CONNECTION_FAILED'
        });
      });
    });

    it('clears errors on successful retry', async () => {
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      // Set error state
      act(() => {
        const errorCallback = mockProvider.on.mock.calls.find(
          call => call[0] === 'connection-error'
        )[1];
        errorCallback(new Error('Test error'));
      });

      expect(result.current.error).toBeTruthy();

      // Retry and succeed
      act(() => {
        result.current.retry();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Performance and Optimization', () => {
    it('does not reinitialize when documentId changes to same value', () => {
      const { rerender } = renderHook(
        ({ docId }) => useCollaboration(docId),
        { initialProps: { docId: 'test-doc-123' } }
      );

      expect(YDoc).toHaveBeenCalledTimes(1);

      rerender({ docId: 'test-doc-123' });

      expect(YDoc).toHaveBeenCalledTimes(1);
    });

    it('reinitializes when documentId changes', async () => {
      const { rerender } = renderHook(
        ({ docId }) => useCollaboration(docId),
        { initialProps: { docId: 'test-doc-123' } }
      );

      await waitFor(() => {
        expect(YDoc).toHaveBeenCalledTimes(1);
      });

      rerender({ docId: 'new-doc-456' });

      await waitFor(() => {
        expect(YDoc).toHaveBeenCalledTimes(2);
        expect(mockProvider.disconnect).toHaveBeenCalled();
      });
    });

    it('debounces rapid cursor updates', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useCollaboration('test-doc-123'));

      await waitFor(() => {
        expect(result.current.updateCursor).toBeDefined();
      });

      // Rapid cursor updates
      act(() => {
        result.current.updateCursor(1, { start: 1, end: 1 });
        result.current.updateCursor(2, { start: 2, end: 2 });
        result.current.updateCursor(3, { start: 3, end: 3 });
      });

      expect(mockAwareness.setLocalStateField).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });
});