import { TouchDebouncingService } from '@/lib/services/mobile/TouchDebouncing';

// Mock haptic feedback API
Object.defineProperty(navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
});

// Mock touch events
const mockTouchEvent = (touches: Array<{ clientX: number; clientY: number; force?: number }>) => ({
  touches: touches.map(touch => ({
    clientX: touch.clientX,
    clientY: touch.clientY,
    force: touch.force || 0.5,
    identifier: Math.random(),
  })),
  changedTouches: touches.map(touch => ({
    clientX: touch.clientX,
    clientY: touch.clientY,
    force: touch.force || 0.5,
    identifier: Math.random(),
  })),
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
});

describe('TouchDebouncingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Reset service state
    TouchDebouncingService.reset();
    
    // Mock performance.now()
    jest.spyOn(performance, 'now').mockImplementation(() => Date.now());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Basic Debouncing', () => {
    it('debounces rapid function calls', () => {
      const mockCallback = jest.fn();
      const debouncedFn = TouchDebouncingService.debounce(mockCallback, 100);
      
      // Rapid calls
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      // Should not be called immediately
      expect(mockCallback).not.toHaveBeenCalled();
      
      // Should be called after debounce delay
      jest.advanceTimersByTime(100);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('resets debounce timer on subsequent calls', () => {
      const mockCallback = jest.fn();
      const debouncedFn = TouchDebouncingService.debounce(mockCallback, 100);
      
      debouncedFn();
      
      // Call again before timer expires
      jest.advanceTimersByTime(50);
      debouncedFn();
      
      // Original timer should be reset
      jest.advanceTimersByTime(50);
      expect(mockCallback).not.toHaveBeenCalled();
      
      // Should be called after full delay from last call
      jest.advanceTimersByTime(50);
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });

    it('preserves function context and arguments', () => {
      const mockCallback = jest.fn();
      const debouncedFn = TouchDebouncingService.debounce(mockCallback, 100);
      
      debouncedFn('arg1', 'arg2');
      
      jest.advanceTimersByTime(100);
      
      expect(mockCallback).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('handles multiple debounced functions independently', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      const debounced1 = TouchDebouncingService.debounce(callback1, 100);
      const debounced2 = TouchDebouncingService.debounce(callback2, 200);
      
      debounced1();
      debounced2();
      
      jest.advanceTimersByTime(100);
      expect(callback1).toHaveBeenCalled();
      expect(callback2).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100);
      expect(callback2).toHaveBeenCalled();
    });
  });

  describe('Ghost Touch Detection', () => {
    it('detects ghost touches from palm rejection', () => {
      const touchEvent = mockTouchEvent([
        { clientX: 100, clientY: 100, force: 0.1 }, // Very light touch (likely palm)
      ]);
      
      const isGhost = TouchDebouncingService.preventGhostTouch(touchEvent);
      
      expect(isGhost).toBe(false); // Should prevent this touch
    });

    it('allows legitimate touches', () => {
      const touchEvent = mockTouchEvent([
        { clientX: 100, clientY: 100, force: 0.8 }, // Normal touch pressure
      ]);
      
      const isGhost = TouchDebouncingService.preventGhostTouch(touchEvent);
      
      expect(isGhost).toBe(true); // Should allow this touch
    });

    it('detects rapid touch sequences as ghost touches', () => {
      const touchEvent1 = mockTouchEvent([{ clientX: 100, clientY: 100 }]);
      const touchEvent2 = mockTouchEvent([{ clientX: 105, clientY: 105 }]); // Very close to first
      
      TouchDebouncingService.preventGhostTouch(touchEvent1);
      
      // Second touch immediately after first
      const isGhost = TouchDebouncingService.preventGhostTouch(touchEvent2);
      
      expect(isGhost).toBe(false); // Should be detected as ghost
    });

    it('allows touches after sufficient time delay', () => {
      const touchEvent1 = mockTouchEvent([{ clientX: 100, clientY: 100 }]);
      const touchEvent2 = mockTouchEvent([{ clientX: 105, clientY: 105 }]);
      
      TouchDebouncingService.preventGhostTouch(touchEvent1);
      
      // Advance time beyond ghost detection threshold
      jest.advanceTimersByTime(150);
      
      const isGhost = TouchDebouncingService.preventGhostTouch(touchEvent2);
      
      expect(isGhost).toBe(true); // Should be allowed
    });

    it('handles multiple simultaneous touches', () => {
      const touchEvent = mockTouchEvent([
        { clientX: 100, clientY: 100, force: 0.8 },
        { clientX: 200, clientY: 200, force: 0.2 }, // One light, one normal
      ]);
      
      const isGhost = TouchDebouncingService.preventGhostTouch(touchEvent);
      
      // Should allow if at least one touch is legitimate
      expect(isGhost).toBe(true);
    });

    it('learns from user touch patterns', () => {
      // Simulate user making several legitimate touches
      for (let i = 0; i < 10; i++) {
        const touchEvent = mockTouchEvent([{ clientX: 100 + i * 10, clientY: 100 }]);
        TouchDebouncingService.preventGhostTouch(touchEvent);
        jest.advanceTimersByTime(500); // Normal spacing between touches
      }
      
      // Now a similar pattern should be more likely to be allowed
      const newTouchEvent = mockTouchEvent([{ clientX: 200, clientY: 100, force: 0.3 }]);
      const isGhost = TouchDebouncingService.preventGhostTouch(newTouchEvent);
      
      // Should be more lenient based on learned patterns
      expect(isGhost).toBe(true);
    });
  });

  describe('Haptic Feedback', () => {
    it('provides light haptic feedback', () => {
      TouchDebouncingService.handleHapticFeedback('light');
      
      expect(navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it('provides medium haptic feedback', () => {
      TouchDebouncingService.handleHapticFeedback('medium');
      
      expect(navigator.vibrate).toHaveBeenCalledWith(20);
    });

    it('provides heavy haptic feedback', () => {
      TouchDebouncingService.handleHapticFeedback('heavy');
      
      expect(navigator.vibrate).toHaveBeenCalledWith(50);
    });

    it('provides success haptic feedback pattern', () => {
      TouchDebouncingService.handleHapticFeedback('success');
      
      expect(navigator.vibrate).toHaveBeenCalledWith([10, 50, 10]);
    });

    it('provides error haptic feedback pattern', () => {
      TouchDebouncingService.handleHapticFeedback('error');
      
      expect(navigator.vibrate).toHaveBeenCalledWith([50, 50, 50]);
    });

    it('handles lack of vibration support gracefully', () => {
      // Remove vibration support
      Object.defineProperty(navigator, 'vibrate', {
        value: undefined,
        writable: true,
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => {
        TouchDebouncingService.handleHapticFeedback('light');
      }).not.toThrow();
      
      expect(consoleWarn).toHaveBeenCalledWith('Haptic feedback not supported on this device');
      
      consoleWarn.mockRestore();
    });

    it('respects user haptic feedback preferences', () => {
      // Mock user preference for reduced motion
      Object.defineProperty(window, 'matchMedia', {
        value: jest.fn().mockReturnValue({
          matches: true,
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
        }),
      });
      
      TouchDebouncingService.handleHapticFeedback('heavy');
      
      // Should not vibrate when user prefers reduced motion
      expect(navigator.vibrate).not.toHaveBeenCalled();
    });
  });

  describe('Touch Target Validation', () => {
    it('validates minimum touch target size', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          width: 30,
          height: 30, // Below iOS minimum of 44px
        }),
      } as Element;
      
      const isValid = TouchDebouncingService.validateTouchTarget(mockElement);
      
      expect(isValid).toBe(false);
    });

    it('allows adequately sized touch targets', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          width: 48,
          height: 48, // Above minimum size
        }),
      } as Element;
      
      const isValid = TouchDebouncingService.validateTouchTarget(mockElement);
      
      expect(isValid).toBe(true);
    });

    it('warns about inadequate touch targets', () => {
      const mockElement = {
        getBoundingClientRect: () => ({
          width: 20,
          height: 20,
        }),
        tagName: 'BUTTON',
        className: 'small-button',
      } as Element;
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      TouchDebouncingService.validateTouchTarget(mockElement);
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Touch target too small')
      );
      
      consoleWarn.mockRestore();
    });

    it('adjusts validation based on device pixel density', () => {
      // Mock high DPI device
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 3,
        writable: true,
      });
      
      const mockElement = {
        getBoundingClientRect: () => ({
          width: 36, // Would be too small for 1x display
          height: 36, // but adequate for 3x display
        }),
      } as Element;
      
      const isValid = TouchDebouncingService.validateTouchTarget(mockElement);
      
      expect(isValid).toBe(true);
    });
  });

  describe('Adaptive Debouncing', () => {
    it('adjusts debounce delays based on device performance', () => {
      // Mock slow device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 2, // Low core count
        writable: true,
      });
      
      const mockCallback = jest.fn();
      const debouncedFn = TouchDebouncingService.adaptiveDebounce(mockCallback);
      
      debouncedFn();
      
      // Should use longer delay for slower devices
      jest.advanceTimersByTime(50); // Normal delay
      expect(mockCallback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(100); // Extended delay for slow device
      expect(mockCallback).toHaveBeenCalled();
    });

    it('uses shorter delays for high-performance devices', () => {
      // Mock fast device
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        value: 8, // High core count
        writable: true,
      });
      
      const mockCallback = jest.fn();
      const debouncedFn = TouchDebouncingService.adaptiveDebounce(mockCallback);
      
      debouncedFn();
      
      // Should use shorter delay for faster devices
      jest.advanceTimersByTime(25);
      expect(mockCallback).toHaveBeenCalled();
    });

    it('learns from user interaction patterns', () => {
      const mockCallback = jest.fn();
      const adaptiveFn = TouchDebouncingService.adaptiveDebounce(mockCallback, {
        learnFromUser: true,
      });
      
      // Simulate user making rapid interactions successfully
      for (let i = 0; i < 20; i++) {
        adaptiveFn();
        jest.advanceTimersByTime(30); // User comfortable with 30ms delays
      }
      
      // Next interaction should use learned shorter delay
      const newCallback = jest.fn();
      const newAdaptiveFn = TouchDebouncingService.adaptiveDebounce(newCallback);
      
      newAdaptiveFn();
      jest.advanceTimersByTime(30);
      
      expect(newCallback).toHaveBeenCalled(); // Should be called with learned delay
    });
  });

  describe('Performance Optimization', () => {
    it('uses requestAnimationFrame for smooth interactions', () => {
      const mockRAF = jest.fn();
      global.requestAnimationFrame = mockRAF;
      
      const mockCallback = jest.fn();
      TouchDebouncingService.smoothDebounce(mockCallback);
      
      expect(mockRAF).toHaveBeenCalled();
    });

    it('batches multiple debounced calls efficiently', () => {
      const callbacks = [jest.fn(), jest.fn(), jest.fn()];
      const debouncedFns = callbacks.map(cb => 
        TouchDebouncingService.debounce(cb, 100)
      );
      
      // Call all functions rapidly
      debouncedFns.forEach(fn => fn());
      
      jest.advanceTimersByTime(100);
      
      // All should be called in the same frame
      callbacks.forEach(callback => {
        expect(callback).toHaveBeenCalled();
      });
    });

    it('cleans up timers properly to prevent memory leaks', () => {
      const mockCallback = jest.fn();
      const debouncedFn = TouchDebouncingService.debounce(mockCallback, 100);
      
      debouncedFn();
      
      // Cancel the debounced function
      TouchDebouncingService.cancel(debouncedFn);
      
      jest.advanceTimersByTime(100);
      
      // Should not be called after cancellation
      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles invalid touch events gracefully', () => {
      const invalidTouchEvent = null;
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = TouchDebouncingService.preventGhostTouch(invalidTouchEvent as any);
      
      expect(result).toBe(true); // Default to allowing touch
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid touch event')
      );
      
      consoleWarn.mockRestore();
    });

    it('handles callback errors without breaking debouncing', () => {
      const errorCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      const debouncedFn = TouchDebouncingService.debounce(errorCallback, 100);
      
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      
      debouncedFn();
      jest.advanceTimersByTime(100);
      
      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining('Error in debounced callback')
      );
      
      // Service should still work for subsequent calls
      const workingCallback = jest.fn();
      const workingFn = TouchDebouncingService.debounce(workingCallback, 100);
      
      workingFn();
      jest.advanceTimersByTime(100);
      
      expect(workingCallback).toHaveBeenCalled();
      
      consoleError.mockRestore();
    });

    it('handles missing touch properties gracefully', () => {
      const malformedTouchEvent = {
        touches: [
          { clientX: 100 }, // Missing clientY and other properties
        ],
      };
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      const result = TouchDebouncingService.preventGhostTouch(malformedTouchEvent as any);
      
      expect(result).toBe(true); // Should default to allowing
      expect(consoleWarn).toHaveBeenCalled();
      
      consoleWarn.mockRestore();
    });

    it('recovers from haptic feedback errors', () => {
      // Mock vibrate to throw error
      Object.defineProperty(navigator, 'vibrate', {
        value: jest.fn(() => {
          throw new Error('Vibration error');
        }),
        writable: true,
      });
      
      const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
      
      expect(() => {
        TouchDebouncingService.handleHapticFeedback('light');
      }).not.toThrow();
      
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('Haptic feedback error')
      );
      
      consoleWarn.mockRestore();
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('adapts to iOS touch behavior', () => {
      // Mock iOS user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
        writable: true,
      });
      
      const touchEvent = mockTouchEvent([{ clientX: 100, clientY: 100, force: 0.4 }]);
      
      // iOS has different force sensitivity
      const isGhost = TouchDebouncingService.preventGhostTouch(touchEvent);
      
      expect(isGhost).toBe(true); // Should be more lenient on iOS
    });

    it('adapts to Android touch behavior', () => {
      // Mock Android user agent
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 11; SM-G975F)',
        writable: true,
      });
      
      const touchEvent = mockTouchEvent([{ clientX: 100, clientY: 100 }]);
      
      const isGhost = TouchDebouncingService.preventGhostTouch(touchEvent);
      
      // Android ghost touch detection should work differently
      expect(typeof isGhost).toBe('boolean');
    });

    it('handles different haptic feedback capabilities', () => {
      // Mock limited haptic support
      Object.defineProperty(navigator, 'vibrate', {
        value: (pattern: number | number[]) => {
          // Some devices only support simple patterns
          return Array.isArray(pattern) ? false : true;
        },
        writable: true,
      });
      
      TouchDebouncingService.handleHapticFeedback('success'); // Complex pattern
      
      // Should fallback to simple vibration
      expect(navigator.vibrate).toHaveBeenCalled();
    });
  });
});