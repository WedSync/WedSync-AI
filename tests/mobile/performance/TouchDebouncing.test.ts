import { jest } from '@jest/globals';
import { TouchDebouncing } from '../../../src/lib/services/mobile/TouchDebouncing';
import { TouchGesture, TouchTarget, GhostTouchPattern, TouchMetrics } from '../../../src/types/mobile-analytics';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
};

global.performance = mockPerformance as any;

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16);
  return 1;
});

global.cancelAnimationFrame = jest.fn();

// Mock haptic feedback
Object.defineProperty(window.navigator, 'vibrate', {
  value: jest.fn(),
  writable: true,
});

// Mock touch events
class MockTouch implements Touch {
  identifier: number;
  target: EventTarget;
  screenX: number;
  screenY: number;
  clientX: number;
  clientY: number;
  pageX: number;
  pageY: number;
  radiusX: number;
  radiusY: number;
  rotationAngle: number;
  force: number;

  constructor(props: Partial<Touch>) {
    this.identifier = props.identifier || 0;
    this.target = props.target || document.body;
    this.screenX = props.screenX || 0;
    this.screenY = props.screenY || 0;
    this.clientX = props.clientX || 0;
    this.clientY = props.clientY || 0;
    this.pageX = props.pageX || 0;
    this.pageY = props.pageY || 0;
    this.radiusX = props.radiusX || 1;
    this.radiusY = props.radiusY || 1;
    this.rotationAngle = props.rotationAngle || 0;
    this.force = props.force || 1;
  }
}

const createMockTouchEvent = (type: string, touches: Partial<Touch>[]): TouchEvent => {
  const mockTouches = touches.map(touch => new MockTouch(touch));
  
  return {
    type,
    touches: mockTouches,
    changedTouches: mockTouches,
    targetTouches: mockTouches,
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
    target: document.body,
    currentTarget: document.body,
    timeStamp: Date.now(),
  } as any;
};

