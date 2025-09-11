/**
 * useGeolocation Hook
 * Geolocation services for WedSync venue discovery and location-based features
 * Optimized for wedding planners working on-site at venues
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  UseGeolocationReturn,
  GeolocationState,
  GeolocationOptions,
  LocationCoordinates,
} from '@/types/google-places';

// Default geolocation options optimized for wedding venue discovery
const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: true, // Important for precise venue location
  timeout: 10000, // 10 seconds - venues often have poor signal
  maximumAge: 300000, // 5 minutes - reasonable for venue visits
  watch: false,
};

/**
 * Custom hook for geolocation services
 * Provides current position, permission handling, and location watching
 * Designed for wedding planners visiting venues and coordinating events
 */
export function useGeolocation(
  options: GeolocationOptions = {},
): UseGeolocationReturn {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Core geolocation state
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(
    null,
  );
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [permission, setPermission] = useState<
    'granted' | 'denied' | 'prompt' | null
  >(null);

  // Refs for cleanup
  const watchIdRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Check and request geolocation permissions
   */
  const checkPermissions = useCallback(async (): Promise<
    'granted' | 'denied' | 'prompt'
  > => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser');
      return 'denied';
    }

    try {
      // Check if Permissions API is available
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({
          name: 'geolocation',
        });
        const state = result.state as 'granted' | 'denied' | 'prompt';
        setPermission(state);
        return state;
      }

      // Fallback for browsers without Permissions API
      return 'prompt';
    } catch (permError) {
      console.warn('Permission check failed:', permError);
      return 'prompt';
    }
  }, []);

  /**
   * Handle successful geolocation
   */
  const handleSuccess = useCallback((position: GeolocationPosition) => {
    const newCoordinates: LocationCoordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    setCoordinates(newCoordinates);
    setAccuracy(position.coords.accuracy);
    setError(null);
    setLoading(false);

    // Update permission status
    setPermission('granted');

    console.log('Location updated:', {
      coordinates: newCoordinates,
      accuracy: position.coords.accuracy,
      timestamp: new Date(position.timestamp),
    });
  }, []);

  /**
   * Handle geolocation errors with user-friendly messages
   */
  const handleError = useCallback((err: GeolocationPositionError) => {
    setLoading(false);

    let errorMessage: string;
    let permissionState: 'granted' | 'denied' | 'prompt' = 'denied';

    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage =
          'Location access denied. Please enable location services to find nearby venues.';
        permissionState = 'denied';
        break;

      case err.POSITION_UNAVAILABLE:
        errorMessage =
          'Location information unavailable. Please check your GPS signal.';
        permissionState = 'granted'; // Permission was granted but position unavailable
        break;

      case err.TIMEOUT:
        errorMessage =
          'Location request timed out. Poor signal is common at outdoor venues.';
        permissionState = 'granted';
        break;

      default:
        errorMessage =
          'Unable to retrieve location. Please try again or enter venue address manually.';
        break;
    }

    setError(errorMessage);
    setPermission(permissionState);

    console.error('Geolocation error:', {
      code: err.code,
      message: err.message,
      userMessage: errorMessage,
    });
  }, []);

  /**
   * Get current position
   */
  const getCurrentPosition = useCallback(
    async (
      customOptions?: GeolocationOptions,
    ): Promise<LocationCoordinates> => {
      const effectiveOptions = { ...mergedOptions, ...customOptions };

      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          const error = new Error('Geolocation not supported');
          setError('Location services not available on this device');
          reject(error);
          return;
        }

        setLoading(true);
        setError(null);

        // Set timeout for the request
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          setLoading(false);
          const timeoutError = new Error('Location request timeout');
          setError(
            'Location request timed out. This is common at venues with poor signal.',
          );
          reject(timeoutError);
        }, effectiveOptions.timeout || DEFAULT_OPTIONS.timeout);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }

            handleSuccess(position);

            const coords: LocationCoordinates = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };

            resolve(coords);
          },
          (err) => {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current);
              timeoutRef.current = null;
            }

            handleError(err);
            reject(new Error(err.message));
          },
          {
            enableHighAccuracy: effectiveOptions.enableHighAccuracy,
            timeout: effectiveOptions.timeout,
            maximumAge: effectiveOptions.maximumAge,
          },
        );
      });
    },
    [mergedOptions, handleSuccess, handleError],
  );

  /**
   * Start watching position (useful for venue visits where location changes)
   */
  const watchPosition = useCallback(
    (customOptions?: GeolocationOptions): number | null => {
      if (!navigator.geolocation) {
        setError('Geolocation not supported');
        return null;
      }

      const effectiveOptions = { ...mergedOptions, ...customOptions };

      // Clear existing watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      setLoading(true);
      setError(null);

      const watchId = navigator.geolocation.watchPosition(
        handleSuccess,
        handleError,
        {
          enableHighAccuracy: effectiveOptions.enableHighAccuracy,
          timeout: effectiveOptions.timeout,
          maximumAge: effectiveOptions.maximumAge,
        },
      );

      watchIdRef.current = watchId;
      return watchId;
    },
    [mergedOptions, handleSuccess, handleError],
  );

  /**
   * Clear position watching
   */
  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setLoading(false);
    }
  }, []);

  /**
   * Reset permission state (useful for re-prompting)
   */
  const resetPermission = useCallback(() => {
    setPermission(null);
    setError(null);
    setCoordinates(null);
    setAccuracy(null);
  }, []);

  /**
   * Initialize permissions check on mount
   */
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  /**
   * Auto-watch position if enabled
   */
  useEffect(() => {
    if (mergedOptions.watch && permission === 'granted') {
      watchPosition();
    }

    return () => {
      clearWatch();
    };
  }, [mergedOptions.watch, permission, watchPosition, clearWatch]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      clearWatch();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [clearWatch]);

  return {
    // State
    coordinates,
    accuracy,
    error,
    loading,
    permission,

    // Actions
    getCurrentPosition,
    watchPosition,
    clearWatch,
    resetPermission,
  };
}

export default useGeolocation;
