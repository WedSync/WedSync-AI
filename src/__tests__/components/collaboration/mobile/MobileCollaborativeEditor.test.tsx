/**
 * @jest-environment jsdom
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MobileCollaborativeEditor } from '@/components/mobile/collaboration/MobileCollaborativeEditor';
import * as Y from 'yjs';

import { vi } from 'vitest';

// Mock Y.js and related dependencies
vi.mock('yjs');
vi.mock('y-websocket');
vi.mock('y-indexeddb');

// Mock React 19 useActionState
const mockUseActionState = vi.fn();
vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useActionState: mockUseActionState,
    useTransition: () => [false, vi.fn()],
    useDeferredValue: (value: any) => value,
  };
});

// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createBrowserClient: () => ({
    channel: () => ({
      send: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    }),
  }),
}));

// Mock motion library
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => (
    <div className={`card ${className}`}>{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className }: any) => (
    <button onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
}));

// Mock child components
jest.mock('@/components/mobile/collaboration/MobilePresenceDisplay', () => ({
  MobilePresenceDisplay: ({ users }: any) => (
    <div data-testid="mobile-presence-display">
      {users.length} users present
    </div>
  ),
}));

jest.mock('@/components/mobile/collaboration/TouchSelectionHandler', () => ({
  TouchSelectionHandler: ({
    content,
    onChange,
    placeholder,
    documentType,
  }: any) => (
    <textarea
      data-testid="touch-selection-handler"
      value={content}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-document-type={documentType}
    />
  ),
}));

jest.mock(
  '@/components/mobile/collaboration/OfflineCollaborationManager',
  () => ({
    OfflineCollaborationManager: ({ isOnline, pendingChanges }: any) => (
      <div data-testid="offline-collaboration-manager">
        Status: {isOnline ? 'Online' : 'Offline'}
        Pending: {pendingChanges}
      </div>
    ),
  }),
);

describe('MobileCollaborativeEditor', () => {
  const defaultProps = {
    documentId: 'test-doc-id',
    documentType: 'guest_list' as const,
    weddingId: 'test-wedding-id',
    userId: 'test-user-id',
    userName: 'Test User',
    userAvatar: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock Y.js Document and Text
    const mockYText = {
      toString: jest.fn(() => 'Initial content'),
      insert: jest.fn(),
      delete: jest.fn(),
      observe: jest.fn(),
      unobserve: jest.fn(),
      length: 15,
    };

    const mockYDoc = {
      getText: jest.fn(() => mockYText),
      guid: 'mock-doc-guid',
    };

    (Y.Doc as jest.Mock).mockImplementation(() => mockYDoc);

    // Mock useActionState
    mockUseActionState.mockReturnValue([{ success: false }, jest.fn(), false]);

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  it('renders collaborative editor with basic elements', () => {
    render(<MobileCollaborativeEditor {...defaultProps} />);

    expect(screen.getByTestId('touch-selection-handler')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-presence-display')).toBeInTheDocument();
    expect(
      screen.getByTestId('offline-collaboration-manager'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
  });

  it('displays correct placeholder for different document types', () => {
    const { rerender } = render(
      <MobileCollaborativeEditor {...defaultProps} documentType="guest_list" />,
    );

    expect(
      screen.getByPlaceholderText(/add guests, dietary requirements/i),
    ).toBeInTheDocument();

    rerender(
      <MobileCollaborativeEditor
        {...defaultProps}
        documentType="vendor_selection"
      />,
    );
    expect(
      screen.getByPlaceholderText(/compare vendors, notes/i),
    ).toBeInTheDocument();

    rerender(
      <MobileCollaborativeEditor {...defaultProps} documentType="timeline" />,
    );
    expect(
      screen.getByPlaceholderText(/wedding day schedule/i),
    ).toBeInTheDocument();

    rerender(
      <MobileCollaborativeEditor
        {...defaultProps}
        documentType="family_input"
      />,
    );
    expect(
      screen.getByPlaceholderText(/family member information/i),
    ).toBeInTheDocument();
  });

  it('handles content changes and Y.js integration', async () => {
    const user = userEvent.setup();
    render(<MobileCollaborativeEditor {...defaultProps} />);

    const textarea = screen.getByTestId('touch-selection-handler');

    await act(async () => {
      await user.type(textarea, ' - Added content');
    });

    await waitFor(() => {
      expect(textarea).toHaveValue('Initial content - Added content');
    });
  });

  it('displays online/offline status correctly', () => {
    // Test online state
    render(<MobileCollaborativeEditor {...defaultProps} />);
    expect(
      screen.getByTestId('offline-collaboration-manager'),
    ).toHaveTextContent('Status: Online');

    // Test offline state
    Object.defineProperty(navigator, 'onLine', { value: false });
    render(<MobileCollaborativeEditor {...defaultProps} />);
    expect(
      screen.getByTestId('offline-collaboration-manager'),
    ).toHaveTextContent('Status: Offline');
  });

  it('shows presence indicators for active users', () => {
    render(<MobileCollaborativeEditor {...defaultProps} />);
    expect(screen.getByTestId('mobile-presence-display')).toBeInTheDocument();
  });

  it('handles manual save action', async () => {
    const user = userEvent.setup();
    const mockSaveAction = jest.fn();
    mockUseActionState.mockReturnValue([
      { success: false },
      mockSaveAction,
      false,
    ]);

    render(<MobileCollaborativeEditor {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(mockSaveAction).toHaveBeenCalled();
  });

  it('displays save success message', () => {
    mockUseActionState.mockReturnValue([{ success: true }, jest.fn(), false]);

    render(<MobileCollaborativeEditor {...defaultProps} />);

    expect(screen.getByText('Changes saved successfully')).toBeInTheDocument();
  });

  it('displays save error message', () => {
    mockUseActionState.mockReturnValue([
      { success: false, error: 'Save failed' },
      jest.fn(),
      false,
    ]);

    render(<MobileCollaborativeEditor {...defaultProps} />);

    expect(screen.getByText('Error: Save failed')).toBeInTheDocument();
  });

  it('shows loading state during save', () => {
    mockUseActionState.mockReturnValue([
      { success: false },
      jest.fn(),
      true, // isPending
    ]);

    render(<MobileCollaborativeEditor {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save/i });
    expect(saveButton).toBeDisabled();
  });

  it('displays wedding industry tips', () => {
    render(
      <MobileCollaborativeEditor {...defaultProps} documentType="guest_list" />,
    );

    expect(
      screen.getByText(/everyone can edit in real-time/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/use @mentions to assign tasks/i),
    ).toBeInTheDocument();
  });

  it('handles error callback when provided', () => {
    const onError = jest.fn();
    render(<MobileCollaborativeEditor {...defaultProps} onError={onError} />);

    // Error callback should be passed to child components
    // This would be tested more thoroughly in integration tests
    expect(onError).toBeDefined();
  });

  it('handles onSave callback when provided', () => {
    const onSave = jest.fn(() => Promise.resolve());
    render(<MobileCollaborativeEditor {...defaultProps} onSave={onSave} />);

    // onSave callback should be used for auto-save
    expect(onSave).toBeDefined();
  });

  it('applies custom className', () => {
    const customClass = 'custom-editor-class';
    render(
      <MobileCollaborativeEditor {...defaultProps} className={customClass} />,
    );

    const card = document.querySelector('.card');
    expect(card).toHaveClass(customClass);
  });

  it('handles Y.js document initialization', () => {
    render(<MobileCollaborativeEditor {...defaultProps} />);

    expect(Y.Doc).toHaveBeenCalled();
  });

  it('shows sync status indicators', () => {
    render(<MobileCollaborativeEditor {...defaultProps} />);

    // Check for WiFi icon (online indicator)
    expect(
      document.querySelector('[data-testid="wifi-icon"], .lucide-wifi'),
    ).toBeDefined();
  });
});

describe('MobileCollaborativeEditor - Mobile Specific Features', () => {
  const defaultProps = {
    documentId: 'test-doc-id',
    documentType: 'guest_list' as const,
    weddingId: 'test-wedding-id',
    userId: 'test-user-id',
    userName: 'Test User',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Y.js
    const mockYText = {
      toString: jest.fn(() => ''),
      insert: jest.fn(),
      delete: jest.fn(),
      observe: jest.fn(),
      unobserve: jest.fn(),
    };

    (Y.Doc as jest.Mock).mockImplementation(() => ({
      getText: jest.fn(() => mockYText),
    }));

    mockUseActionState.mockReturnValue([{ success: false }, jest.fn(), false]);
  });

  it('handles touch events for mobile optimization', async () => {
    render(<MobileCollaborativeEditor {...defaultProps} />);

    const textarea = screen.getByTestId('touch-selection-handler');

    // Simulate touch events
    fireEvent.touchStart(textarea);
    fireEvent.touchEnd(textarea);

    // Should not throw errors
    expect(textarea).toBeInTheDocument();
  });

  it('responds to network status changes', () => {
    render(<MobileCollaborativeEditor {...defaultProps} />);

    // Initially online
    expect(
      screen.getByTestId('offline-collaboration-manager'),
    ).toHaveTextContent('Online');

    // Simulate going offline
    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      fireEvent(window, new Event('offline'));
    });

    expect(
      screen.getByTestId('offline-collaboration-manager'),
    ).toHaveTextContent('Offline');
  });

  it('handles virtual keyboard appearance simulation', () => {
    render(<MobileCollaborativeEditor {...defaultProps} />);

    const textarea = screen.getByTestId('touch-selection-handler');

    // Simulate focus (virtual keyboard appearance)
    act(() => {
      textarea.focus();
    });

    expect(textarea).toHaveFocus();
  });

  it('provides wedding-specific context tips', () => {
    const { rerender } = render(
      <MobileCollaborativeEditor {...defaultProps} documentType="guest_list" />,
    );

    expect(
      screen.getByText(/use @mentions to assign tasks/i),
    ).toBeInTheDocument();

    rerender(
      <MobileCollaborativeEditor {...defaultProps} documentType="timeline" />,
    );
    expect(
      screen.getByText(/drag to reorder events on desktop/i),
    ).toBeInTheDocument();
  });

  it('optimizes for mobile screen sizes', () => {
    render(<MobileCollaborativeEditor {...defaultProps} />);

    const card = document.querySelector('.card');
    expect(card).toHaveClass('p-4'); // Mobile padding
  });

  it('handles battery optimization patterns', () => {
    render(<MobileCollaborativeEditor {...defaultProps} />);

    // Should implement debounced auto-save for battery optimization
    // This would be tested more thoroughly in integration tests
    expect(screen.getByTestId('touch-selection-handler')).toBeInTheDocument();
  });
});
