'use client';

import { useState, useEffect, useCallback } from 'react';

interface PlatformInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  touchCapable: boolean;
  isPortrait: boolean;
  isLandscape: boolean;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  isIOSSafari: boolean;
  isAndroidChrome: boolean;
  isPWA: boolean;
  prefersDarkMode: boolean;
  prefersReducedMotion: boolean;
  supportsVibration: boolean;
  supportsBatteryAPI: boolean;
  supportsServiceWorker: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  orientationType:
    | 'portrait-primary'
    | 'portrait-secondary'
    | 'landscape-primary'
    | 'landscape-secondary'
    | 'unknown';
}

export const usePlatformDetection = (): PlatformInfo => {
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo>(() => {
    if (typeof window === 'undefined') {
      // SSR defaults
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        touchCapable: false,
        isPortrait: true,
        isLandscape: false,
        screenWidth: 1920,
        screenHeight: 1080,
        pixelRatio: 1,
        isIOSSafari: false,
        isAndroidChrome: false,
        isPWA: false,
        prefersDarkMode: false,
        prefersReducedMotion: false,
        supportsVibration: false,
        supportsBatteryAPI: false,
        supportsServiceWorker: false,
        deviceType: 'desktop' as const,
        orientationType: 'unknown' as const,
      };
    }

    // Client-side detection
    const userAgent = navigator.userAgent;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent,
      );
    const isTablet =
      /iPad|Android.*(?!.*Mobile)/i.test(userAgent) ||
      (isMobile && window.innerWidth >= 768);
    const isDesktop = !isMobile && !isTablet;
    const touchCapable =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isPortrait = window.innerHeight > window.innerWidth;
    const isLandscape = !isPortrait;

    return {
      isMobile,
      isTablet,
      isDesktop,
      touchCapable,
      isPortrait,
      isLandscape,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio || 1,
      isIOSSafari:
        /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream,
      isAndroidChrome: /Android.*Chrome/i.test(userAgent),
      isPWA: window.matchMedia('(display-mode: standalone)').matches,
      prefersDarkMode: window.matchMedia('(prefers-color-scheme: dark)')
        .matches,
      prefersReducedMotion: window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches,
      supportsVibration: 'vibrate' in navigator,
      supportsBatteryAPI: 'getBattery' in navigator,
      supportsServiceWorker: 'serviceWorker' in navigator,
      deviceType: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
      orientationType: (screen.orientation?.type || 'unknown') as any,
    };
  });

  // Update platform info on resize and orientation change
  const updatePlatformInfo = useCallback(() => {
    if (typeof window === 'undefined') return;

    const userAgent = navigator.userAgent;
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        userAgent,
      );
    const isTablet =
      /iPad|Android.*(?!.*Mobile)/i.test(userAgent) ||
      (isMobile && window.innerWidth >= 768);
    const isDesktop = !isMobile && !isTablet;
    const isPortrait = window.innerHeight > window.innerWidth;
    const isLandscape = !isPortrait;

    setPlatformInfo((prev) => ({
      ...prev,
      isMobile,
      isTablet,
      isDesktop,
      isPortrait,
      isLandscape,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      deviceType: isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop',
      orientationType: (screen.orientation?.type || 'unknown') as any,
    }));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Listen for resize events
    window.addEventListener('resize', updatePlatformInfo);

    // Listen for orientation changes
    if (screen.orientation) {
      screen.orientation.addEventListener('change', updatePlatformInfo);
    } else {
      // Fallback for older browsers
      window.addEventListener('orientationchange', updatePlatformInfo);
    }

    // Listen for media query changes
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const reducedMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );
    const pwaQuery = window.matchMedia('(display-mode: standalone)');

    const handleMediaQueryChange = () => {
      setPlatformInfo((prev) => ({
        ...prev,
        prefersDarkMode: darkModeQuery.matches,
        prefersReducedMotion: reducedMotionQuery.matches,
        isPWA: pwaQuery.matches,
      }));
    };

    darkModeQuery.addEventListener('change', handleMediaQueryChange);
    reducedMotionQuery.addEventListener('change', handleMediaQueryChange);
    pwaQuery.addEventListener('change', handleMediaQueryChange);

    return () => {
      window.removeEventListener('resize', updatePlatformInfo);

      if (screen.orientation) {
        screen.orientation.removeEventListener('change', updatePlatformInfo);
      } else {
        window.removeEventListener('orientationchange', updatePlatformInfo);
      }

      darkModeQuery.removeEventListener('change', handleMediaQueryChange);
      reducedMotionQuery.removeEventListener('change', handleMediaQueryChange);
      pwaQuery.removeEventListener('change', handleMediaQueryChange);
    };
  }, [updatePlatformInfo]);

  return platformInfo;
};

// Breakpoint detection hook
export const useBreakpoint = () => {
  const { screenWidth } = usePlatformDetection();

  return {
    isMobile: screenWidth < 640,
    isTablet: screenWidth >= 640 && screenWidth < 1024,
    isDesktop: screenWidth >= 1024,
    isLarge: screenWidth >= 1280,
    isXLarge: screenWidth >= 1536,
    currentBreakpoint:
      screenWidth < 640
        ? 'mobile'
        : screenWidth < 1024
          ? 'tablet'
          : screenWidth < 1280
            ? 'desktop'
            : screenWidth < 1536
              ? 'large'
              : 'xlarge',
  };
};

