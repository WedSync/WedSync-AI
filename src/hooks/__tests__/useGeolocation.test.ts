/**
 * Tests for useGeolocation hook
 * Comprehensive testing of geolocation services for wedding venue discovery
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useGeolocation } from '../useGeolocation';

// Mock geolocation API
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
};

// Mock navigator.permissions
const mockPermissions = {
  query: jest.fn(),
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true,
});

Object.defineProperty(global.navigator, 'permissions', {
  value: mockPermissions,
  writable: true,
});

// Mock position data
const mockPosition: GeolocationPosition = {
  coords: {
    latitude: 40.7128,
    longitude: -74.006,
    accuracy: 10,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  },
  timestamp: Date.now(),
};

describe('useGeolocation Hook', () => {
  beforeEach(() => {
    mockGeolocation.getCurrentPosition.mockClear();
    mockGeolocation.watchPosition.mockClear();
    mockGeolocation.clearWatch.mockClear();
    mockPermissions.query.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial State', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useGeolocation());

      expect(result.current.coordinates).toBeNull();
      expect(result.current.accuracy).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
      expect(result.current.permission).toBeNull();
    });

    it('should check permissions on mount', async () => {
      mockPermissions.query.mockResolvedValueOnce({
        state: 'granted',
      });

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(mockPermissions.query).toHaveBeenCalledWith({
          name: 'geolocation',
        });
        expect(result.current.permission).toBe('granted');
      });
    });

    it('should handle permission check failure', async () => {
      mockPermissions.query.mockRejectedValueOnce(
        new Error('Permission API unavailable'),
      );

      const { result } = renderHook(() => useGeolocation());

      await waitFor(() => {
        expect(result.current.permission).toBe('prompt');
      });
    });
  });

  describe('getCurrentPosition', () => {
    it('should get current position successfully', async () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
        setTimeout(() => success(mockPosition), 100);
      });

      const { result } = renderHook(() => useGeolocation());

      let position;
      act(() => {
        result.current.getCurrentPosition().then((coords) => {
          position = coords;
        });
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.coordinates).toEqual({
          lat: 40.7128,
          lng: -74.006,
        });
        expect(result.current.accuracy).toBe(10);
        expect(result.current.error).toBeNull();
        expect(result.current.permission).toBe('granted');
      });
    });

    it('should handle position unavailable error', async () => {
      const error: GeolocationPositionError = {
        code: 2, // POSITION_UNAVAILABLE
        message: 'Position unavailable',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, errorCallback) => {
          setTimeout(() => errorCallback!(error), 100);
        },
      );

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition().catch(() => {
          // Expected to reject
        });
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toContain(
          'Location information unavailable',
        );
        expect(result.current.permission).toBe('granted');
      });
    });

    it('should handle permission denied error', async () => {
      const error: GeolocationPositionError = {
        code: 1, // PERMISSION_DENIED
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, errorCallback) => {
          setTimeout(() => errorCallback!(error), 100);
        },
      );

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition().catch(() => {
          // Expected to reject
        });
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Location access denied');
        expect(result.current.permission).toBe('denied');
      });
    });

    it('should handle timeout error', async () => {
      const error: GeolocationPositionError = {
        code: 3, // TIMEOUT
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, errorCallback) => {
          setTimeout(() => errorCallback!(error), 100);
        },
      );

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition().catch(() => {
          // Expected to reject
        });
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.error).toContain('Location request timed out');
        expect(result.current.permission).toBe('granted');
      });
    });

    it('should handle custom timeout', async () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce(() => {
        // Never calls success or error - simulates hanging request
      });

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition({ timeout: 5000 }).catch(() => {
          // Expected to reject
        });
      });

      expect(result.current.loading).toBe(true);

      // Advance past custom timeout
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toContain('Location request timed out');
      });
    });

    it('should handle unsupported geolocation', async () => {
      const originalGeolocation = navigator.geolocation;
      // @ts-ignore
      delete navigator.geolocation;

      const { result } = renderHook(() => useGeolocation());

      try {
        await act(async () => {
          await expect(result.current.getCurrentPosition()).rejects.toThrow(
            'Geolocation not supported',
          );
        });

        expect(result.current.error).toContain(
          'Location services not available',
        );
      } finally {
        Object.defineProperty(navigator, 'geolocation', {
          value: originalGeolocation,
          writable: true,
        });
      }
    });

    it('should use custom options', async () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, error, options) => {
          expect(options).toEqual({
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 0,
          });
          setTimeout(() => success(mockPosition), 100);
        },
      );

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 0,
        });
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 0,
          },
        );
      });
    });
  });

  describe('watchPosition', () => {
    it('should start watching position successfully', () => {
      const mockWatchId = 123;
      mockGeolocation.watchPosition.mockReturnValueOnce(mockWatchId);

      const { result } = renderHook(() => useGeolocation());

      let watchId;
      act(() => {
        watchId = result.current.watchPosition();
      });

      expect(watchId).toBe(mockWatchId);
      expect(result.current.loading).toBe(true);
      expect(mockGeolocation.watchPosition).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Function),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        },
      );
    });

    it('should clear previous watch when starting new one', () => {
      const firstWatchId = 123;
      const secondWatchId = 456;

      mockGeolocation.watchPosition
        .mockReturnValueOnce(firstWatchId)
        .mockReturnValueOnce(secondWatchId);

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.watchPosition();
      });

      act(() => {
        result.current.watchPosition();
      });

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(firstWatchId);
    });

    it('should return null for unsupported geolocation', () => {
      const originalGeolocation = navigator.geolocation;
      // @ts-ignore
      delete navigator.geolocation;

      const { result } = renderHook(() => useGeolocation());

      let watchId;
      act(() => {
        watchId = result.current.watchPosition();
      });

      expect(watchId).toBeNull();
      expect(result.current.error).toContain('Geolocation not supported');

      Object.defineProperty(navigator, 'geolocation', {
        value: originalGeolocation,
        writable: true,
      });
    });

    it('should handle watch position success', () => {
      let successCallback:
        | ((position: GeolocationPosition) => void)
        | undefined;

      mockGeolocation.watchPosition.mockImplementationOnce((success) => {
        successCallback = success;
        return 123;
      });

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.watchPosition();
      });

      // Simulate position update
      act(() => {
        successCallback!(mockPosition);
      });

      expect(result.current.coordinates).toEqual({
        lat: 40.7128,
        lng: -74.006,
      });
      expect(result.current.accuracy).toBe(10);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('clearWatch', () => {
    it('should clear watch correctly', () => {
      const watchId = 123;
      mockGeolocation.watchPosition.mockReturnValueOnce(watchId);

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.watchPosition();
      });

      act(() => {
        result.current.clearWatch();
      });

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId);
      expect(result.current.loading).toBe(false);
    });

    it('should handle clearing when no watch is active', () => {
      const { result } = renderHook(() => useGeolocation());

      expect(() => {
        act(() => {
          result.current.clearWatch();
        });
      }).not.toThrow();

      expect(mockGeolocation.clearWatch).not.toHaveBeenCalled();
    });
  });

  describe('resetPermission', () => {
    it('should reset permission state', async () => {
      mockPermissions.query.mockResolvedValueOnce({
        state: 'granted',
      });

      const { result } = renderHook(() => useGeolocation());

      // Wait for initial permission check
      await waitFor(() => {
        expect(result.current.permission).toBe('granted');
      });

      // Set some state
      act(() => {
        result.current.resetPermission();
      });

      expect(result.current.permission).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.coordinates).toBeNull();
      expect(result.current.accuracy).toBeNull();
    });
  });

  describe('Auto-watch functionality', () => {
    it('should auto-watch when permission is granted and watch option is true', async () => {
      mockPermissions.query.mockResolvedValueOnce({
        state: 'granted',
      });
      mockGeolocation.watchPosition.mockReturnValueOnce(123);

      renderHook(() => useGeolocation({ watch: true }));

      await waitFor(() => {
        expect(mockGeolocation.watchPosition).toHaveBeenCalled();
      });
    });

    it('should not auto-watch when permission is denied', async () => {
      mockPermissions.query.mockResolvedValueOnce({
        state: 'denied',
      });

      renderHook(() => useGeolocation({ watch: true }));

      await waitFor(() => {
        expect(mockGeolocation.watchPosition).not.toHaveBeenCalled();
      });
    });

    it('should not auto-watch when watch option is false', async () => {
      mockPermissions.query.mockResolvedValueOnce({
        state: 'granted',
      });

      renderHook(() => useGeolocation({ watch: false }));

      await waitFor(() => {
        expect(mockGeolocation.watchPosition).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup watch on unmount', () => {
      const watchId = 123;
      mockGeolocation.watchPosition.mockReturnValueOnce(watchId);

      const { result, unmount } = renderHook(() => useGeolocation());

      act(() => {
        result.current.watchPosition();
      });

      unmount();

      expect(mockGeolocation.clearWatch).toHaveBeenCalledWith(watchId);
    });

    it('should cleanup timeouts on unmount', () => {
      const { result, unmount } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition();
      });

      // Should not throw when unmounting with pending timeout
      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Wedding venue context', () => {
    it('should use high accuracy by default for venue discovery', () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, error, options) => {
          expect(options?.enableHighAccuracy).toBe(true);
          setTimeout(() => success(mockPosition), 100);
        },
      );

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });
    });

    it('should have reasonable timeout for venue visits with poor signal', () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, error, options) => {
          expect(options?.timeout).toBe(10000); // 10 seconds
          setTimeout(() => success(mockPosition), 100);
        },
      );

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });
    });

    it('should have appropriate maximumAge for venue discovery', () => {
      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, error, options) => {
          expect(options?.maximumAge).toBe(300000); // 5 minutes
          setTimeout(() => success(mockPosition), 100);
        },
      );

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition();
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });
    });
  });

  describe('Error messages', () => {
    it('should provide wedding-context error messages', async () => {
      const permissionError: GeolocationPositionError = {
        code: 1,
        message: 'Permission denied',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, errorCallback) => {
          setTimeout(() => errorCallback!(permissionError), 100);
        },
      );

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition().catch(() => {});
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.error).toContain('find nearby venues');
      });
    });

    it('should mention poor signal for venue context in timeout errors', async () => {
      const timeoutError: GeolocationPositionError = {
        code: 3,
        message: 'Timeout',
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      };

      mockGeolocation.getCurrentPosition.mockImplementationOnce(
        (success, errorCallback) => {
          setTimeout(() => errorCallback!(timeoutError), 100);
        },
      );

      const { result } = renderHook(() => useGeolocation());

      act(() => {
        result.current.getCurrentPosition().catch(() => {});
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      await waitFor(() => {
        expect(result.current.error).toContain('outdoor venues');
      });
    });
  });
});
