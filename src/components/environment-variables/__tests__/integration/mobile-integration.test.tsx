/**
 * Integration Tests for Mobile Environment Variables Management
 * Tests mobile-specific functionality, touch interactions, and offline capabilities
 */

import {
  render,
  screen,
  waitFor,
  act,
  fireEvent,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileEnvironmentVariablesManager } from '../mobile/MobileEnvironmentVariablesManager';
import { MobileVariableForm } from '../mobile/MobileVariableForm';

// Mock mobile viewport
const mockMobileViewport = () => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 667,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: query.includes('max-width: 768px'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

// Mock touch events
const createTouchEvent = (type: string, touches: any[] = []) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  (event as any).touches = touches;
  (event as any).targetTouches = touches;
  (event as any).changedTouches = touches;
  return event;
};

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() =>
          Promise.resolve({
            data: [
              {
                id: '1',
                name: 'API_URL',
                value: 'https://api.wedsync.com',
                environment: 'production',
                security_level: 'public',
                updated_at: '2024-01-15T10:00:00Z',
              },
              {
                id: '2',
                name: 'STRIPE_SECRET',
                value: 'sk_live_hidden_value',
                environment: 'production',
                security_level: 'confidential',
                updated_at: '2024-01-15T09:30:00Z',
              },
            ],
            error: null,
          }),
        ),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [], error: null })),
    upsert: jest.fn(() => Promise.resolve({ data: [], error: null })),
  })),

  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => Promise.resolve('ok')),
    unsubscribe: jest.fn(() => Promise.resolve('ok')),
  })),

  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({
        data: {
          user: {
            id: 'mobile-user-id',
            email: 'supplier@wedsync.com',
            app_metadata: { roles: ['supplier'] },
          },
        },
        error: null,
      }),
    ),
  },
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}));

// Mock Service Worker for offline testing
const mockServiceWorker = {
  state: 'activated',
  postMessage: jest.fn(),
  addEventListener: jest.fn(),
};

Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(() => Promise.resolve(mockServiceWorker)),
    ready: Promise.resolve(mockServiceWorker),
    controller: mockServiceWorker,
  },
  writable: true,
});

// Mock localStorage for offline storage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

const MobileTestWrapper = ({ children }: { children: React.ReactNode }) => {
  mockMobileViewport();
  return (
    <div
      data-testid="mobile-test-wrapper"
      style={{ width: '375px', height: '667px' }}
    >
      {children}
    </div>
  );
};

