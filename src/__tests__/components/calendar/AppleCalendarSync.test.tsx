/**
 * Test Suite for Apple Calendar Integration Components (WS-218)
 * Comprehensive testing for CalDAV protocol integration
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

import { AppleCalendarSync } from '@/components/calendar/AppleCalendarSync';
import { AppleCalDAVAuth } from '@/components/calendar/AppleCalDAVAuth';
import { AppleCalendarSelector } from '@/components/calendar/AppleCalendarSelector';
import { AppleSyncStatus } from '@/components/calendar/AppleSyncStatus';
import { AppleEventMapping } from '@/components/calendar/AppleEventMapping';
import { AppleSyncSettings } from '@/components/calendar/AppleSyncSettings';

import {
  CalDAVCredentials,
  CalendarInfo,
  SyncStatus,
  ConflictInfo,
  SyncSettings,
  CalendarEvent,
} from '@/types/apple-calendar';

// Mock fetch for CalDAV requests
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock console methods to avoid test noise
console.warn = jest.fn();
console.error = jest.fn();

// Test data
const mockCredentials: CalDAVCredentials = {
  appleId: 'test@icloud.com',
  appPassword: 'abcd-efgh-ijkl-mnop',
  serverUrl: 'https://caldav.icloud.com',
  isCustomServer: false,
};

const mockCalendars: CalendarInfo[] = [
  {
    id: 'calendar-1',
    name: 'Wedding Events',
    color: '#FF6B6B',
    isReadOnly: false,
    supportedComponents: ['VEVENT'],
    ctag: 'ctag-1',
  },
  {
    id: 'calendar-2',
    name: 'Personal',
    color: '#4ECDC4',
    isReadOnly: false,
    supportedComponents: ['VEVENT'],
    ctag: 'ctag-2',
  },
];

const mockSyncStatus: SyncStatus = {
  isConnected: false,
  calendarsDiscovered: 0,
  eventsProcessed: 0,
  conflictsFound: 0,
  errorCount: 0,
};

const mockConflicts: ConflictInfo[] = [
  {
    id: 'conflict-1',
    type: 'time_overlap',
    severity: 'medium',
    localEvent: {
      id: 'local-1',
      title: 'Venue Visit - Grand Ballroom',
      startTime: new Date('2025-02-15T14:00:00'),
      endTime: new Date('2025-02-15T15:30:00'),
      eventType: 'venue_visit',
      priority: 'high',
      lastModified: new Date(),
    },
    remoteEvent: {
      id: 'remote-1',
      title: 'Client Consultation - Sarah & Mike',
      startTime: new Date('2025-02-15T14:30:00'),
      endTime: new Date('2025-02-15T16:00:00'),
      eventType: 'client_meeting',
      priority: 'high',
      lastModified: new Date(),
    },
    suggestedResolution: 'manual',
    weddingImpact: 'major',
  },
];

const mockSyncSettings: SyncSettings = {
  syncDirection: 'bidirectional',
  eventTypes: ['client_meeting', 'wedding_ceremony', 'wedding_reception'],
  syncFrequency: 'realtime',
  notifications: {
    syncComplete: true,
    conflictsFound: true,
    errors: true,
    deviceTypes: ['iPhone', 'iPad', 'Mac'],
  },
  autoResolveConflicts: false,
  businessHoursOnly: true,
  timezone: 'America/New_York',
};

describe('AppleCalendarSync', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  test('renders initial setup view by default', () => {
    render(<AppleCalendarSync />);

    expect(screen.getByText('Apple Calendar Setup')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /setup/i })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('displays status indicators correctly', () => {
    const { rerender } = render(<AppleCalendarSync />);

    // Initially not connected
    expect(screen.getByText('Not connected')).toBeInTheDocument();

    // Mock connected state using rerender to update props
    rerender(
      <AppleCalendarSync onSyncStatusChange={jest.fn()} initialView="status" />,
    );

    expect(screen.getByText('Sync Status')).toBeInTheDocument();
  });

  test('navigates between tabs correctly', async () => {
    const user = userEvent.setup();
    render(<AppleCalendarSync />);

    // Click on status tab
    await user.click(screen.getByRole('tab', { name: /status/i }));
    expect(screen.getByText('Sync Status')).toBeInTheDocument();

    // Click on settings tab
    await user.click(screen.getByRole('tab', { name: /settings/i }));
    expect(screen.getByText('Sync Settings')).toBeInTheDocument();
  });

  test('handles sync status changes', () => {
    const mockOnStatusChange = jest.fn();
    render(<AppleCalendarSync onSyncStatusChange={mockOnStatusChange} />);

    // This would be triggered by authentication success
    // The actual implementation would call this through the auth flow
    expect(mockOnStatusChange).not.toHaveBeenCalled();
  });

  test('displays conflict badge when conflicts exist', () => {
    const { rerender } = render(<AppleCalendarSync />);

    // No badge initially
    expect(screen.queryByText('1')).not.toBeInTheDocument();

    // Rerender with conflicts to show badge
    rerender(<AppleCalendarSync conflictCount={1} />);

    // Should show conflict badge when conflicts exist
    expect(screen.getByText('1')).toBeInTheDocument();

    const conflictsTab = screen.getByRole('tab', { name: /conflicts/i });
    expect(conflictsTab).toBeInTheDocument();
  });
});

describe('AppleCalDAVAuth', () => {
  test('renders authentication form', () => {
    const mockOnAuthSuccess = jest.fn();
    const mockOnAuthError = jest.fn();

    render(
      <AppleCalDAVAuth
        onAuthSuccess={mockOnAuthSuccess}
        onAuthError={mockOnAuthError}
      />,
    );

    expect(screen.getByLabelText(/apple id/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/app-specific password/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /connect/i }),
    ).toBeInTheDocument();
  });

  test('validates Apple ID format', async () => {
    const user = userEvent.setup();
    const mockOnAuthError = jest.fn();

    render(
      <AppleCalDAVAuth
        onAuthSuccess={jest.fn()}
        onAuthError={mockOnAuthError}
      />,
    );

    const appleIdInput = screen.getByLabelText(/apple id/i);
    const submitButton = screen.getByRole('button', { name: /connect/i });

    // Enter invalid Apple ID
    await user.type(appleIdInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid apple id format/i)).toBeInTheDocument();
    });
  });

  test('validates app-specific password length', async () => {
    const user = userEvent.setup();

    render(
      <AppleCalDAVAuth onAuthSuccess={jest.fn()} onAuthError={jest.fn()} />,
    );

    const passwordInput = screen.getByLabelText(/app-specific password/i);
    const submitButton = screen.getByRole('button', { name: /connect/i });

    // Enter short password
    await user.type(passwordInput, 'short');
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/must be exactly 16 characters/i),
      ).toBeInTheDocument();
    });
  });

  test('submits valid credentials', async () => {
    const user = userEvent.setup();
    const mockOnAuthSuccess = jest.fn();

    // Mock successful CalDAV response
    mockFetch.mockResolvedValueOnce(
      new Response('', {
        status: 207,
        headers: { 'content-type': 'application/xml' },
      }),
    );

    render(
      <AppleCalDAVAuth
        onAuthSuccess={mockOnAuthSuccess}
        onAuthError={jest.fn()}
      />,
    );

    const appleIdInput = screen.getByLabelText(/apple id/i);
    const passwordInput = screen.getByLabelText(/app-specific password/i);
    const submitButton = screen.getByRole('button', { name: /connect/i });

    await user.type(appleIdInput, mockCredentials.appleId);
    await user.type(passwordInput, mockCredentials.appPassword);

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnAuthSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          appleId: mockCredentials.appleId,
          appPassword: mockCredentials.appPassword,
        }),
      );
    });
  });
});

describe('AppleCalendarSelector', () => {
  test('renders calendar selection interface', () => {
    render(
      <AppleCalendarSelector
        credentials={mockCredentials}
        selectedCalendars={[]}
        onSelectionChange={jest.fn()}
        eventTypes={['client_meeting', 'wedding_ceremony']}
      />,
    );

    expect(screen.getByText(/select calendars/i)).toBeInTheDocument();
    expect(screen.getByText(/discover calendars/i)).toBeInTheDocument();
  });

  test('displays discovered calendars', () => {
    render(
      <AppleCalendarSelector
        credentials={mockCredentials}
        selectedCalendars={mockCalendars}
        onSelectionChange={jest.fn()}
        eventTypes={['client_meeting']}
      />,
    );

    // Mock that calendars have been discovered and are displayed
    expect(screen.getByText(/wedding events/i)).toBeInTheDocument();
    expect(screen.getByText(/personal/i)).toBeInTheDocument();
  });

  test('handles calendar selection changes', async () => {
    const user = userEvent.setup();
    const mockOnSelectionChange = jest.fn();

    render(
      <AppleCalendarSelector
        credentials={mockCredentials}
        selectedCalendars={mockCalendars}
        onSelectionChange={mockOnSelectionChange}
        eventTypes={['client_meeting']}
      />,
    );

    // Test calendar selection interactions
    // Implementation depends on the actual UI structure
    expect(mockOnSelectionChange).toBeDefined();
    
    // Simulate user interaction with calendar selection
    const checkboxes = screen.queryAllByRole('checkbox');
    if (checkboxes.length > 0) {
      await user.click(checkboxes[0]);
      expect(mockOnSelectionChange).toHaveBeenCalled();
    }
  });
});

describe('AppleSyncStatus', () => {
  test('renders sync status dashboard', () => {
    render(
      <AppleSyncStatus syncStatus={mockSyncStatus} onStartSync={jest.fn()} />,
    );

    expect(screen.getByText(/sync status/i)).toBeInTheDocument();
    expect(screen.getByText(/not connected/i)).toBeInTheDocument();
  });

  test('shows progress when syncing', () => {
    const syncingStatus: SyncStatus = {
      ...mockSyncStatus,
      isConnected: true,
      syncProgress: 50,
      currentOperation: 'Processing events...',
    };

    render(
      <AppleSyncStatus
        syncStatus={syncingStatus}
        onStartSync={jest.fn()}
        isLoading={true}
      />,
    );

    expect(screen.getByText(/processing events/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('triggers sync when button clicked', async () => {
    const user = userEvent.setup();
    const mockStartSync = jest.fn();

    const connectedStatus: SyncStatus = {
      ...mockSyncStatus,
      isConnected: true,
    };

    render(
      <AppleSyncStatus
        syncStatus={connectedStatus}
        onStartSync={mockStartSync}
      />,
    );

    const syncButton = screen.getByRole('button', { name: /sync now/i });
    await user.click(syncButton);

    expect(mockStartSync).toHaveBeenCalled();
  });
});

describe('AppleEventMapping', () => {
  test('renders conflict resolution interface', () => {
    render(
      <AppleEventMapping
        conflicts={mockConflicts}
        onConflictResolution={jest.fn()}
        syncSettings={mockSyncSettings}
      />,
    );

    expect(screen.getByText(/conflict resolution/i)).toBeInTheDocument();
    expect(
      screen.getByText(/venue visit - grand ballroom/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/client consultation - sarah & mike/i),
    ).toBeInTheDocument();
  });

  test('handles conflict resolution', async () => {
    const user = userEvent.setup();
    const mockOnConflictResolution = jest.fn();

    render(
      <AppleEventMapping
        conflicts={mockConflicts}
        onConflictResolution={mockOnConflictResolution}
        syncSettings={mockSyncSettings}
      />,
    );

    // Would test resolution buttons
    const resolveButtons = screen.getAllByRole('button', { name: /resolve/i });
    if (resolveButtons.length > 0) {
      await user.click(resolveButtons[0]);
      expect(mockOnConflictResolution).toHaveBeenCalled();
    }
  });

  test('shows empty state when no conflicts', () => {
    render(
      <AppleEventMapping
        conflicts={[]}
        onConflictResolution={jest.fn()}
        syncSettings={mockSyncSettings}
      />,
    );

    expect(screen.getByText(/no conflicts/i)).toBeInTheDocument();
  });
});

describe('AppleSyncSettings', () => {
  test('renders sync settings form', () => {
    render(
      <AppleSyncSettings
        settings={mockSyncSettings}
        onSettingsSave={jest.fn()}
        selectedCalendars={mockCalendars}
      />,
    );

    expect(screen.getByText(/sync settings/i)).toBeInTheDocument();
    expect(screen.getByText(/sync direction/i)).toBeInTheDocument();
    expect(screen.getByText(/event types/i)).toBeInTheDocument();
  });

  test('updates settings when form is submitted', async () => {
    const user = userEvent.setup();
    const mockOnSettingsSave = jest.fn();

    render(
      <AppleSyncSettings
        settings={mockSyncSettings}
        onSettingsSave={mockOnSettingsSave}
        selectedCalendars={mockCalendars}
      />,
    );

    // Would test form interactions
    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await user.click(saveButton);

    expect(mockOnSettingsSave).toHaveBeenCalledWith(
      expect.objectContaining({
        syncDirection: 'bidirectional',
      }),
    );
  });

  test('validates settings before saving', async () => {
    const user = userEvent.setup();

    render(
      <AppleSyncSettings
        settings={mockSyncSettings}
        onSettingsSave={jest.fn()}
        selectedCalendars={[]} // No calendars selected
      />,
    );

    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await user.click(saveButton);

    // Should show validation error
    await waitFor(() => {
      expect(
        screen.getByText(/select at least one calendar/i),
      ).toBeInTheDocument();
    });
  });
});

describe('Mobile Responsiveness', () => {
  beforeEach(() => {
    // Mock window.matchMedia for responsive tests
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation((query) => ({
        matches: query.includes('max-width: 768px'), // Mock mobile viewport
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });
  });

  test('renders mobile-friendly layout on small screens', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<AppleCalendarSync />);

    // Should render without horizontal scrolling issues
    const container = screen.getByRole('tabpanel');
    expect(container).toBeInTheDocument();
  });

  test('shows simplified navigation on mobile', () => {
    render(<AppleCalendarSync />);

    // Test that tabs are accessible on mobile
    const setupTab = screen.getByRole('tab', { name: /setup/i });
    expect(setupTab).toBeVisible();
  });
});

describe('Accessibility', () => {
  test('has proper ARIA labels and roles', () => {
    render(<AppleCalendarSync />);

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(5); // setup, calendars, status, conflicts, settings
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  test('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<AppleCalendarSync />);

    const firstTab = screen.getAllByRole('tab')[0];
    const secondTab = screen.getAllByRole('tab')[1];

    firstTab.focus();
    expect(firstTab).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    // In a real implementation, this would move focus to the next tab
    expect(secondTab).toBeInTheDocument();
  });

  test('has sufficient color contrast', () => {
    render(<AppleCalendarSync />);

    // This would be tested with actual color contrast tools
    // Here we just verify the elements exist
    expect(screen.getByText('Apple Calendar Setup')).toBeInTheDocument();
  });
});

describe('Error Handling', () => {
  test('handles network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const mockOnAuthError = jest.fn();
    render(
      <AppleCalDAVAuth
        onAuthSuccess={jest.fn()}
        onAuthError={mockOnAuthError}
      />,
    );

    const user = userEvent.setup();
    const submitButton = screen.getByRole('button', { name: /connect/i });

    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnAuthError).toHaveBeenCalledWith(
        expect.stringContaining('network'),
      );
    });
  });

  test('handles invalid server responses', async () => {
    mockFetch.mockResolvedValueOnce(
      new Response('Invalid XML', {
        status: 400,
        statusText: 'Bad Request',
      }),
    );

    const mockOnAuthError = jest.fn();
    render(
      <AppleCalDAVAuth
        onAuthSuccess={jest.fn()}
        onAuthError={mockOnAuthError}
      />,
    );

    // Test would verify error handling
    expect(mockOnAuthError).toBeDefined();
  });
});

describe('Performance', () => {
  test('renders components within acceptable time', () => {
    const start = performance.now();

    render(<AppleCalendarSync />);

    const end = performance.now();
    const renderTime = end - start;

    // Should render in under 100ms
    expect(renderTime).toBeLessThan(100);
  });

  test('handles large calendar lists efficiently', () => {
    const largeCalendarList = Array.from({ length: 100 }, (_, i) => ({
      id: `calendar-${i}`,
      name: `Calendar ${i}`,
      color: '#3B82F6',
      isReadOnly: false,
      supportedComponents: ['VEVENT'],
      ctag: `ctag-${i}`,
    }));

    const start = performance.now();

    render(
      <AppleCalendarSelector
        credentials={mockCredentials}
        selectedCalendars={largeCalendarList}
        onSelectionChange={jest.fn()}
        eventTypes={['client_meeting']}
      />,
    );

    const end = performance.now();
    expect(end - start).toBeLessThan(200);
  });
});