// Device capabilities detection
export const useDeviceCapabilities = () => {
  const [capabilities, setCapabilities] = useState({
    hasAccelerometer: false,
    hasGyroscope: false,
    hasAmbientLightSensor: false,
    hasGeolocation: false,
    hasCamera: false,
    hasMicrophone: false,
    hasSpeakers: true,
    hasVibration: false,
    hasBluetooth: false,
    hasNFC: false,
    batteryLevel: null as number | null,
    isCharging: null as boolean | null,
    maxTouchPoints: 0,
    connectionType: 'unknown' as string,
    connectionSpeed: null as number | null,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detectCapabilities = async () => {
      const newCapabilities = { ...capabilities };

      // Device motion and orientation
      if ('DeviceMotionEvent' in window) {
        newCapabilities.hasAccelerometer = true;
        newCapabilities.hasGyroscope = true;
      }

      // Ambient light sensor
      if ('AmbientLightSensor' in window) {
        newCapabilities.hasAmbientLightSensor = true;
      }

      // Geolocation
      if ('geolocation' in navigator) {
        newCapabilities.hasGeolocation = true;
      }

      // Media devices
      if ('mediaDevices' in navigator) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          newCapabilities.hasCamera = devices.some(
            (device) => device.kind === 'videoinput',
          );
          newCapabilities.hasMicrophone = devices.some(
            (device) => device.kind === 'audioinput',
          );
        } catch (error) {
          console.warn('Could not enumerate media devices:', error);
        }
      }

      // Vibration
      newCapabilities.hasVibration = 'vibrate' in navigator;

      // Bluetooth
      newCapabilities.hasBluetooth = 'bluetooth' in navigator;

      // NFC
      newCapabilities.hasNFC = 'nfc' in navigator;

      // Touch points
      newCapabilities.maxTouchPoints = navigator.maxTouchPoints || 0;

      // Network information
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;
      if (connection) {
        newCapabilities.connectionType =
          connection.effectiveType || connection.type || 'unknown';
        newCapabilities.connectionSpeed = connection.downlink || null;
      }

      // Battery API
      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          newCapabilities.batteryLevel = battery.level;
          newCapabilities.isCharging = battery.charging;

          // Listen for battery changes
          battery.addEventListener('levelchange', () => {
            setCapabilities((prev) => ({
              ...prev,
              batteryLevel: battery.level,
            }));
          });

          battery.addEventListener('chargingchange', () => {
            setCapabilities((prev) => ({
              ...prev,
              isCharging: battery.charging,
            }));
          });
        } catch (error) {
          console.warn('Could not access battery API:', error);
        }
      }

      setCapabilities(newCapabilities);
    };

    detectCapabilities();
  }, []);

  return capabilities;
};

// DJ-specific venue environment detection
export const useVenueEnvironment = () => {
  const [environment, setEnvironment] = useState({
    lightLevel: 'unknown' as 'bright' | 'normal' | 'dim' | 'dark' | 'unknown',
    noiseLevel: 'unknown' as
      | 'quiet'
      | 'normal'
      | 'loud'
      | 'very-loud'
      | 'unknown',
    temperature: 'unknown' as
      | 'cold'
      | 'cool'
      | 'normal'
      | 'warm'
      | 'hot'
      | 'unknown',
    networkQuality: 'unknown' as
      | 'excellent'
      | 'good'
      | 'fair'
      | 'poor'
      | 'offline'
      | 'unknown',
    batteryDrain: 'normal' as 'low' | 'normal' | 'high' | 'critical',
    recommendedMode: 'auto' as
      | 'auto'
      | 'power-saver'
      | 'performance'
      | 'venue-optimized',
  });

  // Detect ambient light levels (if supported)
  useEffect(() => {
    if ('AmbientLightSensor' in window) {
      try {
        const sensor = new (window as any).AmbientLightSensor();
        sensor.addEventListener('reading', () => {
          const lux = sensor.illuminance;
          let lightLevel: typeof environment.lightLevel = 'normal';

          if (lux < 1) lightLevel = 'dark';
          else if (lux < 10) lightLevel = 'dim';
          else if (lux < 1000) lightLevel = 'normal';
          else lightLevel = 'bright';

          setEnvironment((prev) => ({ ...prev, lightLevel }));
        });
        sensor.start();

        return () => sensor.stop();
      } catch (error) {
        console.warn('Ambient light sensor not available:', error);
      }
    }
  }, []);

  // Monitor network quality for venue connectivity
  useEffect(() => {
    const connection = (navigator as any).connection;
    if (connection) {
      const updateNetworkQuality = () => {
        const effectiveType = connection.effectiveType;
        let networkQuality: typeof environment.networkQuality = 'unknown';

        switch (effectiveType) {
          case '4g':
            networkQuality = 'excellent';
            break;
          case '3g':
            networkQuality = 'good';
            break;
          case '2g':
            networkQuality = 'fair';
            break;
          case 'slow-2g':
            networkQuality = 'poor';
            break;
          default:
            networkQuality = 'unknown';
        }

        setEnvironment((prev) => ({ ...prev, networkQuality }));
      };

      connection.addEventListener('change', updateNetworkQuality);
      updateNetworkQuality();

      return () =>
        connection.removeEventListener('change', updateNetworkQuality);
    }
  }, []);

  // Recommend venue-specific optimizations
  const getVenueRecommendations = useCallback(() => {
    const { lightLevel, networkQuality, batteryDrain } = environment;

    const recommendations = {
      useHighContrast: lightLevel === 'bright',
      useDarkMode: lightLevel === 'dim' || lightLevel === 'dark',
      enableOfflineMode:
        networkQuality === 'poor' || networkQuality === 'offline',
      reduceBrightness: batteryDrain === 'high' || batteryDrain === 'critical',
      simplifyAnimations: batteryDrain === 'high' || networkQuality === 'poor',
      preloadContent:
        networkQuality === 'good' || networkQuality === 'excellent',
      enablePowerSaving: batteryDrain === 'high',
    };

    return recommendations;
  }, [environment]);

  return {
    environment,
    recommendations: getVenueRecommendations(),
  };
};

export default usePlatformDetection;
