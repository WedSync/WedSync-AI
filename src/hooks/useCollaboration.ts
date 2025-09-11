'use client';

/**
 * WS-244 Real-Time Collaboration System - useCollaboration Hook
 * Team A - Real-time Collaboration State Management
 *
 * Manages Y.js document, WebSocket connection, and user presence
 * Provides operational transform and conflict resolution
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Doc as YDoc, Text as YText, Array as YArray, Map as YMap } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  CollaboratorInfo,
  Operation,
  OperationType,
  ConnectionStatus,
  SyncStatus,
  CollaborationError,
  CollaborationErrorCode,
  DocumentPermissions,
} from '@/types/collaboration';
import { useAuth } from '@/hooks/useAuth';

interface UseCollaborationOptions {
  permissions?: DocumentPermissions;
  autoConnect?: boolean;
  enableOfflineSync?: boolean;
  enablePresence?: boolean;
  debounceMs?: number;
}

interface UseCollaborationReturn {
  // Connection state
  connectionStatus: ConnectionStatus;
  syncStatus: SyncStatus;
  isConnected: boolean;
  isSynced: boolean;
  error: CollaborationError | null;

  // Content state
  content: string;
  collaborators: CollaboratorInfo[];

  // Actions
  applyOperation: (operation: Partial<Operation>) => void;
  updateCursor: (
    position: number,
    selection: { start: number; end: number },
  ) => void;
  connect: () => void;
  disconnect: () => void;
  retry: () => void;

  // Y.js instances (for advanced usage)
  ydoc: YDoc | null;
  ytext: YText | null;
  provider: WebsocketProvider | null;
}

/**
 * useCollaboration - React hook for real-time collaborative editing
 *
 * Features:
 * - Y.js CRDT for conflict-free collaborative editing
 * - WebSocket connection management with auto-reconnect
 * - IndexedDB persistence for offline support
 * - User presence awareness with cursor tracking
 * - Error handling and recovery mechanisms
 *
 * @param documentId - Unique identifier for the document
 * @param options - Configuration options
 * @returns Collaboration state and methods
 */
