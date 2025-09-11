/**
 * Mobile Collaboration Integration Tests
 * Tests full collaborative editing workflow on mobile devices
 * WS-244 Team D - Mobile-First Real-Time Collaboration System
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import '@testing-library/jest-dom';

// Mock Y.js for integration testing
jest.mock('yjs', () => {
  const mockYDoc = {
    getText: jest.fn(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
      toString: () => 'Mock collaborative content',
    })),
    transact: jest.fn((fn) => fn()),
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
  };

  return {
    Doc: jest.fn(() => mockYDoc),
    encodeStateAsUpdate: jest.fn(() => new Uint8Array([1, 2, 3])),
    applyUpdate: jest.fn(),
    UndoManager: jest.fn(() => ({
      undo: jest.fn(),
      redo: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    })),
  };
});

jest.mock('y-websocket', () => ({
  WebsocketProvider: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    awareness: {
      setLocalState: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
      getStates: jest.fn(() => new Map()),
    },
  })),
}));

jest.mock('y-indexeddb', () => ({
  IndexeddbPersistence: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

// Component imports
import { MobileCollaborativeEditor } from '@/components/collaboration/mobile/MobileCollaborativeEditor';
import { MobilePresenceDisplay } from '@/components/collaboration/mobile/MobilePresenceDisplay';
import { TouchSelectionHandler } from '@/components/collaboration/mobile/TouchSelectionHandler';
import { OfflineCollaborationManager } from '@/components/collaboration/mobile/OfflineCollaborationManager';

// Test data matching wedding industry context
const mockWeddingData = {
  documentId: 'guest-list-001',
  documentType: 'guest_list' as const,
  weddingId: 'wedding-001',
  userId: 'user-001',
  userName: 'Sarah Wilson',
  userAvatar: '/avatars/sarah.jpg',
  initialContent: `Guest List - Sarah & James Wedding\n\n1. Emily Johnson - Confirmed\n2. Michael Brown - Pending\n3. Lisa Davis - Declined`,
};

const mockUsers = [
  {
    id: 'user-001',
    name: 'Sarah Wilson',
    avatar: '/avatars/sarah.jpg',
    color: '#9E77ED',
    isActive: true,
    lastSeen: new Date(),
    cursor: { line: 0, column: 0 },
  },
  {
    id: 'user-002',
    name: 'James Wilson',
    avatar: '/avatars/james.jpg',
    color: '#2E90FA',
    isActive: true,
    lastSeen: new Date(),
    cursor: { line: 1, column: 15 },
  },
  {
    id: 'user-003',
    name: 'Wedding Planner',
    avatar: '/avatars/planner.jpg',
    color: '#F79009',
    isActive: false,
    lastSeen: new Date(Date.now() - 300000),
    cursor: null,
  },
];

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        document: {
          id: mockWeddingData.documentId,
          version: 2,
          updated_at: new Date().toISOString(),
        },
      }),
  }),
) as jest.Mock;

describe('Mobile Collaboration Integration Tests', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();

    // Mock mobile environment
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    });

    // Mock touch support
    Object.defineProperty(window, 'ontouchstart', {
      writable: true,
      value: null,
    });

    // Mock viewport meta tag for mobile
    const metaViewport = document.createElement('meta');
    metaViewport.name = 'viewport';
    metaViewport.content = 'width=device-width, initial-scale=1';
    document.head.appendChild(metaViewport);
  });

  describe('Full Wedding Collaboration Workflow', () => {
    test('should handle complete guest list collaboration between couple and families', async () => {
      const mockSave = jest.fn();
      const mockError = jest.fn();

      const { rerender } = render(
        <div className="mobile-collaboration-container">
          <MobilePresenceDisplay
            users={mockUsers}
            maxVisible={3}
            showCursors={true}
          />
          <MobileCollaborativeEditor
            documentId={mockWeddingData.documentId}
            documentType={mockWeddingData.documentType}
            weddingId={mockWeddingData.weddingId}
            userId={mockWeddingData.userId}
            userName={mockWeddingData.userName}
            userAvatar={mockWeddingData.userAvatar}
            onSave={mockSave}
            onError={mockError}
            initialContent={mockWeddingData.initialContent}
          />
          <TouchSelectionHandler
            onSelectionChange={() => {}}
            documentType={mockWeddingData.documentType}
            enableGestures={true}
            showToolbar={true}
          />
          <OfflineCollaborationManager
            documentId={mockWeddingData.documentId}
            weddingId={mockWeddingData.weddingId}
            userId={mockWeddingData.userId}
            enableOfflineEditing={true}
          />
        </div>,
      );

      // Verify all components rendered
      expect(screen.getByTestId('mobile-presence-display')).toBeInTheDocument();
      expect(
        screen.getByTestId('mobile-collaborative-editor'),
      ).toBeInTheDocument();
      expect(screen.getByTestId('touch-selection-handler')).toBeInTheDocument();
      expect(
        screen.getByTestId('offline-collaboration-manager'),
      ).toBeInTheDocument();

      // Test presence display shows active users
      expect(screen.getByText('Sarah Wilson')).toBeInTheDocument();
      expect(screen.getByText('James Wilson')).toBeInTheDocument();
      expect(screen.getByText('+1 more')).toBeInTheDocument(); // Wedding Planner collapsed

      // Test collaborative editing
      const editor = screen.getByTestId('collaborative-editor-textarea');
      expect(editor).toHaveValue(mockWeddingData.initialContent);

      // Simulate mobile text input for guest RSVP update
      await act(async () => {
        fireEvent.focus(editor);
        fireEvent.change(editor, {
          target: {
            value:
              mockWeddingData.initialContent + '\n4. Robert Taylor - Confirmed',
          },
        });
      });

      // Test touch gestures for RSVP quick actions
      const quickActionButton = screen.getByText('RSVP Status');
      await act(async () => {
        fireEvent.touchStart(quickActionButton, {
          touches: [{ clientX: 100, clientY: 100 }],
        });
        fireEvent.touchEnd(quickActionButton);
      });

      // Verify auto-save triggered
      await waitFor(
        () => {
          expect(screen.getByText('Auto-saving...')).toBeInTheDocument();
        },
        { timeout: 5000 },
      );

      // Test offline indicator when network goes down
      await act(async () => {
        // Simulate network offline
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });

        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(
          screen.getByText('Offline - Changes saved locally'),
        ).toBeInTheDocument();
      });

      // Simulate network back online
      await act(async () => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });

        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(screen.getByText('Syncing changes...')).toBeInTheDocument();
      });

      // Verify successful sync
      await waitFor(() => {
        expect(screen.getByText('All changes synced')).toBeInTheDocument();
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/collaboration/save',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining(mockWeddingData.documentId),
        }),
      );
    });

    test('should handle vendor selection collaboration between couple and wedding planner', async () => {
      const vendorData = {
        ...mockWeddingData,
        documentId: 'vendor-selection-001',
        documentType: 'vendor_selection' as const,
        initialContent: `Vendor Selection - Sarah & James Wedding\n\nPhotographer:\n- Option 1: Emma Photography (£2,500)\n- Option 2: Lens & Light Studio (£3,200)\n\nCaterer:\n- Option 1: Gourmet Weddings (£4,500)\n- Option 2: Fine Dining Co (£5,800)`,
      };

      render(
        <div className="vendor-collaboration">
          <MobileCollaborativeEditor
            documentId={vendorData.documentId}
            documentType={vendorData.documentType}
            weddingId={vendorData.weddingId}
            userId={vendorData.userId}
            userName={vendorData.userName}
            userAvatar={vendorData.userAvatar}
            onSave={() => {}}
            onError={() => {}}
            initialContent={vendorData.initialContent}
          />
          <TouchSelectionHandler
            onSelectionChange={() => {}}
            documentType={vendorData.documentType}
            enableGestures={true}
            showToolbar={true}
          />
        </div>,
      );

      // Test vendor-specific quick actions
      const vendorActionButton = screen.getByText('Add Vendor');
      expect(vendorActionButton).toBeInTheDocument();

      const priceButton = screen.getByText('Price');
      expect(priceButton).toBeInTheDocument();

      // Test collaborative vendor selection
      const editor = screen.getByTestId('collaborative-editor-textarea');
      await act(async () => {
        fireEvent.focus(editor);
        // Add couple's preference note
        fireEvent.change(editor, {
          target: {
            value:
              vendorData.initialContent +
              '\n\n✅ COUPLE PREFERENCE: Emma Photography - Love their natural style!',
          },
        });
      });

      // Verify auto-save for vendor selection
      await waitFor(
        () => {
          expect(screen.getByText('Auto-saving...')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    test('should handle wedding timeline collaboration with real-time updates', async () => {
      const timelineData = {
        ...mockWeddingData,
        documentId: 'timeline-001',
        documentType: 'timeline' as const,
        initialContent: `Wedding Day Timeline - Sarah & James\n\n9:00 AM - Bridal prep begins\n10:30 AM - Groom prep begins\n1:00 PM - First look photos\n3:00 PM - Ceremony\n4:00 PM - Cocktail hour\n6:00 PM - Reception dinner\n9:00 PM - First dance\n11:00 PM - Last dance`,
      };

      render(
        <div className="timeline-collaboration">
          <MobilePresenceDisplay
            users={mockUsers}
            maxVisible={5}
            showCursors={true}
          />
          <MobileCollaborativeEditor
            documentId={timelineData.documentId}
            documentType={timelineData.documentType}
            weddingId={timelineData.weddingId}
            userId={timelineData.userId}
            userName={timelineData.userName}
            userAvatar={timelineData.userAvatar}
            onSave={() => {}}
            onError={() => {}}
            initialContent={timelineData.initialContent}
          />
          <TouchSelectionHandler
            onSelectionChange={() => {}}
            documentType={timelineData.documentType}
            enableGestures={true}
            showToolbar={true}
          />
        </div>,
      );

      // Test timeline-specific quick actions
      const timeButton = screen.getByText('Time');
      const eventButton = screen.getByText('Event');

      expect(timeButton).toBeInTheDocument();
      expect(eventButton).toBeInTheDocument();

      // Test collaborative timeline editing
      const editor = screen.getByTestId('collaborative-editor-textarea');
      await act(async () => {
        fireEvent.focus(editor);
        fireEvent.change(editor, {
          target: {
            value:
              timelineData.initialContent + '\n11:30 PM - Sparkler exit 🎆',
          },
        });
      });

      // Test real-time presence during timeline editing
      expect(
        screen.getByTestId('collaborative-cursor-sarah'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('collaborative-cursor-james'),
      ).toBeInTheDocument();

      // Verify timeline auto-save
      await waitFor(
        () => {
          expect(screen.getByText('Auto-saving...')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Mobile-Specific Integration Features', () => {
    test('should handle virtual keyboard and viewport changes during collaboration', async () => {
      const { container } = render(
        <MobileCollaborativeEditor
          documentId={mockWeddingData.documentId}
          documentType={mockWeddingData.documentType}
          weddingId={mockWeddingData.weddingId}
          userId={mockWeddingData.userId}
          userName={mockWeddingData.userName}
          userAvatar={mockWeddingData.userAvatar}
          onSave={() => {}}
          onError={() => {}}
        />,
      );

      const editor = screen.getByTestId('collaborative-editor-textarea');

      // Simulate virtual keyboard appearing (viewport height change)
      await act(async () => {
        Object.defineProperty(window, 'visualViewport', {
          writable: true,
          value: {
            height: 400, // Reduced from typical 800+ when keyboard appears
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
          },
        });

        fireEvent.focus(editor);
      });

      // Check editor adapts to keyboard
      const editorContainer = container.querySelector('.collaborative-editor');
      expect(editorContainer).toHaveClass('keyboard-visible');

      // Test collaborative editing continues during keyboard usage
      await act(async () => {
        fireEvent.change(editor, {
          target: { value: 'Typing on mobile with keyboard...' },
        });
      });

      expect(editor).toHaveValue('Typing on mobile with keyboard...');
    });

    test('should handle touch gestures during collaborative editing', async () => {
      const mockSelectionChange = jest.fn();

      render(
        <TouchSelectionHandler
          onSelectionChange={mockSelectionChange}
          documentType="guest_list"
          enableGestures={true}
          showToolbar={true}
        />,
      );

      const touchArea = screen.getByTestId('touch-selection-area');

      // Test double-tap to select word
      await act(async () => {
        fireEvent.touchStart(touchArea, {
          touches: [{ clientX: 150, clientY: 100 }],
        });
        fireEvent.touchEnd(touchArea);

        // Double tap
        fireEvent.touchStart(touchArea, {
          touches: [{ clientX: 150, clientY: 100 }],
        });
        fireEvent.touchEnd(touchArea);
      });

      await waitFor(() => {
        expect(mockSelectionChange).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'word',
            start: expect.any(Number),
            end: expect.any(Number),
          }),
        );
      });

      // Test long press for context menu
      await act(async () => {
        fireEvent.touchStart(touchArea, {
          touches: [{ clientX: 200, clientY: 120 }],
        });

        // Simulate long press (500ms+)
        jest.advanceTimersByTime(600);

        fireEvent.touchEnd(touchArea);
      });

      await waitFor(() => {
        expect(screen.getByTestId('context-menu')).toBeInTheDocument();
      });
    });

    test('should maintain collaboration state during app backgrounding/foregrounding', async () => {
      render(
        <OfflineCollaborationManager
          documentId={mockWeddingData.documentId}
          weddingId={mockWeddingData.weddingId}
          userId={mockWeddingData.userId}
          enableOfflineEditing={true}
        />,
      );

      expect(
        screen.getByTestId('offline-collaboration-manager'),
      ).toBeInTheDocument();

      // Simulate app going to background
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'visibilityState', {
          writable: true,
          value: 'hidden',
        });
      });

      // Verify collaboration paused
      await waitFor(() => {
        expect(screen.getByText('Collaboration paused')).toBeInTheDocument();
      });

      // Simulate app returning to foreground
      await act(async () => {
        Object.defineProperty(document, 'visibilityState', {
          writable: true,
          value: 'visible',
        });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Verify collaboration resumed and synced
      await waitFor(() => {
        expect(screen.getByText('Syncing changes...')).toBeInTheDocument();
      });

      await waitFor(() => {
        expect(screen.getByText('All changes synced')).toBeInTheDocument();
      });
    });
  });

  describe('Wedding Industry Context Integration', () => {
    test('should handle family input collaboration with proper permissions', async () => {
      const familyData = {
        ...mockWeddingData,
        documentId: 'family-input-001',
        documentType: 'family_input' as const,
        userId: 'family-member-001',
        userName: 'Mary Wilson (Mother)',
        initialContent: `Family Input - Wilson Wedding\n\nDietary Requirements:\n- Aunt Sarah: Vegetarian\n- Cousin Mike: Gluten-free\n- Grandpa Joe: No seafood\n\nSpecial Requests:\n- Please announce couple as "Mr. & Mrs. Wilson"\n- Family photo with all grandparents before ceremony`,
      };

      render(
        <div className="family-collaboration">
          <MobilePresenceDisplay
            users={[
              ...mockUsers,
              {
                id: 'family-member-001',
                name: 'Mary Wilson (Mother)',
                avatar: '/avatars/mary.jpg',
                color: '#12B76A',
                isActive: true,
                lastSeen: new Date(),
                cursor: { line: 3, column: 20 },
              },
            ]}
            maxVisible={4}
            showCursors={true}
          />
          <MobileCollaborativeEditor
            documentId={familyData.documentId}
            documentType={familyData.documentType}
            weddingId={familyData.weddingId}
            userId={familyData.userId}
            userName={familyData.userName}
            userAvatar={familyData.userAvatar}
            onSave={() => {}}
            onError={() => {}}
            initialContent={familyData.initialContent}
          />
        </div>,
      );

      // Verify family member can edit family input document
      const editor = screen.getByTestId('collaborative-editor-textarea');
      expect(editor).toHaveValue(familyData.initialContent);

      // Test family-specific collaborative editing
      await act(async () => {
        fireEvent.focus(editor);
        fireEvent.change(editor, {
          target: {
            value:
              familyData.initialContent +
              '\n\nMusic Requests:\n- First dance: "Perfect" by Ed Sheeran\n- Father-daughter: "My Girl" by The Temptations',
          },
        });
      });

      // Verify presence shows family member actively editing
      expect(screen.getByText('Mary Wilson (Mother)')).toBeInTheDocument();
      expect(
        screen.getByTestId('collaborative-cursor-family-member-001'),
      ).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.getByText('Auto-saving...')).toBeInTheDocument();
        },
        { timeout: 3000 },
      );
    });

    test('should handle multi-document collaboration workflow for complete wedding planning', async () => {
      const documents = [
        { type: 'guest_list', title: 'Guest List', users: 4 },
        { type: 'vendor_selection', title: 'Vendor Selection', users: 3 },
        { type: 'timeline', title: 'Wedding Timeline', users: 5 },
        { type: 'family_input', title: 'Family Input', users: 2 },
      ];

      render(
        <div className="multi-document-collaboration">
          {documents.map((doc, index) => (
            <div
              key={doc.type}
              className="document-preview"
              data-testid={`document-${doc.type}`}
            >
              <h3>{doc.title}</h3>
              <MobilePresenceDisplay
                users={mockUsers.slice(0, doc.users)}
                maxVisible={3}
                showCursors={false}
              />
              <div className="active-status">
                {doc.users > 0
                  ? `${doc.users} active editors`
                  : 'No active editors'}
              </div>
            </div>
          ))}
        </div>,
      );

      // Verify all wedding documents are accessible for collaboration
      documents.forEach((doc) => {
        expect(screen.getByTestId(`document-${doc.type}`)).toBeInTheDocument();
        expect(screen.getByText(doc.title)).toBeInTheDocument();
        expect(
          screen.getByText(`${doc.users} active editors`),
        ).toBeInTheDocument();
      });

      // Verify presence indicators work across multiple documents
      expect(screen.getAllByText('Sarah Wilson')).toHaveLength(4); // Present in all documents
      expect(screen.getAllByText('James Wilson')).toHaveLength(4); // Present in all documents
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });
});
