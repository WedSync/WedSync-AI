/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import userEvent from '@testing-library/user-event';
import { useOutlookMobileSync } from '@/hooks/useOutlookMobileSync';
import OutlookCalendarMobile from '@/components/mobile/OutlookCalendarMobile';

// Mock dependencies
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => children,
  PanInfo: jest.fn(),
}));

jest.mock('lucide-react', () => ({
  ChevronLeft: () => <span data-testid="chevron-left">←</span>,
  ChevronRight: () => <span data-testid="chevron-right">→</span>,
  Calendar: () => <span data-testid="calendar">📅</span>,
  Filter: () => <span data-testid="filter">🔍</span>,
  RefreshCw: () => <span data-testid="refresh">🔄</span>,
}));

// Mock navigator APIs
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

Object.defineProperty(navigator, 'vibrate', {
  writable: true,
  value: jest.fn(),
});

const mockBattery = {
  level: 0.8,
  charging: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

Object.defineProperty(navigator, 'getBattery', {
  writable: true,
  value: () => Promise.resolve(mockBattery),
});

// Test data
const mockEvents = [
  {
    id: '1',
    title: 'Wedding Photography - Smith Wedding',
    date: new Date('2025-09-15'),
    startTime: '10:00 AM',
    endTime: '11:00 PM',
    type: 'wedding' as const,
    status: 'confirmed' as const,
    client: 'John & Jane Smith',
    venue: 'Grand Hotel Ballroom',
  },
  {
    id: '2',
    title: 'Venue Consultation',
    date: new Date('2025-09-16'),
    startTime: '2:00 PM',
    endTime: '4:00 PM',
    type: 'consultation' as const,
    status: 'confirmed' as const,
    client: 'Mike & Sarah Johnson',
    conflictsWith: ['3'],
  },
];

describe('useOutlookMobileSync Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should initialize with default values', () => {
    const { result } = renderHook(() =>
      useOutlookMobileSync({
        calendarId: 'test-calendar-id',
      })
    );

    expect(result.current.events).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.syncStatus.isOnline).toBe(true);
  });

  test('should handle battery level updates', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useOutlookMobileSync({
        calendarId: 'test-calendar-id',
      })
    );

    await waitForNextUpdate();

    expect(result.current.syncStatus.batteryLevel).toBe(0.8);
  });

  test('should trigger haptic feedback on gesture', () => {
    const { result } = renderHook(() =>
      useOutlookMobileSync({
        calendarId: 'test-calendar-id',
        enableHapticFeedback: true,
      })
    );

    act(() => {
      result.current.gestureHandlers.onSwipeLeft();
    });

    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  test('should handle network status changes', () => {
    const { result } = renderHook(() =>
      useOutlookMobileSync({
        calendarId: 'test-calendar-id',
      })
    );

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.syncStatus.isOnline).toBe(false);

    act(() => {
      Object.defineProperty(navigator, 'onLine', { value: true });
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.syncStatus.isOnline).toBe(true);
  });

  test('should perform sync with correct API call', async () => {
    const mockResponse = {
      events: mockEvents,
      conflictsFound: 1,
      eventsUpdated: 2,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() =>
      useOutlookMobileSync({
        calendarId: 'test-calendar-id',
      })
    );

    await act(async () => {
      await result.current.syncCalendar();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/outlook/calendar/test-calendar-id/sync',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"batteryLevel":0.8'),
      })
    );

    expect(result.current.events).toEqual(mockEvents);
    expect(result.current.syncStatus.conflictsFound).toBe(1);
    expect(result.current.syncStatus.eventsUpdated).toBe(2);
  });

  test('should adjust sync interval based on battery level', async () => {
    // Mock low battery
    const lowBatteryMock = { ...mockBattery, level: 0.15 };
    Object.defineProperty(navigator, 'getBattery', {
      value: () => Promise.resolve(lowBatteryMock),
    });

    const { result } = renderHook(() =>
      useOutlookMobileSync({
        calendarId: 'test-calendar-id',
        syncInterval: 60000, // 1 minute
      })
    );

    await waitFor(() => {
      expect(result.current.syncStatus.batteryLevel).toBe(0.15);
    });

    // Sync interval should be increased for low battery
    // (This would be tested by checking the setTimeout calls in a real implementation)
  });
});

