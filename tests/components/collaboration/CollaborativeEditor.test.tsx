/**
 * WS-244 Real-Time Collaboration System - CollaborativeEditor Tests
 * Team A - Comprehensive Test Suite for Collaborative Editor
 * 
 * Tests operational transform, real-time sync, user presence, and error handling
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Doc as YDoc, Text as YText } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { CollaborativeEditor } from '@/components/collaboration/CollaborativeEditor';
import { 
  CollaborativeEditorProps, 
  ConnectionStatus, 
  SyncStatus,
  CollaborationErrorCode 
} from '@/types/collaboration';

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

// Mock environment variables
process.env.NEXT_PUBLIC_COLLABORATION_WS_URL = 'ws://localhost:1234';

describe('CollaborativeEditor', () => {
  let mockYDoc: any;
  let mockYText: any;
  let mockProvider: any;
  let mockAwareness: any;
  
  const defaultProps: CollaborativeEditorProps = {
    documentId: 'test-doc-123',
    initialContent: 'Initial content',
    permissions: 'write',
    onContentChange: vi.fn()
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Mock Y.js Text
    mockYText = {
      toString: vi.fn(() => 'Initial content'),
      insert: vi.fn(),
      delete: vi.fn(),
      observe: vi.fn(),
      length: 15
    };

    // Mock Y.js Document
    mockYDoc = {
      getText: vi.fn(() => mockYText),
      clientID: 12345,
      destroy: vi.fn()
    };

    // Mock Awareness
    mockAwareness = {
      on: vi.fn(),
      setLocalState: vi.fn(),
      setLocalStateField: vi.fn(),
      getStates: vi.fn(() => new Map())
    };

    // Mock WebSocket Provider
    mockProvider = {
      on: vi.fn(),
      awareness: mockAwareness,
      disconnect: vi.fn()
    };

    // Configure mocks
    (YDoc as any).mockImplementation(() => mockYDoc);
    (WebsocketProvider as any).mockImplementation(() => mockProvider);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders collaborative editor with initial content', () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      expect(editor).toBeInTheDocument();
      expect(editor).toHaveValue('Initial content');
    });

    it('renders with placeholder when no content', () => {
      render(
        <CollaborativeEditor 
          {...defaultProps} 
          initialContent="" 
          placeholder="Start typing..." 
        />
      );
      
      const editor = screen.getByPlaceholderText('Start typing...');
      expect(editor).toBeInTheDocument();
    });

    it('renders collaboration toolbar for write permissions', () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      // Toolbar should be present for write permissions
      expect(screen.getByText('Invite')).toBeInTheDocument();
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('hides toolbar for read-only permissions', () => {
      render(
        <CollaborativeEditor 
          {...defaultProps} 
          permissions="read" 
        />
      );
      
      // Toolbar should be hidden for read permissions
      expect(screen.queryByText('Invite')).not.toBeInTheDocument();
    });

    it('displays connection status indicator', () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      // Should show initial disconnected state
      expect(screen.getByText('disconnected')).toBeInTheDocument();
    });
  });

  describe('Y.js Integration', () => {
    it('initializes Y.js document and WebSocket provider', async () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
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
      const onContentChange = vi.fn();
      render(
        <CollaborativeEditor 
          {...defaultProps} 
          onContentChange={onContentChange} 
        />
      );
      
      await waitFor(() => {
        expect(mockYDoc.getText).toHaveBeenCalledWith('content');
        expect(mockYText.observe).toHaveBeenCalled();
      });
    });

    it('initializes content if Y.js text is empty', async () => {
      mockYText.length = 0;
      
      render(<CollaborativeEditor {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockYText.insert).toHaveBeenCalledWith(0, 'Initial content');
      });
    });

    it('sets initial awareness state for user presence', async () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockAwareness.setLocalState).toHaveBeenCalledWith({
          user: {
            id: 'test-user-1',
            name: 'Test User',
            email: 'test@example.com',
            avatar: 'https://example.com/avatar.jpg'
          },
          permissions: 'write',
          cursor: {
            position: 0,
            selection: { start: 0, end: 0 },
            color: '#9E77ED'
          }
        });
      });
    });
  });

  describe('Real-time Editing', () => {
    it('handles text input and applies to Y.js document', async () => {
      const user = userEvent.setup();
      render(<CollaborativeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      
      await user.clear(editor);
      await user.type(editor, 'New content');
      
      // Should update Y.js text
      expect(mockYText.delete).toHaveBeenCalled();
      expect(mockYText.insert).toHaveBeenCalled();
    });

    it('updates cursor position on selection change', async () => {
      const user = userEvent.setup();
      render(<CollaborativeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      
      await user.click(editor);
      fireEvent.select(editor, { target: { selectionStart: 5, selectionEnd: 10 } });
      
      expect(mockAwareness.setLocalStateField).toHaveBeenCalledWith('cursor', {
        position: 5,
        selection: { start: 5, end: 10 },
        color: '#9E77ED',
        timestamp: expect.any(Number)
      });
    });

    it('disables editing for read-only permissions', () => {
      render(
        <CollaborativeEditor 
          {...defaultProps} 
          permissions="read" 
        />
      );
      
      const editor = screen.getByRole('textbox');
      expect(editor).toBeDisabled();
    });

    it('calls onContentChange when content updates', async () => {
      const onContentChange = vi.fn();
      render(
        <CollaborativeEditor 
          {...defaultProps} 
          onContentChange={onContentChange} 
        />
      );
      
      // Simulate Y.js text change
      const observeCallback = mockYText.observe.mock.calls[0][0];
      act(() => {
        mockYText.toString.mockReturnValue('Updated content');
        observeCallback({
          changes: {
            added: new Set(['test']),
            deleted: new Set(),
            keys: () => [0]
          }
        });
      });
      
      await waitFor(() => {
        expect(onContentChange).toHaveBeenCalledWith(
          'Updated content',
          expect.objectContaining({
            type: 'INSERT',
            clientId: 12345,
            userId: 'test-user-1',
            documentId: 'test-doc-123'
          })
        );
      });
    });
  });

  describe('Connection Status Management', () => {
    it('updates connection status based on WebSocket events', async () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      // Simulate connection events
      const statusCallback = mockProvider.on.mock.calls.find(
        call => call[0] === 'status'
      )[1];
      
      act(() => statusCallback({ status: 'connecting' }));
      expect(screen.getByText('connecting')).toBeInTheDocument();
      
      act(() => statusCallback({ status: 'connected' }));
      expect(screen.getByText('connected')).toBeInTheDocument();
    });

    it('handles sync events correctly', async () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      // Simulate sync event
      const syncCallback = mockProvider.on.mock.calls.find(
        call => call[0] === 'synced'
      )[1];
      
      act(() => syncCallback());
      expect(screen.getByText('All changes saved')).toBeInTheDocument();
    });

    it('displays error state on connection failure', async () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      // Simulate connection error
      const errorCallback = mockProvider.on.mock.calls.find(
        call => call[0] === 'connection-error'
      )[1];
      
      act(() => errorCallback(new Error('Connection failed')));
      
      await waitFor(() => {
        expect(screen.getByText('Collaboration Error')).toBeInTheDocument();
        expect(screen.getByText('Connection failed')).toBeInTheDocument();
      });
    });
  });

  describe('User Presence', () => {
    it('updates collaborators list from awareness changes', async () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
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
      
      act(() => awarenessCallback());
      
      // Should show collaborator count
      expect(screen.getByText('1 collaborator online')).toBeInTheDocument();
    });

    it('filters out current user from collaborators', async () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      const mockStates = new Map([
        [12345, { user: { id: 'test-user-1' } }], // Current user
        [67890, { user: { id: 'user-2', name: 'Other User' } }]
      ]);
      
      mockAwareness.getStates.mockReturnValue(mockStates);
      
      const awarenessCallback = mockAwareness.on.mock.calls.find(
        call => call[0] === 'change'
      )[1];
      
      act(() => awarenessCallback());
      
      // Should only count other users
      expect(screen.getByText('1 collaborator online')).toBeInTheDocument();
    });
  });

  describe('Auto-save Functionality', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('auto-saves content after delay when enabled', async () => {
      vi.useFakeTimers();
      
      render(
        <CollaborativeEditor 
          {...defaultProps} 
          autoSave={true} 
        />
      );
      
      // Fast-forward timers
      act(() => {
        vi.advanceTimersByTime(2500);
      });
      
      expect(global.fetch).toHaveBeenCalledWith('/api/documents/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: 'test-doc-123',
          content: 'Initial content',
          userId: 'test-user-1'
        })
      });
      
      vi.useRealTimers();
    });

    it('does not auto-save when disabled', async () => {
      vi.useFakeTimers();
      
      render(
        <CollaborativeEditor 
          {...defaultProps} 
          autoSave={false} 
        />
      );
      
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      
      expect(global.fetch).not.toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('shows login prompt when user is not authenticated', () => {
      vi.mocked(require('@/hooks/useAuth').useAuth).mockReturnValue({ user: null });
      
      render(<CollaborativeEditor {...defaultProps} />);
      
      expect(screen.getByText('Please log in to access collaborative editing')).toBeInTheDocument();
    });

    it('provides retry functionality on connection failure', async () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      // Simulate error
      const errorCallback = mockProvider.on.mock.calls.find(
        call => call[0] === 'connection-error'
      )[1];
      
      act(() => errorCallback(new Error('Network error')));
      
      const retryButton = screen.getByText('Retry Connection');
      expect(retryButton).toBeInTheDocument();
      
      // Click retry should reinitialize connection
      fireEvent.click(retryButton);
      
      // Should attempt to create new connection
      expect(WebsocketProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      const editor = screen.getByLabelText('Collaborative editor');
      expect(editor).toBeInTheDocument();
      
      const status = screen.getByText('disconnected').closest('[id="editor-status"]');
      expect(status).toHaveAttribute('id', 'editor-status');
      expect(editor).toHaveAttribute('aria-describedby', 'editor-status');
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<CollaborativeEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      
      await user.tab();
      expect(editor).toHaveFocus();
      
      await user.keyboard('Hello World');
      expect(editor).toHaveValue('Hello World');
    });
  });

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile viewports', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      render(<CollaborativeEditor {...defaultProps} />);
      
      // Mobile-specific classes should be applied
      const toolbar = screen.getByRole('textbox').parentElement;
      expect(toolbar).toHaveClass('rounded-xl');
    });
  });

  describe('Performance', () => {
    it('cleans up resources on unmount', () => {
      const { unmount } = render(<CollaborativeEditor {...defaultProps} />);
      
      unmount();
      
      expect(mockProvider.disconnect).toHaveBeenCalled();
      expect(mockYDoc.destroy).toHaveBeenCalled();
    });

    it('handles rapid text changes efficiently', async () => {
      const user = userEvent.setup();
      const onContentChange = vi.fn();
      
      render(
        <CollaborativeEditor 
          {...defaultProps} 
          onContentChange={onContentChange} 
        />
      );
      
      const editor = screen.getByRole('textbox');
      
      // Rapid typing simulation
      for (let i = 0; i < 10; i++) {
        await user.type(editor, `${i}`);
      }
      
      // Should not overwhelm the callback
      await waitFor(() => {
        expect(onContentChange.mock.calls.length).toBeLessThan(50);
      });
    });
  });

  describe('Character Count and Status', () => {
    it('displays accurate character count', async () => {
      render(<CollaborativeEditor {...defaultProps} />);
      
      // Should show initial content length
      expect(screen.getByText('15 characters')).toBeInTheDocument();
    });

    it('shows auto-save status when enabled', () => {
      render(
        <CollaborativeEditor 
          {...defaultProps} 
          autoSave={true} 
        />
      );
      
      expect(screen.getByText('Auto-save enabled')).toBeInTheDocument();
    });
  });
});

// Integration test with multiple components
describe('CollaborativeEditor Integration', () => {
  it('integrates with PresenceIndicator and UserCursor components', async () => {
    const { container } = render(
      <CollaborativeEditor 
        {...defaultProps} 
        showPresence={true} 
      />
    );
    
    // Should render presence indicator
    const presenceIndicator = container.querySelector('[class*="PresenceIndicator"]');
    expect(presenceIndicator).toBeInTheDocument();
  });
});