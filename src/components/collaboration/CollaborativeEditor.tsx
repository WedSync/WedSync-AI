'use client';

/**
 * WS-244 Real-Time Collaboration System - CollaborativeEditor
 * Team A - Frontend Collaborative Editing Interface
 *
 * React 19 + Y.js integration for conflict-free collaborative editing
 * Untitled UI styling with real-time presence indicators
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Doc as YDoc, Text as YText, Array as YArray, Map as YMap } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import {
  CollaborativeEditorProps,
  CollaboratorInfo,
  Operation,
  ConnectionStatus,
  SyncStatus,
  CollaborationError,
  CollaborationErrorCode,
} from '@/types/collaboration';
import { useAuth } from '@/hooks/useAuth';
import { PresenceIndicator } from './PresenceIndicator';
import { CollaborationToolbar } from './CollaborationToolbar';
import { UserCursor } from './UserCursor';

/**
 * CollaborativeEditor - Main collaborative editing interface
 *
 * Features:
 * - Real-time collaborative editing with Y.js CRDT
 * - User presence indicators and cursor positions
 * - Conflict-free operational transforms
 * - Offline sync with IndexedDB persistence
 * - Mobile-responsive design (375px minimum)
 * - WCAG 2.1 AA accessibility compliance
 */
export const CollaborativeEditor: React.FC<CollaborativeEditorProps> = ({
  documentId,
  initialContent = '',
  permissions = 'read',
  onContentChange,
  className = '',
  placeholder = 'Start collaborating...',
  autoSave = true,
  enableComments = true,
  showPresence = true,
  maxUsers = 20,
}) => {
  // Core state
  const { user } = useAuth();
  const [ydoc, setYdoc] = useState<YDoc | null>(null);
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [persistence, setPersistence] = useState<IndexeddbPersistence | null>(
    null,
  );
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    ConnectionStatus.DISCONNECTED,
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncStatus.OFFLINE);
  const [collaborators, setCollaborators] = useState<CollaboratorInfo[]>([]);
  const [content, setContent] = useState(initialContent);
  const [error, setError] = useState<CollaborationError | null>(null);

  // Refs for editor and cursors
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const cursorsRef = useRef<
    Map<string, { position: number; selection: { start: number; end: number } }>
  >(new Map());

  // Initialize Y.js document and providers
  const initializeCollaboration = useCallback(async () => {
    try {
      if (!user || !documentId) return;

      // Create Y.js document
      const doc = new YDoc();

      // Set up IndexedDB persistence for offline support
      const indexeddbProvider = new IndexeddbPersistence(documentId, doc);

      // Set up WebSocket provider for real-time sync
      const websocketProvider = new WebsocketProvider(
        process.env.NEXT_PUBLIC_COLLABORATION_WS_URL || 'ws://localhost:1234',
        documentId,
        doc,
        {
          connect: true,
          params: {
            userId: user.id,
            token: user.access_token,
            organizationId: user.organization_id,
          },
        },
      );

      // Connection status handlers
      websocketProvider.on('status', (event: { status: string }) => {
        switch (event.status) {
          case 'connecting':
            setConnectionStatus(ConnectionStatus.CONNECTING);
            break;
          case 'connected':
            setConnectionStatus(ConnectionStatus.CONNECTED);
            setSyncStatus(SyncStatus.SYNCING);
            break;
          case 'disconnected':
            setConnectionStatus(ConnectionStatus.DISCONNECTED);
            setSyncStatus(SyncStatus.OFFLINE);
            break;
        }
      });

      // Sync status handlers
      websocketProvider.on('synced', () => {
        setSyncStatus(SyncStatus.SYNCED);
      });

      // Error handling
      websocketProvider.on('connection-error', (error: Error) => {
        setError({
          name: 'CollaborationError',
          message: error.message,
          code: CollaborationErrorCode.CONNECTION_FAILED,
          documentId,
          userId: user.id,
        });
      });

      // Get or create text content
      const ytext = doc.getText('content');

      // Initialize with content if empty
      if (ytext.length === 0 && initialContent) {
        ytext.insert(0, initialContent);
      }

      // Listen for text changes
      ytext.observe((event) => {
        const newContent = ytext.toString();
        setContent(newContent);

        // Trigger content change callback
        if (onContentChange) {
          const operation: Operation = {
            id: crypto.randomUUID(),
            type: event.changes.added.size > 0 ? 'INSERT' : 'DELETE',
            clientId: doc.clientID,
            timestamp: new Date(),
            position: Array.from(event.changes.keys())[0] || 0,
            length: event.changes.added.size + event.changes.deleted.size,
            content: newContent,
            userId: user.id,
            documentId,
          };
          onContentChange(newContent, operation);
        }
      });

      // Handle awareness (user presence)
      websocketProvider.awareness.on('change', () => {
        const states = Array.from(
          websocketProvider.awareness.getStates().entries(),
        );
        const updatedCollaborators: CollaboratorInfo[] = states
          .filter(([clientId]) => clientId !== doc.clientID)
          .map(([clientId, state]: [number, any]) => ({
            userId: state.user?.id || `client-${clientId}`,
            name: state.user?.name || 'Anonymous User',
            email: state.user?.email || '',
            avatar: state.user?.avatar || '',
            permissions: state.permissions || {
              read: true,
              write: false,
              admin: false,
              share: false,
              comment: false,
            },
            lastSeen: new Date(),
            isOnline: true,
            cursor: state.cursor
              ? {
                  position: state.cursor.position || 0,
                  selection: state.cursor.selection || { start: 0, end: 0 },
                  color: state.cursor.color || '#9E77ED',
                }
              : undefined,
          }));

        setCollaborators(updatedCollaborators);

        // Update cursor positions
        cursorsRef.current.clear();
        updatedCollaborators.forEach((collaborator) => {
          if (collaborator.cursor) {
            cursorsRef.current.set(collaborator.userId, {
              position: collaborator.cursor.position,
              selection: collaborator.cursor.selection,
            });
          }
        });
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
          color: '#9E77ED', // Primary color from Untitled UI
        },
      });

      setYdoc(doc);
      setProvider(websocketProvider);
      setPersistence(indexeddbProvider);
    } catch (error) {
      console.error('Failed to initialize collaboration:', error);
      setError({
        name: 'CollaborationError',
        message: error instanceof Error ? error.message : 'Unknown error',
        code: CollaborationErrorCode.CONNECTION_FAILED,
        documentId,
        userId: user?.id,
      });
    }
  }, [user, documentId, initialContent, permissions, onContentChange]);

  // Handle cursor position updates
  const updateCursorPosition = useCallback(
    (position: number, selection: { start: number; end: number }) => {
      if (provider && user) {
        provider.awareness.setLocalStateField('cursor', {
          position,
          selection,
          color: '#9E77ED',
          timestamp: Date.now(),
        });
      }
    },
    [provider, user],
  );

  // Handle text input
  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (!ydoc || permissions === 'read') return;

      const newContent = event.target.value;
      const ytext = ydoc.getText('content');

      // Calculate diff and apply to Y.js
      const currentContent = ytext.toString();
      if (newContent !== currentContent) {
        const selectionStart = event.target.selectionStart;
        const selectionEnd = event.target.selectionEnd;

        // Simple diff algorithm for demonstration
        // In production, use a more sophisticated diff like Myers algorithm
        if (newContent.length > currentContent.length) {
          // Insertion
          const insertPos =
            selectionStart - (newContent.length - currentContent.length);
          const insertText = newContent.slice(insertPos, selectionStart);
          ytext.insert(insertPos, insertText);
        } else if (newContent.length < currentContent.length) {
          // Deletion
          const deletePos = selectionStart;
          const deleteLength = currentContent.length - newContent.length;
          ytext.delete(deletePos, deleteLength);
        } else {
          // Replacement
          ytext.delete(0, currentContent.length);
          ytext.insert(0, newContent);
        }

        // Update cursor position
        updateCursorPosition(selectionStart, {
          start: selectionStart,
          end: selectionEnd,
        });
      }
    },
    [ydoc, permissions, updateCursorPosition],
  );

  // Handle selection change
  const handleSelectionChange = useCallback(() => {
    if (editorRef.current) {
      const { selectionStart, selectionEnd } = editorRef.current;
      updateCursorPosition(selectionStart, {
        start: selectionStart,
        end: selectionEnd,
      });
    }
  }, [updateCursorPosition]);

  // Initialize collaboration on mount
  useEffect(() => {
    initializeCollaboration();

    return () => {
      provider?.disconnect();
      persistence?.destroy();
      ydoc?.destroy();
    };
  }, [initializeCollaboration]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSave || !content || !user) return;

    const saveTimeout = setTimeout(async () => {
      try {
        await fetch('/api/documents/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId,
            content,
            userId: user.id,
          }),
        });
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(saveTimeout);
  }, [content, documentId, user, autoSave]);

  if (!user) {
    return (
      <div className="flex items-center justify-center p-8 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-600 text-sm">
          Please log in to access collaborative editing
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-error-50 rounded-xl border border-error-200">
        <p className="text-error-700 font-medium mb-2">Collaboration Error</p>
        <p className="text-error-600 text-sm text-center mb-4">
          {error.message}
        </p>
        <button
          onClick={initializeCollaboration}
          className="px-4 py-2 bg-error-600 hover:bg-error-700 text-white font-medium text-sm rounded-lg transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative bg-white rounded-xl border border-gray-200 shadow-xs ${className}`}
    >
      {/* Collaboration Toolbar */}
      {permissions !== 'read' && (
        <CollaborationToolbar
          sessionId={`${documentId}-${user.id}`}
          permissions={
            permissions === 'admin'
              ? {
                  read: true,
                  write: true,
                  admin: true,
                  share: true,
                  comment: true,
                }
              : {
                  read: true,
                  write: permissions === 'write',
                  admin: false,
                  share: false,
                  comment: enableComments,
                }
          }
          onInviteUser={() => {
            // TODO: Implement user invitation modal
            console.log('Invite user clicked');
          }}
          onShareDocument={() => {
            // TODO: Implement document sharing modal
            console.log('Share document clicked');
          }}
          connectionStatus={connectionStatus}
          syncStatus={syncStatus}
          collaboratorCount={collaborators.length}
        />
      )}

      {/* Presence Indicators */}
      {showPresence && (
        <PresenceIndicator
          users={collaborators}
          currentUser={user}
          showCursors={true}
          showAvatars={true}
          maxDisplayCount={5}
          className="absolute top-4 right-4 z-10"
        />
      )}

      {/* Main Editor */}
      <div className="relative">
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleTextChange}
          onSelect={handleSelectionChange}
          onFocus={handleSelectionChange}
          placeholder={placeholder}
          disabled={permissions === 'read'}
          className={`
            w-full h-96 p-6 border-0 rounded-xl resize-none
            bg-transparent text-gray-900 placeholder-gray-500
            focus:outline-none focus:ring-0
            font-mono text-sm leading-6
            ${permissions === 'read' ? 'cursor-default' : ''}
          `}
          style={{ minHeight: '384px' }}
          aria-label="Collaborative editor"
          aria-describedby="editor-status"
        />

        {/* User Cursors Overlay */}
        <div className="absolute inset-0 pointer-events-none z-5">
          {collaborators.map(
            (collaborator) =>
              collaborator.cursor && (
                <UserCursor
                  key={collaborator.userId}
                  user={collaborator}
                  position={collaborator.cursor.position}
                  selection={collaborator.cursor.selection}
                  editorRef={editorRef}
                />
              ),
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div
        id="editor-status"
        className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl"
      >
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span
            className={`flex items-center space-x-1 ${
              connectionStatus === ConnectionStatus.CONNECTED
                ? 'text-success-600'
                : connectionStatus === ConnectionStatus.CONNECTING
                  ? 'text-warning-600'
                  : 'text-error-600'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                connectionStatus === ConnectionStatus.CONNECTED
                  ? 'bg-success-600'
                  : connectionStatus === ConnectionStatus.CONNECTING
                    ? 'bg-warning-600'
                    : 'bg-error-600'
              }`}
            />
            <span>{connectionStatus.replace('_', ' ')}</span>
          </span>

          <span className="text-gray-400">•</span>

          <span>
            {syncStatus === SyncStatus.SYNCED
              ? 'All changes saved'
              : syncStatus === SyncStatus.SYNCING
                ? 'Syncing...'
                : 'Changes pending'}
          </span>

          {collaborators.length > 0 && (
            <>
              <span className="text-gray-400">•</span>
              <span>
                {collaborators.length} collaborator
                {collaborators.length === 1 ? '' : 's'} online
              </span>
            </>
          )}
        </div>

        <div className="flex items-center space-x-2 text-xs text-gray-500">
          {autoSave && <span>Auto-save enabled</span>}
          <span>{content.length} characters</span>
        </div>
      </div>
    </div>
  );
};

export default CollaborativeEditor;