export function useCollaboration(
  documentId: string,
  options: UseCollaborationOptions = {},
): UseCollaborationReturn {
  const {
    permissions = {
      read: true,
      write: true,
      admin: false,
      share: false,
      comment: true,
    },
    autoConnect = true,
    enableOfflineSync = true,
    enablePresence = true,
    debounceMs = 100,
  } = options;

  const { user } = useAuth();

  // Core state
  const [ydoc, setYdoc] = useState<YDoc | null>(null);
  const [ytext, setYtext] = useState<YText | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [persistence, setPersistence] = useState<IndexeddbPersistence | null>(
    null,
  );

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED,
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.OFFLINE);
  const [error, setError] = useState<CollaborationError | null>(null);

  // Content state
  const [content, setContent] = useState<string>('');
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);

  // Refs for cleanup and debouncing
  const initializationRef = useRef<boolean>(false);
  const cursorDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const providersRef = useRef<{
    websocket?: WebsocketProvider;
    persistence?: IndexeddbPersistence;
    ydoc?: YDoc;
  }>({});

  // Derived state
  const isConnected =
    connectionStatus === ConnectionStatus.CONNECTED ||
    connectionStatus === ConnectionStatus.AUTHENTICATED;
  const isSynced = syncStatus === SyncStatus.SYNCED;

  // Initialize collaboration when conditions are met
  const initializeCollaboration = useCallback(async () => {
    if (!user || !documentId || initializationRef.current) {
      return;
    }

    try {
      initializationRef.current = true;
      setError(null);
      setConnectionStatus(ConnectionStatus.CONNECTING);

      // Create Y.js document
      const doc = new YDoc();
      setYdoc(doc);
      providersRef.current.ydoc = doc;

      // Get shared text
      const text = doc.getText('content');
      setYtext(text);

      // Set up IndexedDB persistence for offline support
      if (enableOfflineSync) {
        const indexeddbProvider = new IndexeddbPersistence(documentId, doc);
        setPersistence(indexeddbProvider);
        providersRef.current.persistence = indexeddbProvider;

        indexeddbProvider.on('synced', () => {
          console.log('Local IndexedDB synced');
        });
      }

      // Set up WebSocket provider for real-time sync
      const websocketUrl =
        process.env.NEXT_PUBLIC_COLLABORATION_WS_URL || 'ws://localhost:1234';
      const websocketProvider = new WebsocketProvider(
        websocketUrl,
        documentId,
        doc,
        {
          connect: autoConnect,
          params: {
            userId: user.id,
            token: user.access_token,
            organizationId: user.organization_id,
            permissions: JSON.stringify(permissions),
          },
        },
      );

      setProvider(websocketProvider);
      providersRef.current.websocket = websocketProvider;

      // Connection status handlers
      websocketProvider.on('status', (event: { status: string }) => {
        switch (event.status) {
          case 'connecting':
            setConnectionStatus(ConnectionStatus.CONNECTING);
            setSyncStatus(SyncStatus.OFFLINE);
            break;
          case 'connected':
            setConnectionStatus(ConnectionStatus.CONNECTED);
            setSyncStatus(SyncStatus.SYNCING);
            break;
          case 'disconnected':
            setConnectionStatus(ConnectionStatus.DISCONNECTED);
            setSyncStatus(SyncStatus.OFFLINE);
            break;
          case 'error':
            setConnectionStatus(ConnectionStatus.FAILED);
            setSyncStatus(SyncStatus.ERROR);
            break;
        }
      });

      // Sync status handlers
      websocketProvider.on('synced', () => {
        setSyncStatus(SyncStatus.SYNCED);
      });

      // Error handling
      websocketProvider.on('connection-error', (error: Error) => {
        console.error('Collaboration connection error:', error);
        setError({
          name: 'CollaborationError',
          message: error.message,
          code: CollaborationErrorCode.CONNECTION_FAILED,
          documentId,
          userId: user.id,
          context: { timestamp: new Date().toISOString() },
        });
        setConnectionStatus(ConnectionStatus.FAILED);
        setSyncStatus(SyncStatus.ERROR);
      });

      // Authentication error handling
      websocketProvider.on('auth-error', (error: Error) => {
        console.error('Collaboration auth error:', error);
        setError({
          name: 'CollaborationError',
          message: 'Authentication failed for collaboration session',
          code: CollaborationErrorCode.AUTHENTICATION_FAILED,
          documentId,
          userId: user.id,
          context: { originalError: error.message },
        });
        setConnectionStatus(ConnectionStatus.UNAUTHORIZED);
      });

      // Listen for text changes
      text.observe((event) => {
        const newContent = text.toString();
        setContent(newContent);

        // Log operation for debugging
        console.log('Text changed:', {
          added: event.changes.added.size,
          deleted: event.changes.deleted.size,
          newLength: newContent.length,
        });
      });

      // Handle awareness (user presence) if enabled
      if (enablePresence) {
        websocketProvider.awareness.on('change', () => {
          const states = Array.from(
            websocketProvider.awareness.getStates().entries(),
          );
          const updatedCollaborators: CollaboratorInfo[] = states
            .filter(([clientId]) => clientId !== doc.clientID)
            .map(([clientId, state]: [number, any]) => {
              const stateUser = state.user || {};
              const statePermissions = state.permissions || permissions;
              const stateCursor = state.cursor;

              return {
                userId: stateUser.id || `client-${clientId}`,
                name: stateUser.name || 'Anonymous User',
                email: stateUser.email || '',
                avatar: stateUser.avatar || '',
                permissions: {
                  read: statePermissions.read || false,
                  write: statePermissions.write || false,
                  admin: statePermissions.admin || false,
                  share: statePermissions.share || false,
                  comment: statePermissions.comment || false,
                },
                lastSeen: new Date(),
                isOnline: true,
                cursor: stateCursor
                  ? {
                      position: stateCursor.position || 0,
                      selection: stateCursor.selection || { start: 0, end: 0 },
                      color: stateCursor.color || '#9E77ED',
                    }
                  : undefined,
              };
            });

          setCollaborators(updatedCollaborators);
        });

        // Set initial awareness state
        websocketProvider.awareness.setLocalState({
          user: {
            id: user.id,
            name: user.name || user.email,
            email: user.email,
            avatar: user.avatar_url,
          },
          permissions,
          cursor: {
            position: 0,
            selection: { start: 0, end: 0 },
            color: '#9E77ED',
            timestamp: Date.now(),
          },
        });
      }

      // Set initial content from Y.js text
      const initialContent = text.toString();
      setContent(initialContent);
    } catch (error) {
      console.error('Failed to initialize collaboration:', error);
      const collaborationError: CollaborationError = {
        name: 'CollaborationError',
        message:
          error instanceof Error
            ? error.message
            : 'Unknown error during initialization',
        code: CollaborationErrorCode.CONNECTION_FAILED,
        documentId,
        userId: user?.id,
        context: {
          phase: 'initialization',
          timestamp: new Date().toISOString(),
        },
      };
      setError(collaborationError);
      setConnectionStatus(ConnectionStatus.FAILED);
      setSyncStatus(SyncStatus.ERROR);
      initializationRef.current = false;
    }
  }, [
    user,
    documentId,
    permissions,
    autoConnect,
    enableOfflineSync,
    enablePresence,
  ]);

  // Apply operations to Y.js document
  const applyOperation = useCallback(
    (operation: Partial<Operation>) => {
      if (!ytext || !permissions.write) {
        console.warn(
          'Cannot apply operation: no write permissions or Y.js text not available',
        );
        return;
      }

      try {
        const { type, position = 0, content = '', length = 0 } = operation;

        switch (type) {
          case OperationType.INSERT:
            if (typeof content === 'string' && content.length > 0) {
              ytext.insert(position, content);
            }
            break;

          case OperationType.DELETE:
            if (length > 0) {
              ytext.delete(position, length);
            }
            break;

          case OperationType.RETAIN:
            // RETAIN operations are handled automatically by Y.js
            break;

          default:
            console.warn('Unknown operation type:', type);
        }
      } catch (error) {
        console.error('Failed to apply operation:', error);
        setError({
          name: 'CollaborationError',
          message: 'Failed to apply operation to document',
          code: CollaborationErrorCode.INVALID_OPERATION,
          documentId,
          userId: user?.id,
          operationId: operation.id,
          context: {
            operation,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });
      }
    },
    [ytext, permissions.write, documentId, user?.id],
  );

  // Update cursor position with debouncing
  const updateCursor = useCallback(
    (position: number, selection: { start: number; end: number }) => {
      if (!provider || !enablePresence) return;

      // Clear existing timeout
      if (cursorDebounceRef.current) {
        clearTimeout(cursorDebounceRef.current);
      }

      // Debounce cursor updates to avoid overwhelming the network
      cursorDebounceRef.current = setTimeout(() => {
        try {
          provider.awareness.setLocalStateField('cursor', {
            position,
            selection,
            color: '#9E77ED',
            timestamp: Date.now(),
          });
        } catch (error) {
          console.warn('Failed to update cursor position:', error);
        }
      }, debounceMs);
    },
    [provider, enablePresence, debounceMs],
  );

  // Connection management
  const connect = useCallback(() => {
    if (provider && connectionStatus !== ConnectionStatus.CONNECTED) {
      provider.connect();
    }
  }, [provider, connectionStatus]);

  const disconnect = useCallback(() => {
    if (provider && connectionStatus !== ConnectionStatus.DISCONNECTED) {
      provider.disconnect();
    }
  }, [provider, connectionStatus]);

  const retry = useCallback(() => {
    setError(null);
    if (provider) {
      provider.disconnect();
      setTimeout(() => {
        provider.connect();
      }, 1000);
    } else {
      // Reinitialize completely
      initializationRef.current = false;
      initializeCollaboration();
    }
  }, [provider, initializeCollaboration]);

  // Initialize collaboration when conditions are met
  useEffect(() => {
    if (user && documentId && !initializationRef.current) {
      initializeCollaboration();
    }
  }, [user, documentId, initializeCollaboration]);

  // Cleanup resources on unmount or document change
  useEffect(() => {
    return () => {
      // Clear debounce timeout
      if (cursorDebounceRef.current) {
        clearTimeout(cursorDebounceRef.current);
      }

      // Disconnect and cleanup providers
      if (providersRef.current.websocket) {
        providersRef.current.websocket.disconnect();
        providersRef.current.websocket.destroy();
      }

      if (providersRef.current.persistence) {
        providersRef.current.persistence.destroy();
      }

      if (providersRef.current.ydoc) {
        providersRef.current.ydoc.destroy();
      }

      // Reset state
      initializationRef.current = false;
      providersRef.current = {};
    };
  }, [documentId]); // Reinitialize when document changes

  return {
    // Connection state
    connectionStatus,
    syncStatus,
    isConnected,
    isSynced,
    error,

    // Content state
    content,
    collaborators,

    // Actions
    applyOperation,
    updateCursor,
    connect,
    disconnect,
    retry,

    // Y.js instances (for advanced usage)
    ydoc,
    ytext,
    provider,
  };
}

export default useCollaboration;
