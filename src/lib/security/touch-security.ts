'use client';

// Enhanced Touch Security Validation per WS-138 Requirements
// Extends the existing security in useTouch.ts with additional patterns

interface TouchEventSecurity {
  isValid: boolean;
  reason?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  sanitized?: any;
}

interface TouchSecurityConfig {
  maxTouchPoints: number;
  maxVelocity: number;
  maxDistance: number;
  rateLimitWindow: number;
  rateLimitMaxCalls: number;
  enableGestureValidation: boolean;
  enableCoordinateValidation: boolean;
  enableTimingValidation: boolean;
}

const DEFAULT_SECURITY_CONFIG: TouchSecurityConfig = {
  maxTouchPoints: 10,
  maxVelocity: 5000, // pixels per second
  maxDistance: 2000, // pixels
  rateLimitWindow: 1000, // 1 second
  rateLimitMaxCalls: 100,
  enableGestureValidation: true,
  enableCoordinateValidation: true,
  enableTimingValidation: true,
};

class TouchSecurityValidator {
  private config: TouchSecurityConfig;
  private rateLimitMap: Map<string, number[]> = new Map();
  private suspiciousPatterns: Set<string> = new Set();
  private blacklistedIPs: Set<string> = new Set();

  constructor(config: Partial<TouchSecurityConfig> = {}) {
    this.config = { ...DEFAULT_SECURITY_CONFIG, ...config };
  }

  // Main validation function following WS-138 security requirements
  validateTouchEvent(
    event: React.TouchEvent | TouchEvent,
    context: string = 'unknown',
  ): TouchEventSecurity {
    try {
      // 1. Basic Touch Event Validation
      const basicValidation = this.validateBasicTouchEvent(event);
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // 2. Multi-touch Attack Prevention
      const multiTouchValidation = this.validateMultiTouchAttack(event);
      if (!multiTouchValidation.isValid) {
        return multiTouchValidation;
      }

      // 3. Rate Limiting Protection
      const rateLimitValidation = this.validateRateLimit(context);
      if (!rateLimitValidation.isValid) {
        return rateLimitValidation;
      }

      // 4. Coordinate Validation (prevent coordinate manipulation)
      if (this.config.enableCoordinateValidation) {
        const coordValidation = this.validateCoordinates(event);
        if (!coordValidation.isValid) {
          return coordValidation;
        }
      }

      // 5. Gesture Pattern Validation
      if (this.config.enableGestureValidation) {
        const gestureValidation = this.validateGesturePattern(event);
        if (!gestureValidation.isValid) {
          return gestureValidation;
        }
      }

      // 6. Timing Attack Prevention
      if (this.config.enableTimingValidation) {
        const timingValidation = this.validateTiming(event);
        if (!timingValidation.isValid) {
          return timingValidation;
        }
      }

      return {
        isValid: true,
        riskLevel: 'low',
        sanitized: this.sanitizeTouchEvent(event),
      };
    } catch (error) {
      console.error('Touch security validation error:', error);
      return {
        isValid: false,
        reason: 'Security validation failed',
        riskLevel: 'critical',
      };
    }
  }

  private validateBasicTouchEvent(
    event: React.TouchEvent | TouchEvent,
  ): TouchEventSecurity {
    // Null/undefined checks
    if (!event || !event.touches) {
      return {
        isValid: false,
        reason: 'Invalid touch event structure',
        riskLevel: 'high',
      };
    }

    // Validate touch points exist
    if (event.touches.length === 0) {
      return {
        isValid: false,
        reason: 'No touch points found',
        riskLevel: 'medium',
      };
    }

    // Validate each touch point has required properties
    for (let i = 0; i < event.touches.length; i++) {
      const touch = event.touches[i];
      if (
        !touch ||
        typeof touch.clientX !== 'number' ||
        typeof touch.clientY !== 'number'
      ) {
        return {
          isValid: false,
          reason: `Invalid touch point ${i}`,
          riskLevel: 'high',
        };
      }
    }

    return { isValid: true, riskLevel: 'low' };
  }

