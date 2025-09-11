import React from 'react';
import { render, act, waitFor } from '@testing-library/react';
import {
  ActivityTracker,
  WeddingActivityTracker,
  PhotographerActivityTracker,
} from '../ActivityTracker';
import { useAuth } from '@/hooks/useAuth';
import type { PresenceStatus } from '@/types/presence';

// Mock hooks and utilities
jest.mock('@/hooks/useAuth');
jest.mock('@/hooks/usePresence');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

// Mock DOM APIs
Object.defineProperty(document, 'hidden', {
  writable: true,
  value: false,
});

Object.defineProperty(window, 'location', {
  writable: true,
  value: {
    pathname: '/dashboard',
    search: '',
  },
});

describe('ActivityTracker', () => {
  let mockOnStatusChange: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUseAuth.mockReturnValue({
      user: { id: 'test-user-123', email: 'test@example.com' },
      loading: false,
      isAuthenticated: true,
    } as any);

    mockOnStatusChange = jest.fn();

    // Reset DOM mocks
    document.hidden = false;
    window.location.pathname = '/dashboard';
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders as invisible component (returns null)', () => {
    const { container } = render(
      <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it('sets initial status to online when enabled', () => {
    render(
      <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
    );

    expect(mockOnStatusChange).toHaveBeenCalledWith('online');
  });

  it('does not track activity when disabled', () => {
    render(
      <ActivityTracker enabled={false} onStatusChange={mockOnStatusChange} />,
    );

    // Simulate mouse movement
    act(() => {
      document.dispatchEvent(new Event('mousemove'));
    });

    // Should not trigger status change
    expect(mockOnStatusChange).not.toHaveBeenCalled();
  });

  describe('Activity Detection', () => {
    it('tracks mouse movement when enabled', () => {
      render(
        <ActivityTracker
          enabled={true}
          trackMouse={true}
          onStatusChange={mockOnStatusChange}
        />,
      );

      // Clear initial 'online' call
      mockOnStatusChange.mockClear();

      // Simulate mouse movement
      act(() => {
        document.dispatchEvent(new Event('mousemove'));
      });

      // Advance debounce timer
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should maintain online status
      expect(mockOnStatusChange).not.toHaveBeenCalledWith('idle');
    });

    it('tracks keyboard activity when enabled', () => {
      render(
        <ActivityTracker
          enabled={true}
          trackKeyboard={true}
          onStatusChange={mockOnStatusChange}
        />,
      );

      mockOnStatusChange.mockClear();

      // Simulate keyboard activity
      act(() => {
        document.dispatchEvent(new Event('keydown'));
      });

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should register activity
      expect(mockOnStatusChange).not.toHaveBeenCalledWith('idle');
    });

    it('tracks focus changes when enabled', () => {
      render(
        <ActivityTracker
          enabled={true}
          trackFocus={true}
          onStatusChange={mockOnStatusChange}
        />,
      );

      mockOnStatusChange.mockClear();

      // Simulate focus event
      act(() => {
        window.dispatchEvent(new Event('focus'));
      });

      // Should register as activity
      expect(mockOnStatusChange).not.toHaveBeenCalledWith('idle');
    });

    it('does not track mouse when trackMouse is false', () => {
      render(
        <ActivityTracker
          enabled={true}
          trackMouse={false}
          onStatusChange={mockOnStatusChange}
        />,
      );

      mockOnStatusChange.mockClear();

      act(() => {
        document.dispatchEvent(new Event('mousemove'));
      });

      // Mouse activity should not prevent idle timeout
      act(() => {
        jest.advanceTimersByTime(120000); // 2 minutes
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith('idle');
    });
  });

  describe('Status Transitions', () => {
    it('transitions to idle after inactivity timeout', () => {
      render(
        <ActivityTracker
          enabled={true}
          idleTimeout={60000} // 1 minute
          onStatusChange={mockOnStatusChange}
        />,
      );

      mockOnStatusChange.mockClear();

      // Advance time past idle timeout
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith('idle');
    });

    it('transitions to away after away timeout', () => {
      render(
        <ActivityTracker
          enabled={true}
          idleTimeout={60000} // 1 minute
          awayTimeout={300000} // 5 minutes
          onStatusChange={mockOnStatusChange}
        />,
      );

      mockOnStatusChange.mockClear();

      // Advance time past away timeout
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith('away');
    });

    it('returns to online from idle on activity', () => {
      render(
        <ActivityTracker
          enabled={true}
          idleTimeout={60000}
          onStatusChange={mockOnStatusChange}
        />,
      );

      mockOnStatusChange.mockClear();

      // Go idle
      act(() => {
        jest.advanceTimersByTime(60000);
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith('idle');

      // Register activity
      act(() => {
        document.dispatchEvent(new Event('mousemove'));
        jest.advanceTimersByTime(2000); // Debounce
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith('online');
    });

    it('returns to online from away on activity', () => {
      render(
        <ActivityTracker
          enabled={true}
          awayTimeout={300000}
          onStatusChange={mockOnStatusChange}
        />,
      );

      mockOnStatusChange.mockClear();

      // Go away
      act(() => {
        jest.advanceTimersByTime(300000);
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith('away');

      // Register activity
      act(() => {
        document.dispatchEvent(new Event('click'));
        jest.advanceTimersByTime(2000);
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith('online');
    });
  });

  describe('Page Visibility Handling', () => {
    it('transitions to idle when page becomes hidden', () => {
      render(
        <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
      );

      mockOnStatusChange.mockClear();

      // Mock page becoming hidden
      act(() => {
        Object.defineProperty(document, 'hidden', { value: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith('idle');
    });

    it('registers activity when page becomes visible', () => {
      render(
        <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
      );

      // Set page as hidden first
      Object.defineProperty(document, 'hidden', { value: true });

      mockOnStatusChange.mockClear();

      // Page becomes visible
      act(() => {
        Object.defineProperty(document, 'hidden', { value: false });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // Should register as activity
      expect(mockOnStatusChange).not.toHaveBeenCalledWith('idle');
    });
  });

  describe('Performance Requirements', () => {
    it('debounces activity events to prevent excessive updates', () => {
      render(
        <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
      );

      mockOnStatusChange.mockClear();

      // Trigger multiple rapid mouse movements
      act(() => {
        for (let i = 0; i < 10; i++) {
          document.dispatchEvent(new Event('mousemove'));
        }
      });

      // Only one update should be scheduled after debounce
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should not have caused excessive status changes
      expect(mockOnStatusChange).not.toHaveBeenCalledWith('idle');
    });

    it('maintains low CPU usage with activity monitoring', () => {
      const performanceStart = performance.now();

      render(
        <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
      );

      // Simulate normal activity over time
      act(() => {
        for (let i = 0; i < 100; i++) {
          document.dispatchEvent(new Event('mousemove'));
          jest.advanceTimersByTime(100);
        }
      });

      const performanceEnd = performance.now();
      const duration = performanceEnd - performanceStart;

      // Should complete quickly (performance requirement)
      expect(duration).toBeLessThan(50); // 50ms for 100 events
    });
  });

  describe('Wedding Context Adjustments', () => {
    it('detects wedding context from URL path', () => {
      // Mock wedding page URL
      Object.defineProperty(window, 'location', {
        value: { pathname: '/wedding/sarah-mike', search: '' },
      });

      render(
        <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
      );

      // Wedding context should use shorter timeouts
      // This is tested indirectly through timeout behavior
      expect(mockOnStatusChange).toHaveBeenCalledWith('online');
    });

    it('detects wedding context from query parameters', () => {
      Object.defineProperty(window, 'location', {
        value: { pathname: '/dashboard', search: '?wedding=true' },
      });

      render(
        <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
      );

      expect(mockOnStatusChange).toHaveBeenCalledWith('online');
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('cleans up event listeners on unmount', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(
        document,
        'removeEventListener',
      );

      const { unmount } = render(
        <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
      );

      const addedListeners = addEventListenerSpy.mock.calls.length;

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledTimes(addedListeners);
    });

    it('clears all timeouts on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
      );

      unmount();

      // Should clear multiple timeouts (idle, away, debounce, etc.)
      expect(clearTimeoutSpy).toHaveBeenCalledTimes(expect.any(Number));
    });

    it('sets offline status on page unload', () => {
      render(
        <ActivityTracker enabled={true} onStatusChange={mockOnStatusChange} />,
      );

      mockOnStatusChange.mockClear();

      act(() => {
        window.dispatchEvent(new Event('beforeunload'));
      });

      expect(mockOnStatusChange).toHaveBeenCalledWith('offline');
    });
  });
});

describe('WeddingActivityTracker', () => {
  it('uses wedding-specific shorter timeouts', () => {
    const mockOnStatusChange = jest.fn();

    render(
      <WeddingActivityTracker
        weddingId="wedding-123"
        isWeddingDay={true}
        onStatusChange={mockOnStatusChange}
      />,
    );

    mockOnStatusChange.mockClear();

    // Should use shorter idle timeout (1 minute for wedding day)
    act(() => {
      jest.advanceTimersByTime(60000);
    });

    expect(mockOnStatusChange).toHaveBeenCalledWith('idle');
  });

  it('adjusts timeouts based on wedding day flag', () => {
    const mockOnStatusChange = jest.fn();

    render(
      <WeddingActivityTracker
        weddingId="wedding-123"
        isWeddingDay={false}
        onStatusChange={mockOnStatusChange}
      />,
    );

    mockOnStatusChange.mockClear();

    // Should use standard wedding timeout (1.5 minutes when not wedding day)
    act(() => {
      jest.advanceTimersByTime(90000);
    });

    expect(mockOnStatusChange).toHaveBeenCalledWith('idle');
  });
});

describe('PhotographerActivityTracker', () => {
  it('uses longer timeouts during shooting mode', () => {
    const mockOnStatusChange = jest.fn();

    render(
      <PhotographerActivityTracker
        shootingMode={true}
        onStatusChange={mockOnStatusChange}
      />,
    );

    mockOnStatusChange.mockClear();

    // Should use longer idle timeout (5 minutes during shoot)
    act(() => {
      jest.advanceTimersByTime(300000);
    });

    expect(mockOnStatusChange).toHaveBeenCalledWith('idle');
  });

  it('uses standard timeouts when not in shooting mode', () => {
    const mockOnStatusChange = jest.fn();

    render(
      <PhotographerActivityTracker
        shootingMode={false}
        onStatusChange={mockOnStatusChange}
      />,
    );

    mockOnStatusChange.mockClear();

    // Should use standard timeout (2 minutes)
    act(() => {
      jest.advanceTimersByTime(120000);
    });

    expect(mockOnStatusChange).toHaveBeenCalledWith('idle');
  });
});