describe('Mobile Environment Variables Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileViewport();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    // Reset viewport to desktop for other tests
    Object.defineProperty(window, 'innerWidth', { value: 1024 });
    Object.defineProperty(window, 'innerHeight', { value: 768 });
  });

  describe('Mobile Interface and Navigation', () => {
    test('should render mobile-optimized interface on small screens', async () => {
      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('mobile-environment-manager'),
        ).toBeInTheDocument();
      });

      // Should show bottom navigation for mobile
      expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();

      // Should have mobile-optimized layout
      const container = screen.getByTestId('mobile-environment-manager');
      expect(container).toHaveStyle({ padding: '16px' });
    });

    test('should handle tab navigation with touch gestures', async () => {
      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile-bottom-nav')).toBeInTheDocument();
      });

      const variablesTab = screen.getByRole('tab', { name: /variables/i });
      const healthTab = screen.getByRole('tab', { name: /health/i });

      // Test touch navigation
      fireEvent(variablesTab, createTouchEvent('touchstart'));
      fireEvent(variablesTab, createTouchEvent('touchend'));

      await waitFor(() => {
        expect(screen.getByTestId('mobile-variables-list')).toBeInTheDocument();
      });

      // Switch to health tab
      fireEvent(healthTab, createTouchEvent('touchstart'));
      fireEvent(healthTab, createTouchEvent('touchend'));

      await waitFor(() => {
        expect(
          screen.getByTestId('mobile-health-overview'),
        ).toBeInTheDocument();
      });
    });

    test('should support swipe gestures for tab switching', async () => {
      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('mobile-environment-manager'),
        ).toBeInTheDocument();
      });

      const container = screen.getByTestId('mobile-environment-manager');

      // Simulate swipe left (next tab)
      fireEvent(
        container,
        createTouchEvent('touchstart', [
          {
            clientX: 300,
            clientY: 400,
          },
        ]),
      );

      fireEvent(
        container,
        createTouchEvent('touchmove', [
          {
            clientX: 100,
            clientY: 400,
          },
        ]),
      );

      fireEvent(
        container,
        createTouchEvent('touchend', [
          {
            clientX: 100,
            clientY: 400,
          },
        ]),
      );

      await waitFor(() => {
        // Should switch to next tab
        expect(
          screen.getByTestId('mobile-health-overview'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Touch Interactions and Form Handling', () => {
    test('should handle touch-optimized form inputs', async () => {
      const user = userEvent.setup({ pointerEventsCheck: 0 });

      render(
        <MobileTestWrapper>
          <MobileVariableForm onSubmit={() => {}} onCancel={() => {}} />
        </MobileTestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile-variable-form')).toBeInTheDocument();
      });

      // Form inputs should have large touch targets (min 48x48px)
      const nameInput = screen.getByLabelText(/variable name/i);
      const valueInput = screen.getByLabelText(/value/i);

      expect(nameInput).toHaveStyle({ minHeight: '48px' });
      expect(valueInput).toHaveStyle({ minHeight: '48px' });

      // Test touch input
      await user.type(nameInput, 'MOBILE_API_KEY');
      await user.type(valueInput, 'mobile_key_123456');

      expect(nameInput).toHaveValue('MOBILE_API_KEY');
      expect(valueInput).toHaveValue('mobile_key_123456');
    });

    test('should auto-save form data for mobile users', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      render(
        <MobileTestWrapper>
          <MobileVariableForm onSubmit={() => {}} onCancel={() => {}} />
        </MobileTestWrapper>,
      );

      const nameInput = screen.getByLabelText(/variable name/i);
      await user.type(nameInput, 'AUTO_SAVE_TEST');

      // Trigger auto-save after 2 seconds
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        // Should save to localStorage
        const savedData = mockLocalStorage.getItem('mobile-form-draft');
        expect(savedData).toContain('AUTO_SAVE_TEST');
      });

      jest.useRealTimers();
    });

    test('should recover form data after app restart', async () => {
      // Pre-populate localStorage with draft data
      mockLocalStorage.setItem(
        'mobile-form-draft',
        JSON.stringify({
          name: 'RECOVERED_VARIABLE',
          value: 'recovered_value_123',
          environment: 'staging',
          security_level: 'internal',
        }),
      );

      render(
        <MobileTestWrapper>
          <MobileVariableForm onSubmit={() => {}} onCancel={() => {}} />
        </MobileTestWrapper>,
      );

      // Should show recovery notification
      await waitFor(() => {
        expect(screen.getByText(/draft.*recovered/i)).toBeInTheDocument();
      });

      // Form should be pre-filled with recovered data
      const nameInput = screen.getByLabelText(/variable name/i);
      const valueInput = screen.getByLabelText(/value/i);

      expect(nameInput).toHaveValue('RECOVERED_VARIABLE');
      expect(valueInput).toHaveValue('recovered_value_123');
    });

    test('should handle pull-to-refresh gesture', async () => {
      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      await waitFor(() => {
        expect(screen.getByTestId('mobile-variables-list')).toBeInTheDocument();
      });

      const scrollContainer = screen.getByTestId('mobile-variables-list');

      // Simulate pull-to-refresh gesture
      fireEvent(
        scrollContainer,
        createTouchEvent('touchstart', [
          {
            clientX: 200,
            clientY: 100,
          },
        ]),
      );

      fireEvent(
        scrollContainer,
        createTouchEvent('touchmove', [
          {
            clientX: 200,
            clientY: 200,
          },
        ]),
      );

      fireEvent(
        scrollContainer,
        createTouchEvent('touchend', [
          {
            clientX: 200,
            clientY: 200,
          },
        ]),
      );

      // Should show refresh indicator
      await waitFor(() => {
        expect(screen.getByTestId('refresh-indicator')).toBeInTheDocument();
      });

      // Should trigger data reload
      await waitFor(
        () => {
          expect(mockSupabaseClient.from).toHaveBeenCalledWith(
            'environment_variables',
          );
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Offline Functionality', () => {
    test('should detect when device goes offline', async () => {
      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/offline.*mode/i)).toBeInTheDocument();
        expect(screen.getByTestId('offline-indicator')).toBeInTheDocument();
      });
    });

    test('should cache data for offline viewing', async () => {
      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // Wait for initial data load
      await waitFor(() => {
        expect(screen.getByText('API_URL')).toBeInTheDocument();
      });

      // Simulate going offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      fireEvent(window, new Event('offline'));

      // Data should still be visible from cache
      await waitFor(() => {
        expect(screen.getByText('API_URL')).toBeInTheDocument();
        expect(screen.getByText(/cached.*data/i)).toBeInTheDocument();
      });
    });

    test('should queue changes when offline and sync when online', async () => {
      const user = userEvent.setup();

      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // Go offline
      Object.defineProperty(navigator, 'onLine', { value: false });
      fireEvent(window, new Event('offline'));

      // Try to create a new variable while offline
      const addButton = screen.getByRole('button', { name: /add.*variable/i });
      await user.click(addButton);

      const nameInput = screen.getByLabelText(/variable name/i);
      const valueInput = screen.getByLabelText(/value/i);

      await user.type(nameInput, 'OFFLINE_VARIABLE');
      await user.type(valueInput, 'offline_value_123');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show queued status
      await waitFor(() => {
        expect(screen.getByText(/queued.*sync/i)).toBeInTheDocument();
      });

      // Go back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));

      // Should automatically sync queued changes
      await waitFor(() => {
        expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'OFFLINE_VARIABLE',
            value: 'offline_value_123',
          }),
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/sync.*complete/i)).toBeInTheDocument();
      });
    });

    test('should handle conflicts when syncing offline changes', async () => {
      const user = userEvent.setup();

      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // Go offline and make changes
      Object.defineProperty(navigator, 'onLine', { value: false });
      fireEvent(window, new Event('offline'));

      // Edit existing variable
      const editButton = screen.getByRole('button', { name: /edit.*API_URL/i });
      await user.click(editButton);

      const valueInput = screen.getByLabelText(/value/i);
      await user.clear(valueInput);
      await user.type(valueInput, 'https://offline.wedsync.com/api');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Simulate server-side changes while offline
      mockSupabaseClient.from().update.mockRejectedValueOnce({
        error: {
          code: 'PGRST116',
          message: 'Conflict: Resource has been modified',
        },
      });

      // Go back online
      Object.defineProperty(navigator, 'onLine', { value: true });
      fireEvent(window, new Event('online'));

      // Should detect conflict and show resolution options
      await waitFor(() => {
        expect(screen.getByText(/conflict.*detected/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /keep.*local/i }),
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /use.*server/i }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('Performance and User Experience', () => {
    test('should load data progressively on mobile', async () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: `var-${i}`,
        name: `VARIABLE_${i}`,
        value: `value-${i}`,
        environment: 'production',
        security_level: 'internal',
      }));

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            order: jest.fn(() =>
              Promise.resolve({
                data: largeDataset,
                error: null,
              }),
            ),
          })),
        })),
      });

      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // Should show loading skeleton first
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

      // Should load first batch
      await waitFor(() => {
        expect(screen.getByText('VARIABLE_0')).toBeInTheDocument();
      });

      // Should show "Load More" for remaining items
      expect(
        screen.getByRole('button', { name: /load.*more/i }),
      ).toBeInTheDocument();
    });

    test('should optimize images and assets for mobile', async () => {
      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // Check that icons are appropriately sized for mobile
      const icons = screen.getAllByTestId(/icon-/);
      icons.forEach((icon) => {
        const styles = getComputedStyle(icon);
        const size = parseInt(styles.width);
        expect(size).toBeGreaterThanOrEqual(24); // Minimum touch target
        expect(size).toBeLessThanOrEqual(32); // Not too large for mobile
      });
    });

    test('should handle device rotation gracefully', async () => {
      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // Simulate device rotation to landscape
      Object.defineProperty(window, 'innerWidth', { value: 667 });
      Object.defineProperty(window, 'innerHeight', { value: 375 });
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        const container = screen.getByTestId('mobile-environment-manager');
        // Should adapt layout for landscape
        expect(container).toHaveClass('landscape-layout');
      });

      // Rotate back to portrait
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      fireEvent(window, new Event('resize'));

      await waitFor(() => {
        const container = screen.getByTestId('mobile-environment-manager');
        expect(container).toHaveClass('portrait-layout');
      });
    });

    test('should minimize data usage on mobile networks', async () => {
      // Mock slow 3G connection
      Object.defineProperty(navigator, 'connection', {
        value: {
          effectiveType: '3g',
          downlink: 1.5,
          rtt: 300,
        },
      });

      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // Should optimize data fetching for slow connections
      await waitFor(() => {
        const selectCall = mockSupabaseClient.from().select as jest.Mock;
        expect(selectCall).toHaveBeenCalledWith(
          expect.stringContaining('id,name,environment,security_level'),
        );
        // Should not fetch full values to minimize data usage
        expect(selectCall).not.toHaveBeenCalledWith(
          expect.stringContaining('value'),
        );
      });
    });

    test('should provide haptic feedback for touch interactions', async () => {
      const mockVibrate = jest.fn();
      Object.defineProperty(navigator, 'vibrate', { value: mockVibrate });

      const user = userEvent.setup();

      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      // Should provide haptic feedback for destructive actions
      expect(mockVibrate).toHaveBeenCalledWith([50]);
    });
  });

  describe('Accessibility on Mobile', () => {
    test('should support screen reader navigation', async () => {
      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // All interactive elements should have proper ARIA labels
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label');
      });

      // Should have proper heading structure
      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveAttribute('aria-level', '1');
    });

    test('should support keyboard navigation on mobile', async () => {
      const user = userEvent.setup();

      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      // Should be able to navigate using tab key
      await user.tab();
      expect(screen.getByRole('tab', { name: /variables/i })).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('tab', { name: /health/i })).toHaveFocus();
    });

    test('should adjust for high contrast mode', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockImplementation((query) => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          addListener: jest.fn(),
          removeListener: jest.fn(),
        })),
      });

      render(
        <MobileTestWrapper>
          <MobileEnvironmentVariablesManager />
        </MobileTestWrapper>,
      );

      const container = screen.getByTestId('mobile-environment-manager');
      expect(container).toHaveClass('high-contrast');
    });
  });
});