  private validateMultiTouchAttack(
    event: React.TouchEvent | TouchEvent,
  ): TouchEventSecurity {
    // Prevent touch jacking with excessive touch points
    if (event.touches.length > this.config.maxTouchPoints) {
      this.logSecurityEvent('Excessive touch points detected', {
        count: event.touches.length,
        max: this.config.maxTouchPoints,
      });

      return {
        isValid: false,
        reason: 'Too many simultaneous touch points',
        riskLevel: 'critical',
      };
    }

    // Detect suspicious multi-touch patterns
    if (event.touches.length > 1) {
      const simultaneousTouches = Array.from(event.touches);

      // Check for identical coordinates (likely spoofed)
      const uniqueCoords = new Set(
        simultaneousTouches.map((touch) => `${touch.clientX},${touch.clientY}`),
      );

      if (uniqueCoords.size < simultaneousTouches.length) {
        return {
          isValid: false,
          reason: 'Duplicate touch coordinates detected',
          riskLevel: 'high',
        };
      }

      // Check for perfectly aligned touches (suspicious)
      const aligned = this.checkTouchAlignment(simultaneousTouches);
      if (aligned) {
        return {
          isValid: false,
          reason: 'Suspicious touch alignment pattern',
          riskLevel: 'medium',
        };
      }
    }

    return { isValid: true, riskLevel: 'low' };
  }

  private validateRateLimit(context: string): TouchEventSecurity {
    const now = Date.now();
    const windowStart = now - this.config.rateLimitWindow;

    // Get or create rate limit tracker for this context
    if (!this.rateLimitMap.has(context)) {
      this.rateLimitMap.set(context, []);
    }

    const timestamps = this.rateLimitMap.get(context)!;

    // Remove old timestamps
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift();
    }

    // Check if rate limit exceeded
    if (timestamps.length >= this.config.rateLimitMaxCalls) {
      this.logSecurityEvent('Rate limit exceeded', {
        context,
        count: timestamps.length,
        limit: this.config.rateLimitMaxCalls,
      });

      return {
        isValid: false,
        reason: 'Rate limit exceeded',
        riskLevel: 'high',
      };
    }

    // Add current timestamp
    timestamps.push(now);