describe('TouchDebouncing', () => {
  let touchDebouncing: TouchDebouncing;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    mockPerformance.now.mockReturnValue(Date.now());
    
    touchDebouncing = TouchDebouncing.getInstance();
  });

  afterEach(() => {
    touchDebouncing.cleanup();
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TouchDebouncing.getInstance();
      const instance2 = TouchDebouncing.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = TouchDebouncing.getInstance();
      instance1.setDebounceTime(200);
      
      const instance2 = TouchDebouncing.getInstance();
      
      expect(instance2.getDebounceTime()).toBe(200);
    });
  });

  describe('Basic Debouncing', () => {
    it('should debounce rapid touch events', () => {
      const callback = jest.fn();
      const debouncedCallback = touchDebouncing.debounce(callback, 100);

      // Rapid calls
      debouncedCallback();
      debouncedCallback();
      debouncedCallback();

      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should reset debounce timer on subsequent calls', () => {
      const callback = jest.fn();
      const debouncedCallback = touchDebouncing.debounce(callback, 100);

      debouncedCallback();
      
      jest.advanceTimersByTime(50);
      debouncedCallback(); // Should reset timer
      
      jest.advanceTimersByTime(50);
      expect(callback).not.toHaveBeenCalled();
      
      jest.advanceTimersByTime(50);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle immediate execution option', () => {
      const callback = jest.fn();
      const debouncedCallback = touchDebouncing.debounce(callback, 100, { immediate: true });

      debouncedCallback();
      
      expect(callback).toHaveBeenCalledTimes(1);

      // Subsequent calls within debounce time should be ignored
      debouncedCallback();
      debouncedCallback();
      
      expect(callback).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(100);
      
      // Should be able to call again after debounce period
      debouncedCallback();
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments correctly', () => {
      const callback = jest.fn();
      const debouncedCallback = touchDebouncing.debounce(callback, 100);

      debouncedCallback('arg1', 'arg2', 123);

      jest.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 123);
    });

    it('should cancel pending debounced calls', () => {
      const callback = jest.fn();
      const debouncedCallback = touchDebouncing.debounce(callback, 100);

      debouncedCallback();
      
      const cancelFn = debouncedCallback.cancel;
      cancelFn();

      jest.advanceTimersByTime(100);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Touch Target Management', () => {
    it('should register touch targets with validation', () => {
      const element = document.createElement('div');
      element.style.width = '50px';
      element.style.height = '50px';
      
      const touchTarget: TouchTarget = {
        element,
        minSize: 48,
        debounceTime: 150,
        priority: 'high',
        ghostTouchProtection: true,
        hapticFeedback: true,
      };

      touchDebouncing.setTouchTarget('button1', touchTarget);

      const registered = touchDebouncing.getTouchTarget('button1');
      expect(registered).toEqual(touchTarget);
    });

    it('should validate touch target size', () => {
      const smallElement = document.createElement('div');
      smallElement.style.width = '30px';
      smallElement.style.height = '30px';
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const touchTarget: TouchTarget = {
        element: smallElement,
        minSize: 48,
        debounceTime: 150,
        priority: 'high',
        ghostTouchProtection: true,
        hapticFeedback: true,
      };

      touchDebouncing.setTouchTarget('smallButton', touchTarget);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Touch target smallButton is smaller than recommended minimum size (48px)'
      );

      consoleSpy.mockRestore();
    });

    it('should apply adaptive debounce timing based on target priority', () => {
      const highPriorityTarget: TouchTarget = {
        element: document.createElement('div'),
        minSize: 48,
        debounceTime: 50,
        priority: 'high',
        ghostTouchProtection: true,
        hapticFeedback: true,
      };

      const lowPriorityTarget: TouchTarget = {
        element: document.createElement('div'),
        minSize: 48,
        debounceTime: 200,
        priority: 'low',
        ghostTouchProtection: true,
        hapticFeedback: false,
      };

      touchDebouncing.setTouchTarget('highPriority', highPriorityTarget);
      touchDebouncing.setTouchTarget('lowPriority', lowPriorityTarget);

      const highDebounceTime = touchDebouncing.getAdaptiveDebounceTime('high');
      const lowDebounceTime = touchDebouncing.getAdaptiveDebounceTime('low');

      expect(highDebounceTime).toBeLessThan(lowDebounceTime);
    });

    it('should remove touch targets', () => {
      const element = document.createElement('div');
      const touchTarget: TouchTarget = {
        element,
        minSize: 48,
        debounceTime: 150,
        priority: 'medium',
        ghostTouchProtection: true,
        hapticFeedback: true,
      };

      touchDebouncing.setTouchTarget('temp', touchTarget);
      expect(touchDebouncing.getTouchTarget('temp')).toBeDefined();

      touchDebouncing.removeTouchTarget('temp');
      expect(touchDebouncing.getTouchTarget('temp')).toBeUndefined();
    });
  });

  describe('Ghost Touch Detection', () => {
    it('should detect ghost touches from rapid identical events', () => {
      const touchEvent1 = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      const touchEvent2 = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 1 }
      ]);

      const isGhost1 = touchDebouncing.isGhostTouch(touchEvent1);
      expect(isGhost1).toBe(false);

      // Same position, very close in time
      mockPerformance.now.mockReturnValue(Date.now() + 5);
      const isGhost2 = touchDebouncing.isGhostTouch(touchEvent2);
      expect(isGhost2).toBe(true);
    });

    it('should not flag legitimate touches as ghost touches', () => {
      const touchEvent1 = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      const touchEvent2 = createMockTouchEvent('touchstart', [
        { clientX: 200, clientY: 200, identifier: 1 }
      ]);

      touchDebouncing.isGhostTouch(touchEvent1);

      // Different position
      const isGhost = touchDebouncing.isGhostTouch(touchEvent2);
      expect(isGhost).toBe(false);
    });

    it('should detect palm rejection patterns', () => {
      // Simulate palm touch (large contact area)
      const palmTouchEvent = createMockTouchEvent('touchstart', [
        { 
          clientX: 100, 
          clientY: 100, 
          identifier: 0,
          radiusX: 50,
          radiusY: 50,
          force: 0.2 // Low pressure
        }
      ]);

      const isPalm = touchDebouncing.isPalmTouch(palmTouchEvent);
      expect(isPalm).toBe(true);
    });

    it('should learn from ghost touch patterns', () => {
      // Simulate multiple ghost touches in same area
      for (let i = 0; i < 5; i++) {
        const ghostEvent = createMockTouchEvent('touchstart', [
          { clientX: 150 + i, clientY: 150 + i, identifier: i }
        ]);
        
        touchDebouncing.isGhostTouch(ghostEvent);
        mockPerformance.now.mockReturnValue(Date.now() + 10);
      }

      const patterns = touchDebouncing.getGhostTouchPatterns();
      expect(patterns).toHaveLength(1);
      expect(patterns[0].area.x).toBeCloseTo(150, 10);
      expect(patterns[0].area.y).toBeCloseTo(150, 10);
      expect(patterns[0].confidence).toBeGreaterThan(0.5);
    });

    it('should adapt ghost detection sensitivity', () => {
      // High ghost touch rate should increase sensitivity
      for (let i = 0; i < 10; i++) {
        const ghostEvent = createMockTouchEvent('touchstart', [
          { clientX: 100, clientY: 100, identifier: i }
        ]);
        touchDebouncing.isGhostTouch(ghostEvent);
        mockPerformance.now.mockReturnValue(Date.now() + 5);
      }

      const sensitivity = touchDebouncing.getGhostDetectionSensitivity();
      expect(sensitivity).toBeGreaterThan(0.5);
    });
  });

  describe('Haptic Feedback', () => {
    it('should provide haptic feedback for successful touches', () => {
      const element = document.createElement('div');
      const touchTarget: TouchTarget = {
        element,
        minSize: 48,
        debounceTime: 100,
        priority: 'high',
        ghostTouchProtection: true,
        hapticFeedback: true,
      };

      touchDebouncing.setTouchTarget('hapticButton', touchTarget);

      const touchEvent = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      touchDebouncing.handleTouchStart('hapticButton', touchEvent);

      expect(window.navigator.vibrate).toHaveBeenCalledWith(10);
    });

    it('should not provide haptic feedback when disabled', () => {
      const element = document.createElement('div');
      const touchTarget: TouchTarget = {
        element,
        minSize: 48,
        debounceTime: 100,
        priority: 'high',
        ghostTouchProtection: true,
        hapticFeedback: false,
      };

      touchDebouncing.setTouchTarget('nonHapticButton', touchTarget);

      const touchEvent = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      touchDebouncing.handleTouchStart('nonHapticButton', touchEvent);

      expect(window.navigator.vibrate).not.toHaveBeenCalled();
    });

    it('should provide different haptic patterns for different interactions', () => {
      const successPattern = touchDebouncing.getHapticPattern('success');
      const errorPattern = touchDebouncing.getHapticPattern('error');
      const warningPattern = touchDebouncing.getHapticPattern('warning');

      expect(successPattern).toEqual([10]);
      expect(errorPattern).toEqual([50, 50, 50]);
      expect(warningPattern).toEqual([25, 25, 25]);
    });

    it('should respect haptic feedback preferences', () => {
      touchDebouncing.setHapticEnabled(false);

      const element = document.createElement('div');
      const touchTarget: TouchTarget = {
        element,
        minSize: 48,
        debounceTime: 100,
        priority: 'high',
        ghostTouchProtection: true,
        hapticFeedback: true,
      };

      touchDebouncing.setTouchTarget('button', touchTarget);

      const touchEvent = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      touchDebouncing.handleTouchStart('button', touchEvent);

      expect(window.navigator.vibrate).not.toHaveBeenCalled();
    });
  });

  describe('Touch Event Processing', () => {
    it('should handle touch start events', () => {
      const callback = jest.fn();
      const debouncedCallback = touchDebouncing.debounce(callback, 100);

      const touchEvent = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      touchDebouncing.handleTouchStart('test', touchEvent, debouncedCallback);

      jest.advanceTimersByTime(100);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('should handle touch move events', () => {
      const moveCallback = jest.fn();

      const startEvent = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      const moveEvent = createMockTouchEvent('touchmove', [
        { clientX: 110, clientY: 110, identifier: 0 }
      ]);

      touchDebouncing.handleTouchStart('test', startEvent);
      touchDebouncing.handleTouchMove('test', moveEvent, moveCallback);

      expect(moveCallback).toHaveBeenCalledWith(moveEvent);
    });

    it('should handle touch end events', () => {
      const endCallback = jest.fn();

      const startEvent = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      const endEvent = createMockTouchEvent('touchend', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      touchDebouncing.handleTouchStart('test', startEvent);
      touchDebouncing.handleTouchEnd('test', endEvent, endCallback);

      expect(endCallback).toHaveBeenCalledWith(endEvent);
    });

    it('should track touch duration', () => {
      const startEvent = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      const endEvent = createMockTouchEvent('touchend', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      touchDebouncing.handleTouchStart('test', startEvent);
      
      mockPerformance.now.mockReturnValue(Date.now() + 500);
      
      touchDebouncing.handleTouchEnd('test', endEvent);

      const metrics = touchDebouncing.getTouchMetrics();
      expect(metrics.averageTouchDuration).toBeCloseTo(500, 50);
    });
  });

  describe('Adaptive Behavior', () => {
    it('should adapt debounce time based on user patterns', () => {
      // Simulate slow user
      for (let i = 0; i < 10; i++) {
        const touchEvent = createMockTouchEvent('touchstart', [
          { clientX: 100 + i, clientY: 100 + i, identifier: i }
        ]);
        
        touchDebouncing.handleTouchStart('test', touchEvent);
        mockPerformance.now.mockReturnValue(Date.now() + 300); // Slow touches
      }

      const adaptedTime = touchDebouncing.getAdaptiveDebounceTime('medium');
      expect(adaptedTime).toBeGreaterThan(150); // Should increase for slow users
    });

    it('should reduce debounce time for fast users', () => {
      // Simulate fast user
      for (let i = 0; i < 10; i++) {
        const touchEvent = createMockTouchEvent('touchstart', [
          { clientX: 100 + i, clientY: 100 + i, identifier: i }
        ]);
        
        touchDebouncing.handleTouchStart('test', touchEvent);
        mockPerformance.now.mockReturnValue(Date.now() + 50); // Fast touches
      }

      const adaptedTime = touchDebouncing.getAdaptiveDebounceTime('medium');
      expect(adaptedTime).toBeLessThan(150); // Should decrease for fast users
    });

    it('should learn user touch patterns', () => {
      // Simulate consistent touch pattern
      const pattern = { x: 100, y: 200, pressure: 0.5 };
      
      for (let i = 0; i < 5; i++) {
        const touchEvent = createMockTouchEvent('touchstart', [
          { 
            clientX: pattern.x + (Math.random() - 0.5) * 10,
            clientY: pattern.y + (Math.random() - 0.5) * 10,
            force: pattern.pressure + (Math.random() - 0.5) * 0.1,
            identifier: i 
          }
        ]);
        
        touchDebouncing.handleTouchStart('consistent', touchEvent);
      }

      const userPatterns = touchDebouncing.getUserTouchPatterns();
      expect(userPatterns).toHaveLength(1);
      expect(userPatterns[0].center.x).toBeCloseTo(pattern.x, 20);
      expect(userPatterns[0].center.y).toBeCloseTo(pattern.y, 20);
    });

    it('should adjust sensitivity based on device characteristics', () => {
      // Mock high DPI device
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 3,
        writable: true,
      });

      touchDebouncing.adjustForDevice();

      const highDPISensitivity = touchDebouncing.getTouchSensitivity();

      // Mock low DPI device
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 1,
        writable: true,
      });

      touchDebouncing.adjustForDevice();

      const lowDPISensitivity = touchDebouncing.getTouchSensitivity();

      expect(highDPISensitivity).toBeGreaterThan(lowDPISensitivity);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track touch event performance', () => {
      const callback = jest.fn();
      const debouncedCallback = touchDebouncing.debounce(callback, 100);

      for (let i = 0; i < 10; i++) {
        const touchEvent = createMockTouchEvent('touchstart', [
          { clientX: 100 + i, clientY: 100 + i, identifier: i }
        ]);
        
        touchDebouncing.handleTouchStart('perf-test', touchEvent, debouncedCallback);
        mockPerformance.now.mockReturnValue(Date.now() + 50);
      }

      const metrics = touchDebouncing.getPerformanceMetrics();
      expect(metrics.totalTouches).toBe(10);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    it('should detect performance bottlenecks', () => {
      // Simulate slow processing
      const slowCallback = jest.fn(() => {
        // Simulate slow operation
        const start = Date.now();
        while (Date.now() - start < 100) {
          // Busy wait
        }
      });

      const debouncedCallback = touchDebouncing.debounce(slowCallback, 50);

      for (let i = 0; i < 5; i++) {
        const touchEvent = createMockTouchEvent('touchstart', [
          { clientX: 100 + i, clientY: 100 + i, identifier: i }
        ]);
        
        touchDebouncing.handleTouchStart('slow-test', touchEvent, debouncedCallback);
        jest.advanceTimersByTime(50);
      }

      const bottlenecks = touchDebouncing.getPerformanceBottlenecks();
      expect(bottlenecks).toHaveLength(1);
      expect(bottlenecks[0].averageTime).toBeGreaterThan(50);
    });

    it('should provide touch statistics', () => {
      // Simulate various touch interactions
      const interactions = [
        { type: 'tap', duration: 100 },
        { type: 'long-press', duration: 800 },
        { type: 'swipe', duration: 300 },
        { type: 'tap', duration: 120 },
      ];

      interactions.forEach((interaction, i) => {
        const startEvent = createMockTouchEvent('touchstart', [
          { clientX: 100 + i * 50, clientY: 100, identifier: i }
        ]);
        
        touchDebouncing.handleTouchStart('stats', startEvent);
        
        mockPerformance.now.mockReturnValue(Date.now() + interaction.duration);
        
        const endEvent = createMockTouchEvent('touchend', [
          { clientX: 100 + i * 50, clientY: 100, identifier: i }
        ]);
        
        touchDebouncing.handleTouchEnd('stats', endEvent);
      });

      const stats = touchDebouncing.getTouchStatistics();
      expect(stats.totalInteractions).toBe(4);
      expect(stats.averageDuration).toBeCloseTo(330, 50);
      expect(stats.interactionTypes).toHaveProperty('tap', 2);
      expect(stats.interactionTypes).toHaveProperty('long-press', 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid touch events gracefully', () => {
      const invalidEvent = {
        type: 'touchstart',
        touches: null,
        preventDefault: jest.fn(),
      } as any;

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      expect(() => {
        touchDebouncing.handleTouchStart('invalid', invalidEvent);
      }).not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Invalid touch event received:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should recover from debouncing errors', () => {
      const faultyCallback = jest.fn(() => {
        throw new Error('Callback error');
      });

      const debouncedCallback = touchDebouncing.debounce(faultyCallback, 100);

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      debouncedCallback();
      jest.advanceTimersByTime(100);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in debounced callback:',
        expect.any(Error)
      );

      // Should still be able to process subsequent events
      const goodCallback = jest.fn();
      const goodDebouncedCallback = touchDebouncing.debounce(goodCallback, 100);
      
      goodDebouncedCallback();
      jest.advanceTimersByTime(100);
      
      expect(goodCallback).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle memory pressure gracefully', () => {
      // Mock high memory usage
      Object.defineProperty(performance, 'memory', {
        value: {
          usedJSHeapSize: 90 * 1024 * 1024,
          totalJSHeapSize: 100 * 1024 * 1024,
        },
        writable: true,
      });

      const cleanupSpy = jest.spyOn(touchDebouncing, 'cleanup');

      // Process many touch events
      for (let i = 0; i < 1000; i++) {
        const touchEvent = createMockTouchEvent('touchstart', [
          { clientX: i, clientY: i, identifier: i }
        ]);
        touchDebouncing.handleTouchStart('memory-test', touchEvent);
      }

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Configuration and Settings', () => {
    it('should allow configuration of debounce times', () => {
      touchDebouncing.setDebounceTime(200);
      expect(touchDebouncing.getDebounceTime()).toBe(200);

      const callback = jest.fn();
      const debouncedCallback = touchDebouncing.debounce(callback);

      debouncedCallback();
      jest.advanceTimersByTime(150);
      expect(callback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(50);
      expect(callback).toHaveBeenCalled();
    });

    it('should allow enabling/disabling ghost touch protection', () => {
      touchDebouncing.setGhostTouchProtection(false);
      
      const touchEvent1 = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);
      const touchEvent2 = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 1 }
      ]);

      expect(touchDebouncing.isGhostTouch(touchEvent1)).toBe(false);
      expect(touchDebouncing.isGhostTouch(touchEvent2)).toBe(false);

      touchDebouncing.setGhostTouchProtection(true);
      
      expect(touchDebouncing.isGhostTouch(touchEvent1)).toBe(false);
      mockPerformance.now.mockReturnValue(Date.now() + 5);
      expect(touchDebouncing.isGhostTouch(touchEvent2)).toBe(true);
    });

    it('should save and restore configuration', () => {
      const config = {
        debounceTime: 250,
        ghostTouchProtection: false,
        hapticEnabled: false,
        adaptiveBehavior: true,
        sensitivity: 0.7,
      };

      touchDebouncing.setConfiguration(config);
      
      const savedConfig = touchDebouncing.getConfiguration();
      expect(savedConfig).toEqual(config);

      // Test persistence
      const newInstance = TouchDebouncing.getInstance();
      const restoredConfig = newInstance.getConfiguration();
      expect(restoredConfig).toEqual(config);
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end in real-world scenario', () => {
      // Set up multiple touch targets
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      
      touchDebouncing.setTouchTarget('submit', {
        element: button1,
        minSize: 48,
        debounceTime: 100,
        priority: 'high',
        ghostTouchProtection: true,
        hapticFeedback: true,
      });

      touchDebouncing.setTouchTarget('cancel', {
        element: button2,
        minSize: 48,
        debounceTime: 200,
        priority: 'medium',
        ghostTouchProtection: true,
        hapticFeedback: false,
      });

      const submitCallback = jest.fn();
      const cancelCallback = jest.fn();

      const debouncedSubmit = touchDebouncing.debounce(submitCallback, 100);
      const debouncedCancel = touchDebouncing.debounce(cancelCallback, 200);

      // Simulate user interactions
      const submitTouch = createMockTouchEvent('touchstart', [
        { clientX: 100, clientY: 100, identifier: 0 }
      ]);

      const cancelTouch = createMockTouchEvent('touchstart', [
        { clientX: 200, clientY: 100, identifier: 1 }
      ]);

      // Rapid touches on submit button (should be debounced)
      touchDebouncing.handleTouchStart('submit', submitTouch, debouncedSubmit);
      touchDebouncing.handleTouchStart('submit', submitTouch, debouncedSubmit);
      touchDebouncing.handleTouchStart('submit', submitTouch, debouncedSubmit);

      // Touch on cancel button
      touchDebouncing.handleTouchStart('cancel', cancelTouch, debouncedCancel);

      // Advance timers
      jest.advanceTimersByTime(100);
      expect(submitCallback).toHaveBeenCalledTimes(1);
      expect(cancelCallback).not.toHaveBeenCalled(); // 200ms debounce

      jest.advanceTimersByTime(100);
      expect(cancelCallback).toHaveBeenCalledTimes(1);

      // Verify haptic feedback
      expect(window.navigator.vibrate).toHaveBeenCalledWith(10); // Submit button only

      // Check performance metrics
      const metrics = touchDebouncing.getPerformanceMetrics();
      expect(metrics.totalTouches).toBe(4);
      expect(metrics.debouncedTouches).toBe(2);
    });
  });
});