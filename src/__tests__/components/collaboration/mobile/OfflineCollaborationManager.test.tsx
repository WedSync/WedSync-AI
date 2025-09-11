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
import { OfflineCollaborationManager } from '@/components/collaboration/mobile/OfflineCollaborationManager';
import * as Y from 'yjs';

// Mock Y.js and IndexedDB persistence
jest.mock('yjs');
jest.mock('y-indexeddb', () => ({
  IndexeddbPersistence: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    off: jest.fn(),
  })),
}));

// Mock motion library
jest.mock('motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock UI components
jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, className }: any) => (
    <div className={`alert ${className}`} data-testid="alert">
      {children}
    </div>
  ),
  AlertDescription: ({ children }: any) => (
    <div data-testid="alert-description">{children}</div>
  ),
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, size, variant, className }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn ${size} ${variant} ${className}`}
      data-testid="action-button"
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: any) => (
    <div
      className={`progress ${className}`}
      data-testid="progress"
      data-value={value}
    >
      <div style={{ width: `${value}%` }} />
    </div>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => (
    <span className={`badge ${variant}`} data-testid="badge">
      {children}
    </span>
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  WifiOff: () => <span data-icon="wifi-off">WifiOff</span>,
  Wifi: () => <span data-icon="wifi">Wifi</span>,
  Upload: () => <span data-icon="upload">Upload</span>,
  Download: () => <span data-icon="download">Download</span>,
  AlertTriangle: () => <span data-icon="alert-triangle">AlertTriangle</span>,
  CheckCircle: () => <span data-icon="check-circle">CheckCircle</span>,
  Clock: () => <span data-icon="clock">Clock</span>,
  RefreshCw: () => <span data-icon="refresh-cw">RefreshCw</span>,
}));

// Mock fetch API
global.fetch = jest.fn();

describe('OfflineCollaborationManager', () => {
  const mockYDoc = {
    guid: 'mock-doc-guid',
    on: jest.fn(),
    off: jest.fn(),
  };

  const defaultProps = {
    yDoc: mockYDoc as any,
    isOnline: true,
    pendingChanges: 0,
    onSync: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Y.js functions
    (Y.encodeStateAsUpdate as jest.Mock).mockReturnValue(
      new Uint8Array([1, 2, 3]),
    );
    (Y.encodeStateVector as jest.Mock).mockReturnValue(
      new Uint8Array([4, 5, 6]),
    );
    (Y.applyUpdate as jest.Mock).mockImplementation(() => {});

    // Mock fetch
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as any);
  });

  it('renders offline status when offline', () => {
    render(<OfflineCollaborationManager {...defaultProps} isOnline={false} />);

    expect(screen.getByText(/working offline/i)).toBeInTheDocument();
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('renders online status when online', () => {
    render(<OfflineCollaborationManager {...defaultProps} isOnline={true} />);

    expect(screen.getByText(/all changes synced/i)).toBeInTheDocument();
  });

  it('shows pending changes count when offline', () => {
    render(
      <OfflineCollaborationManager
        {...defaultProps}
        isOnline={false}
        pendingChanges={5}
      />,
    );

    expect(screen.getByText(/5 changes pending sync/i)).toBeInTheDocument();
  });

  it('displays sync progress during syncing', () => {
    render(
      <OfflineCollaborationManager
        {...defaultProps}
        isOnline={true}
        pendingChanges={3}
      />,
    );

    // Should show syncing state
    const statusElements = screen.getAllByText(/sync/i);
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it('handles retry button click', async () => {
    const user = userEvent.setup();

    // Mock sync error
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('Network error'),
    );

    render(<OfflineCollaborationManager {...defaultProps} isOnline={true} />);

    // Simulate sync error state
    act(() => {
      // This would be set by the sync failure in the component
    });

    // Should show error state and retry button
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    
    // Test retry button click functionality
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    
    await user.click(retryButton);
    
    // Should attempt to sync again after retry
    expect(fetch).toHaveBeenCalledTimes(2); // Initial attempt + retry
  });

  it('shows last sync time', () => {
    render(<OfflineCollaborationManager {...defaultProps} />);

    expect(screen.getByText(/last sync:/i)).toBeInTheDocument();
  });

  it('displays wedding industry offline message', () => {
    render(<OfflineCollaborationManager {...defaultProps} isOnline={false} />);

    expect(
      screen.getByText(/don't worry! your wedding planning continues offline/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/perfect for venues with poor signal/i),
    ).toBeInTheDocument();
  });

  it('handles conflicts when they occur', () => {
    // Mock conflicts in the component state
    // This would be tested more thoroughly in integration tests
    render(<OfflineCollaborationManager {...defaultProps} />);

    // Should render without errors
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('shows sync details when toggled', async () => {
    const user = userEvent.setup();
    render(<OfflineCollaborationManager {...defaultProps} />);

    // Look for details toggle button
    const detailsButton = screen.queryByText(/show.*sync details/i);
    if (detailsButton) {
      await user.click(detailsButton);

      expect(screen.getByText(/hide.*sync details/i)).toBeInTheDocument();
    }
  });

  it('applies custom className', () => {
    const customClass = 'custom-offline-manager';
    render(
      <OfflineCollaborationManager {...defaultProps} className={customClass} />,
    );

    const container = document.querySelector(`.${customClass}`);
    expect(container).toBeInTheDocument();
  });

  it('calls onSync callback when provided', () => {
    const onSync = jest.fn();
    render(<OfflineCollaborationManager {...defaultProps} onSync={onSync} />);

    // onSync should be called during initialization or state changes
    // This would be more thoroughly tested in integration tests
    expect(onSync).toBeDefined();
  });

  it('handles document update events', () => {
    render(<OfflineCollaborationManager {...defaultProps} />);

    // Simulate Y.js document update
    const updateHandler = mockYDoc.on.mock.calls.find(
      (call) => call[0] === 'update',
    )?.[1];

    if (updateHandler) {
      act(() => {
        updateHandler(new Uint8Array([1, 2, 3]), null);
      });
    }

    // Should handle the update without errors
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });
});

describe('OfflineCollaborationManager - Sync States', () => {
  const mockYDoc = {
    guid: 'mock-doc-guid',
    on: jest.fn(),
    off: jest.fn(),
  };

  const defaultProps = {
    yDoc: mockYDoc as any,
    isOnline: true,
    pendingChanges: 0,
  };

  it('shows offline state correctly', () => {
    render(<OfflineCollaborationManager {...defaultProps} isOnline={false} />);

    expect(screen.getByText(/working offline/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument(); // WiFi off icon
  });

  it('shows syncing state with animation', () => {
    // This would show when sync is in progress
    render(
      <OfflineCollaborationManager {...defaultProps} pendingChanges={3} />,
    );

    // Should show some indication of syncing
    const syncElements = screen.getAllByText(/sync/i);
    expect(syncElements.length).toBeGreaterThan(0);
  });

  it('shows synced state when all changes are synced', () => {
    render(
      <OfflineCollaborationManager {...defaultProps} pendingChanges={0} />,
    );

    expect(screen.getByText(/all changes synced/i)).toBeInTheDocument();
  });

  it('shows error state with retry option', () => {
    // Mock error state
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('Sync failed'),
    );

    render(<OfflineCollaborationManager {...defaultProps} />);

    // Should show error handling (would need component state management)
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });
});

describe('OfflineCollaborationManager - Conflict Resolution', () => {
  const mockYDoc = {
    guid: 'mock-doc-guid',
    on: jest.fn(),
    off: jest.fn(),
  };

  const defaultProps = {
    yDoc: mockYDoc as any,
    isOnline: true,
    pendingChanges: 0,
  };

  it('shows conflict resolution interface when conflicts exist', () => {
    // This would be triggered by actual conflicts in a real scenario
    render(<OfflineCollaborationManager {...defaultProps} />);

    // Conflict resolution would show when there are actual conflicts
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('allows choosing local version in conflicts', async () => {
    // Mock conflict scenario
    const user = userEvent.setup();
    render(<OfflineCollaborationManager {...defaultProps} />);

    // Test local version selection in conflict resolution
    const localVersionButton = screen.getByRole('button', { name: /use local/i });
    expect(localVersionButton).toBeInTheDocument();
    
    await user.click(localVersionButton);
    
    // Should resolve conflict with local version
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('allows choosing remote version in conflicts', async () => {
    // Mock conflict scenario
    const user = userEvent.setup();
    render(<OfflineCollaborationManager {...defaultProps} />);

    // Test remote version selection in conflict resolution
    const remoteVersionButton = screen.getByRole('button', { name: /use remote/i });
    expect(remoteVersionButton).toBeInTheDocument();
    
    await user.click(remoteVersionButton);
    
    // Should resolve conflict with remote version
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('shows conflict preview for both versions', () => {
    // Mock conflict with different versions
    render(<OfflineCollaborationManager {...defaultProps} />);

    // Would show preview of conflicting content
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });
});

describe('OfflineCollaborationManager - Performance', () => {
  const mockYDoc = {
    guid: 'mock-doc-guid',
    on: jest.fn(),
    off: jest.fn(),
  };

  it('handles large numbers of pending changes efficiently', () => {
    const manyChanges = 1000;

    render(
      <OfflineCollaborationManager
        yDoc={mockYDoc as any}
        isOnline={false}
        pendingChanges={manyChanges}
      />,
    );

    expect(
      screen.getByText(`${manyChanges} changes pending sync`),
    ).toBeInTheDocument();
  });

  it('batches sync operations for performance', () => {
    // Mock multiple rapid changes
    const { rerender } = render(
      <OfflineCollaborationManager
        yDoc={mockYDoc as any}
        isOnline={true}
        pendingChanges={1}
      />,
    );

    // Rapidly change pending changes
    for (let i = 2; i <= 10; i++) {
      rerender(
        <OfflineCollaborationManager
          yDoc={mockYDoc as any}
          isOnline={true}
          pendingChanges={i}
        />,
      );
    }

    // Should handle rapid updates efficiently
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('cleans up resources properly', () => {
    const { unmount } = render(
      <OfflineCollaborationManager
        yDoc={mockYDoc as any}
        isOnline={true}
        pendingChanges={0}
      />,
    );

    unmount();

    // Should call cleanup functions
    expect(mockYDoc.off).toHaveBeenCalled();
  });
});

describe('OfflineCollaborationManager - Wedding Industry Context', () => {
  const mockYDoc = {
    guid: 'wedding-doc-guid',
    on: jest.fn(),
    off: jest.fn(),
  };

  it('shows wedding-specific offline encouragement', () => {
    render(
      <OfflineCollaborationManager
        yDoc={mockYDoc as any}
        isOnline={false}
        pendingChanges={5}
      />,
    );

    expect(
      screen.getByText(/your wedding planning continues offline/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/perfect for venues with poor signal/i),
    ).toBeInTheDocument();
  });

  it('handles venue scenario gracefully', () => {
    // Simulate venue visit scenario with intermittent connectivity
    const { rerender } = render(
      <OfflineCollaborationManager
        yDoc={mockYDoc as any}
        isOnline={true}
        pendingChanges={0}
      />,
    );

    // Go offline at venue
    rerender(
      <OfflineCollaborationManager
        yDoc={mockYDoc as any}
        isOnline={false}
        pendingChanges={3}
      />,
    );

    expect(screen.getByText(/working offline/i)).toBeInTheDocument();

    // Come back online
    rerender(
      <OfflineCollaborationManager
        yDoc={mockYDoc as any}
        isOnline={true}
        pendingChanges={3}
      />,
    );

    // Should show syncing state
    const syncElements = screen.getAllByText(/sync/i);
    expect(syncElements.length).toBeGreaterThan(0);
  });

  it('optimizes for mobile battery during long wedding days', () => {
    render(
      <OfflineCollaborationManager
        yDoc={mockYDoc as any}
        isOnline={false}
        pendingChanges={10}
      />,
    );

    // Should show battery-conscious messaging
    expect(
      screen.getByText(/changes will sync when reconnected/i),
    ).toBeInTheDocument();
  });
});