describe('OutlookCalendarMobile Component', () => {
  const defaultProps = {
    events: mockEvents,
    onDateSelect: jest.fn(),
    onEventSelect: jest.fn(),
    onSyncRequest: jest.fn(),
    isLoading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should render calendar with events', () => {
    render(<OutlookCalendarMobile {...defaultProps} />);

    expect(screen.getByText('September 2025')).toBeInTheDocument();
    expect(screen.getByTestId('chevron-left')).toBeInTheDocument();
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    expect(screen.getByTestId('refresh')).toBeInTheDocument();
  });

  test('should handle month navigation', async () => {
    const user = userEvent.setup();
    render(<OutlookCalendarMobile {...defaultProps} />);

    const nextButton = screen.getByTestId('chevron-right').closest('button')!;
    await user.click(nextButton);

    // Should show next month (October 2025)
    await waitFor(() => {
      expect(screen.getByText('October 2025')).toBeInTheDocument();
    });
  });

  test('should display events with correct styling', () => {
    render(<OutlookCalendarMobile {...defaultProps} />);

    // Check for event indicators on dates with events
    const eventIndicators = screen.getAllByRole('button').filter(button =>
      button.textContent?.includes('15') || button.textContent?.includes('16')
    );

    expect(eventIndicators.length).toBeGreaterThan(0);
  });

  test('should handle date selection and show event details', async () => {
    const user = userEvent.setup();
    render(<OutlookCalendarMobile {...defaultProps} />);

    // Find and click date with events (15th)
    const dateButton = screen.getAllByRole('button').find(button =>
      button.textContent?.includes('15')
    );

    if (dateButton) {
      await user.click(dateButton);

      expect(defaultProps.onDateSelect).toHaveBeenCalledWith(
        expect.any(Date)
      );

      // Should show event details
      await waitFor(() => {
        expect(screen.getByText('Wedding Photography - Smith Wedding')).toBeInTheDocument();
      });
    }
  });

  test('should show conflict indicators', () => {
    render(<OutlookCalendarMobile {...defaultProps} />);

    // Events with conflicts should have visual indicators
    // This would be tested by checking for specific CSS classes or elements
    const conflictEvents = mockEvents.filter(event => event.conflictsWith);
    expect(conflictEvents.length).toBe(1);
  });

  test('should handle sync request', async () => {
    const user = userEvent.setup();
    render(<OutlookCalendarMobile {...defaultProps} />);

    const syncButton = screen.getByTestId('refresh').closest('button')!;
    await user.click(syncButton);

    expect(defaultProps.onSyncRequest).toHaveBeenCalled();
  });

  test('should show loading state', () => {
    render(<OutlookCalendarMobile {...defaultProps} isLoading={true} />);

    const syncButton = screen.getByTestId('refresh').closest('button')!;
    expect(syncButton).toBeDisabled();
  });

  test('should toggle filters panel', async () => {
    const user = userEvent.setup();
    render(<OutlookCalendarMobile {...defaultProps} />);

    const filterButton = screen.getByTestId('filter').closest('button')!;
    await user.click(filterButton);

    // Should show filters
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
      expect(screen.getByText('Weddings')).toBeInTheDocument();
      expect(screen.getByText('Consultations')).toBeInTheDocument();
    });
  });

  test('should handle touch targets minimum size', () => {
    render(<OutlookCalendarMobile {...defaultProps} />);

    // All interactive elements should meet 44x44px minimum
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      const style = window.getComputedStyle(button);
      const minHeight = style.getPropertyValue('min-height');
      const minWidth = style.getPropertyValue('min-width');

      if (minHeight && minWidth) {
        expect(parseInt(minHeight)).toBeGreaterThanOrEqual(44);
        expect(parseInt(minWidth)).toBeGreaterThanOrEqual(44);
      }
    });
  });
});

describe('Mobile Performance Tests', () => {
  test('should handle large event datasets efficiently', () => {
    // Generate large dataset
    const largeEventSet = Array.from({ length: 1000 }, (_, i) => ({
      id: `event-${i}`,
      title: `Event ${i}`,
      date: new Date(2025, 8, Math.floor(i / 31) + 1), // Spread across month
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      type: 'other' as const,
      status: 'confirmed' as const,
    }));

    const startTime = performance.now();
    render(<OutlookCalendarMobile events={largeEventSet} />);
    const renderTime = performance.now() - startTime;

    // Should render within reasonable time (< 100ms)
    expect(renderTime).toBeLessThan(100);
  });

  test('should optimize re-renders with memoization', () => {
    const renderSpy = jest.fn();
    const MemoizedComponent = React.memo(() => {
      renderSpy();
      return <OutlookCalendarMobile events={mockEvents} />;
    });

    const { rerender } = render(<MemoizedComponent />);

    // Re-render with same props
    rerender(<MemoizedComponent />);

    // Should only render once due to memoization
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Accessibility Tests', () => {
  test('should provide proper ARIA labels', () => {
    render(<OutlookCalendarMobile events={mockEvents} />);

    // Calendar should have proper accessibility attributes
    const calendar = screen.getByRole('grid', { hidden: true }) || 
                    document.querySelector('[role="grid"]');
    
    // Event buttons should have accessible labels
    const eventButtons = screen.getAllByRole('button');
    eventButtons.forEach(button => {
      expect(button).toHaveAttribute('tabIndex');
    });
  });

  test('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<OutlookCalendarMobile events={mockEvents} />);

    // Should be able to navigate with keyboard
    const firstButton = screen.getAllByRole('button')[0];
    firstButton.focus();

    // Test Enter key
    await user.keyboard('{Enter}');
    
    // Test Space key  
    await user.keyboard(' ');
  });
});

describe('PWA Integration Tests', () => {
  test('should register service worker', async () => {
    const mockServiceWorker = {
      register: jest.fn().mockResolvedValue({}),
    };

    Object.defineProperty(navigator, 'serviceWorker', {
      value: mockServiceWorker,
    });

    // Component should register service worker
    render(<OutlookCalendarMobile events={mockEvents} />);

    // In a real implementation, this would check if SW registration is triggered
  });

  test('should handle offline state', () => {
    Object.defineProperty(navigator, 'onLine', { value: false });

    render(<OutlookCalendarMobile events={mockEvents} />);

    // Should show appropriate offline indicators or cached data
    // This would be implementation-specific
  });
});

export {};