    return { isValid: true, riskLevel: 'low' };
  }

  private validateCoordinates(
    event: React.TouchEvent | TouchEvent,
  ): TouchEventSecurity {
    for (const touch of Array.from(event.touches)) {
      // Check for coordinates outside reasonable bounds
      if (
        Math.abs(touch.clientX) > this.config.maxDistance ||
        Math.abs(touch.clientY) > this.config.maxDistance
      ) {
        return {
          isValid: false,
          reason: 'Coordinates outside acceptable bounds',
          riskLevel: 'high',
        };
      }

      // Check for NaN or infinite coordinates
      if (
        !isFinite(touch.clientX) ||
        !isFinite(touch.clientY) ||
        isNaN(touch.clientX) ||
        isNaN(touch.clientY)
      ) {
        return {
          isValid: false,
          reason: 'Invalid coordinate values',
          riskLevel: 'critical',
        };
      }

      // Check for negative coordinates (unusual but not always invalid)
      if (touch.clientX < 0 || touch.clientY < 0) {
        // Log but don't block (mobile browsers sometimes report negative values)
        this.logSecurityEvent('Negative coordinates detected', {
          x: touch.clientX,
          y: touch.clientY,
        });
      }
    }

    return { isValid: true, riskLevel: 'low' };
  }

  private validateGesturePattern(
    event: React.TouchEvent | TouchEvent,
  ): TouchEventSecurity {
    // This would typically validate against known malicious gesture patterns
    // For now, we implement basic validation

    const touches = Array.from(event.touches);

    // Detect suspicious rapid movement patterns
    for (const touch of touches) {
      const velocity = this.calculateTouchVelocity(touch);
      if (velocity > this.config.maxVelocity) {
        return {
          isValid: false,
          reason: 'Suspicious touch velocity detected',
          riskLevel: 'medium',
        };
      }
    }

    return { isValid: true, riskLevel: 'low' };
  }

  private validateTiming(
    event: React.TouchEvent | TouchEvent,
  ): TouchEventSecurity {
    const timestamp = event.timeStamp || Date.now();
    const now = performance.now();

    // Check for events with timestamps in the future
    if (timestamp > now + 1000) {
      // 1 second tolerance
      return {
        isValid: false,
        reason: 'Future timestamp detected',
        riskLevel: 'high',
      };
    }

    // Check for events with very old timestamps (potential replay attack)
    if (timestamp < now - 10000) {
      // 10 second tolerance
      return {
        isValid: false,
        reason: 'Stale timestamp detected',
        riskLevel: 'medium',
      };
    }

    return { isValid: true, riskLevel: 'low' };
  }

  private checkTouchAlignment(touches: Touch[]): boolean {
    if (touches.length < 2) return false;

    // Check for perfectly horizontal or vertical alignment
    const xCoords = touches.map((t) => t.clientX);
    const yCoords = touches.map((t) => t.clientY);

    const allSameX = xCoords.every((x) => x === xCoords[0]);
    const allSameY = yCoords.every((y) => y === yCoords[0]);

    return allSameX || allSameY;
  }

  private calculateTouchVelocity(touch: Touch): number {
    // This is a simplified calculation - in practice you'd track
    // previous positions to calculate actual velocity
    return Math.sqrt(
      touch.clientX * touch.clientX + touch.clientY * touch.clientY,
    );
  }

  private sanitizeTouchEvent(event: React.TouchEvent | TouchEvent): any {
    // Create sanitized version of touch event for logging
    return {
      type: event.type,
      touches: Array.from(event.touches).map((touch) => ({
        clientX: Math.round(touch.clientX),
        clientY: Math.round(touch.clientY),
        identifier: touch.identifier,
        // Don't include sensitive properties
      })),
      timestamp: event.timeStamp || Date.now(),
    };
  }

  private logSecurityEvent(event: string, details: any): void {
    // In production, this would send to security monitoring system
    console.warn(`[TouchSecurity] ${event}:`, details);

    // Track suspicious patterns
    const pattern = `${event}-${JSON.stringify(details)}`;
    this.suspiciousPatterns.add(pattern);
  }

  // Public methods for security management
  public getSecurityMetrics() {
    return {
      suspiciousPatterns: Array.from(this.suspiciousPatterns),
      rateLimitViolations: this.rateLimitMap.size,
      blacklistedIPs: Array.from(this.blacklistedIPs),
    };
  }

  public clearSecurityMetrics(): void {
    this.suspiciousPatterns.clear();
    this.rateLimitMap.clear();
  }

  public updateConfig(config: Partial<TouchSecurityConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

// Global security validator instance
let touchSecurityValidator: TouchSecurityValidator | null = null;

export function getTouchSecurityValidator(): TouchSecurityValidator {
  if (!touchSecurityValidator) {
    touchSecurityValidator = new TouchSecurityValidator();
  }
  return touchSecurityValidator;
}

// React hook for touch security
export function useTouchSecurity() {
  const validator = getTouchSecurityValidator();

  const validateTouch = (
    event: React.TouchEvent | TouchEvent,
    context?: string,
  ): TouchEventSecurity => {
    return validator.validateTouchEvent(event, context);
  };

  const createSecureHandler = <
    T extends (e: React.TouchEvent | TouchEvent) => void,
  >(
    handler: T,
    context: string = 'handler',
  ): T => {
    return ((event: React.TouchEvent | TouchEvent) => {
      const validation = validateTouch(event, context);

      if (!validation.isValid) {
        console.warn(`Touch security violation: ${validation.reason}`);
        return; // Block the event
      }

      handler(event);
    }) as T;
  };

  return {
    validateTouch,
    createSecureHandler,
    getMetrics: () => validator.getSecurityMetrics(),
    clearMetrics: () => validator.clearSecurityMetrics(),
  };
}

// High-level security wrapper for touch components
export function withTouchSecurity<
  P extends { onTouchStart?: any; onTouchMove?: any; onTouchEnd?: any },
>(Component: React.ComponentType<P>): React.ComponentType<P> {
  return function SecuredTouchComponent(props: P) {
    const { createSecureHandler } = useTouchSecurity();

    const secureProps = {
      ...props,
      onTouchStart: props.onTouchStart
        ? createSecureHandler(props.onTouchStart, 'touchstart')
        : undefined,
      onTouchMove: props.onTouchMove
        ? createSecureHandler(props.onTouchMove, 'touchmove')
        : undefined,
      onTouchEnd: props.onTouchEnd
        ? createSecureHandler(props.onTouchEnd, 'touchend')
        : undefined,
    };

    return React.createElement(Component, secureProps);
  };
}

export type { TouchEventSecurity, TouchSecurityConfig };
