'use client';

interface TouchEventValidation {
  isValid: boolean;
  riskLevel: 'low' | 'medium' | 'high';
  warnings: string[];
  sanitizedEvent?: TouchEvent;
}

interface TouchSecurityMetrics {
  suspiciousPatterns: number;
  rapidFireEvents: number;
  impossibleMovements: number;
  syntheticEvents: number;
  totalEvents: number;
  lastEventTime: number;
}

class TouchEventValidator {
  private securityMetrics: TouchSecurityMetrics = {
    suspiciousPatterns: 0,
    rapidFireEvents: 0,
    impossibleMovements: 0,
    syntheticEvents: 0,
    totalEvents: 0,
    lastEventTime: 0,
  };

  private readonly maxEventsPerSecond = 120; // Reasonable human touch limit
  private readonly maxTouchVelocity = 5000; // pixels per second
  private readonly minTouchInterval = 8; // milliseconds
  private readonly maxSimultaneousTouches = 10; // Most devices support max 10 touches

  private touchHistory: Array<{
    timestamp: number;
    x: number;
    y: number;
    type: string;
    identifier: number;
  }> = [];

  private readonly maxHistorySize = 100;

  // Validate touch event for security and authenticity
  public validateTouchEvent(
    event: TouchEvent,
    elementId?: string,
  ): TouchEventValidation {
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // Update metrics
      this.securityMetrics.totalEvents++;
      const now = Date.now();

      // Check for rapid-fire events (potential bot activity)
      if (this.securityMetrics.lastEventTime > 0) {
        const timeDiff = now - this.securityMetrics.lastEventTime;
        if (timeDiff < this.minTouchInterval) {
          this.securityMetrics.rapidFireEvents++;
          warnings.push('Rapid touch events detected');
          riskLevel = 'medium';
        }
      }

      // Check event rate (events per second)
      const recentEvents = this.touchHistory.filter(
        (touch) => now - touch.timestamp < 1000,
      ).length;

      if (recentEvents > this.maxEventsPerSecond) {
        this.securityMetrics.rapidFireEvents++;
        warnings.push('Touch event rate exceeds human capabilities');
        riskLevel = 'high';
      }

      // Validate number of simultaneous touches
      if (event.touches.length > this.maxSimultaneousTouches) {
        warnings.push('Excessive number of simultaneous touches');
        riskLevel = 'high';
      }

      // Check for synthetic event indicators
      if (this.isSyntheticEvent(event)) {
        this.securityMetrics.syntheticEvents++;
        warnings.push('Potentially synthetic touch event detected');
        riskLevel = 'medium';
      }

      // Validate touch movements for physical plausibility
      const movementValidation = this.validateTouchMovement(event);
      if (!movementValidation.isValid) {
        this.securityMetrics.impossibleMovements++;
        warnings.push(...movementValidation.warnings);
        riskLevel =
          Math.max(
            riskLevel === 'low' ? 0 : riskLevel === 'medium' ? 1 : 2,
            movementValidation.riskLevel === 'low'
              ? 0
              : movementValidation.riskLevel === 'medium'
                ? 1
                : 2,
          ) === 0
            ? 'low'
            : Math.max(
                  riskLevel === 'low' ? 0 : riskLevel === 'medium' ? 1 : 2,
                  movementValidation.riskLevel === 'low'
                    ? 0
                    : movementValidation.riskLevel === 'medium'
                      ? 1
                      : 2,
                ) === 1
              ? 'medium'
              : 'high';
      }

      // Check for suspicious patterns
      if (this.detectSuspiciousPatterns()) {
        this.securityMetrics.suspiciousPatterns++;
        warnings.push('Suspicious touch pattern detected');
        riskLevel = 'medium';
      }

      // Record touch data for analysis
      this.recordTouchData(event);

      // Update last event time
      this.securityMetrics.lastEventTime = now;

      // Sanitize event if needed
      const sanitizedEvent = this.sanitizeTouchEvent(event);

      return {
        isValid: riskLevel !== 'high',
        riskLevel,
        warnings,
        sanitizedEvent: riskLevel !== 'high' ? sanitizedEvent : undefined,
      };
    } catch (error) {
      console.error('Touch validation error:', error);
      return {
        isValid: false,
        riskLevel: 'high',
        warnings: ['Touch validation failed'],
      };
    }
  }

  private isSyntheticEvent(event: TouchEvent): boolean {
    // Check for indicators that suggest the event was generated programmatically

    // Real touch events should have proper touch objects
    if (!event.touches || event.touches.length === 0) {
      return true;
    }

    for (const touch of Array.from(event.touches)) {
      // Check for missing properties that real touch events should have
      if (
        touch.identifier === undefined ||
        touch.clientX === undefined ||
        touch.clientY === undefined ||
        touch.pageX === undefined ||
        touch.pageY === undefined
      ) {
        return true;
      }

      // Check for perfect coordinate values (suspicious)
      if (
        touch.clientX % 1 === 0 &&
        touch.clientY % 1 === 0 &&
        touch.pageX % 1 === 0 &&
        touch.pageY % 1 === 0
      ) {
        // Real touches often have fractional pixel coordinates
        return true;
      }

      // Check for impossible coordinate values
      if (
        touch.clientX < 0 ||
        touch.clientY < 0 ||
        touch.clientX > window.innerWidth ||
        touch.clientY > window.innerHeight
      ) {
        return true;
      }

      // Check for zero pressure values (some synthetic events have this)
      if ('force' in touch && touch.force === 0) {
        return true;
      }
    }

    // Check event timing - synthetic events often have perfect timing
    if (event.timeStamp && event.timeStamp % 10 === 0) {
      return true; // Suspicious round timestamp
    }

    return false;
  }

  private validateTouchMovement(event: TouchEvent): {
    isValid: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    warnings: string[];
  } {
    const warnings: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (this.touchHistory.length === 0) {
      return { isValid: true, riskLevel, warnings };
    }

    const now = Date.now();

    for (const touch of Array.from(event.touches)) {
      // Find previous position of this touch
      const prevTouch = this.touchHistory
        .filter((h) => h.identifier === touch.identifier)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (!prevTouch) continue;

      const timeDiff = now - prevTouch.timestamp;
      if (timeDiff <= 0) continue;

      const distance = Math.sqrt(
        Math.pow(touch.clientX - prevTouch.x, 2) +
          Math.pow(touch.clientY - prevTouch.y, 2),
      );

      const velocity = distance / (timeDiff / 1000); // pixels per second

      // Check for impossibly fast movements
      if (velocity > this.maxTouchVelocity) {
        warnings.push(
          `Impossible touch velocity: ${Math.round(velocity)} px/s`,
        );
        riskLevel = 'high';
      }

      // Check for teleportation (instant large movements)
      if (distance > 500 && timeDiff < 50) {
        // >500px in <50ms
        warnings.push('Touch teleportation detected');
        riskLevel = 'high';
      }

      // Check for perfect straight lines (suspicious for human touch)
      if (this.isPerfectLine(touch, prevTouch) && distance > 100) {
        warnings.push('Unnaturally straight touch movement');
        riskLevel = 'medium';
      }
    }

    return {
      isValid: riskLevel !== 'high',
      riskLevel,
      warnings,
    };
  }

  private isPerfectLine(
    touch1: Touch,
    touch2: { x: number; y: number },
  ): boolean {
    const deltaX = Math.abs(touch1.clientX - touch2.x);
    const deltaY = Math.abs(touch1.clientY - touch2.y);

    // Check for perfect horizontal or vertical lines
    return deltaX === 0 || deltaY === 0 || Math.abs(deltaX - deltaY) < 1; // Perfect diagonal
  }

  private detectSuspiciousPatterns(): boolean {
    if (this.touchHistory.length < 10) return false;

    const recentTouches = this.touchHistory.slice(-10);

    // Check for repetitive patterns
    const positions = recentTouches.map(
      (t) => `${Math.round(t.x)},${Math.round(t.y)}`,
    );
    const uniquePositions = new Set(positions);

    // If all recent touches are in the same position (spam clicking)
    if (uniquePositions.size === 1) {
      return true;
    }

    // Check for geometric patterns (perfect circles, squares, etc.)
    if (this.isGeometricPattern(recentTouches)) {
      return true;
    }

    // Check for inhuman timing patterns
    const intervals = [];
    for (let i = 1; i < recentTouches.length; i++) {
      intervals.push(
        recentTouches[i].timestamp - recentTouches[i - 1].timestamp,
      );
    }

    // Check if all intervals are identical (robotic timing)
    if (
      intervals.length > 5 &&
      intervals.every((interval) => interval === intervals[0])
    ) {
      return true;
    }

    return false;
  }

  private isGeometricPattern(
    touches: Array<{ x: number; y: number }>,
  ): boolean {
    if (touches.length < 8) return false;

    // Check for circular pattern
    const centerX = touches.reduce((sum, t) => sum + t.x, 0) / touches.length;
    const centerY = touches.reduce((sum, t) => sum + t.y, 0) / touches.length;

    const distances = touches.map((t) =>
      Math.sqrt(Math.pow(t.x - centerX, 2) + Math.pow(t.y - centerY, 2)),
    );

    const avgDistance =
      distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const maxDeviation = Math.max(
      ...distances.map((d) => Math.abs(d - avgDistance)),
    );

    // If all points are nearly equidistant from center (perfect circle)
    if (maxDeviation < 5) {
      return true;
    }

    return false;
  }

  private recordTouchData(event: TouchEvent): void {
    const now = Date.now();

    for (const touch of Array.from(event.touches)) {
      this.touchHistory.push({
        timestamp: now,
        x: touch.clientX,
        y: touch.clientY,
        type: event.type,
        identifier: touch.identifier,
      });
    }

    // Limit history size for memory management
    if (this.touchHistory.length > this.maxHistorySize) {
      this.touchHistory = this.touchHistory.slice(-this.maxHistorySize);
    }
  }

  private sanitizeTouchEvent(event: TouchEvent): TouchEvent {
    // Create a sanitized copy of the touch event
    // This would involve removing or correcting suspicious properties

    // For now, return the original event
    // In a real implementation, we might need to create a new event object
    return event;
  }

  // Server-side validation for touch event data
  public validateTouchData(touchData: any): boolean {
    try {
      // Validate structure
      if (!touchData || typeof touchData !== 'object') {
        return false;
      }

      // Required fields
      const requiredFields = ['timestamp', 'type', 'touches'];
      for (const field of requiredFields) {
        if (!(field in touchData)) {
          return false;
        }
      }

      // Validate timestamp
      const timestamp = touchData.timestamp;
      const now = Date.now();
      if (timestamp < now - 5000 || timestamp > now + 1000) {
        // 5s past, 1s future tolerance
        return false;
      }

      // Validate touches array
      if (!Array.isArray(touchData.touches)) {
        return false;
      }

      // Validate each touch
      for (const touch of touchData.touches) {
        if (!this.validateSingleTouchData(touch)) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Touch data validation error:', error);
      return false;
    }
  }

  private validateSingleTouchData(touch: any): boolean {
    // Required touch properties
    const requiredProps = [
      'identifier',
      'clientX',
      'clientY',
      'pageX',
      'pageY',
    ];

    for (const prop of requiredProps) {
      if (!(prop in touch) || typeof touch[prop] !== 'number') {
        return false;
      }
    }

    // Validate coordinate ranges
    if (
      touch.clientX < 0 ||
      touch.clientY < 0 ||
      touch.pageX < 0 ||
      touch.pageY < 0
    ) {
      return false;
    }

    // Reasonable maximum screen size validation
    if (
      touch.clientX > 5000 ||
      touch.clientY > 5000 ||
      touch.pageX > 10000 ||
      touch.pageY > 10000
    ) {
      return false;
    }

    return true;
  }

  // Get security metrics for monitoring
  public getSecurityMetrics(): TouchSecurityMetrics {
    return { ...this.securityMetrics };
  }

  // Reset security metrics
  public resetMetrics(): void {
    this.securityMetrics = {
      suspiciousPatterns: 0,
      rapidFireEvents: 0,
      impossibleMovements: 0,
      syntheticEvents: 0,
      totalEvents: 0,
      lastEventTime: 0,
    };
    this.touchHistory = [];
  }

  // Get security recommendations based on detected patterns
  public getSecurityRecommendations(): string[] {
    const recommendations: string[] = [];
    const metrics = this.securityMetrics;

    if (metrics.totalEvents > 0) {
      const syntheticRate =
        (metrics.syntheticEvents / metrics.totalEvents) * 100;
      const rapidFireRate =
        (metrics.rapidFireEvents / metrics.totalEvents) * 100;

      if (syntheticRate > 10) {
        recommendations.push(
          'High rate of synthetic events detected - check for automated tools',
        );
      }

      if (rapidFireRate > 20) {
        recommendations.push(
          'Excessive rapid-fire events - possible bot activity',
        );
      }

      if (metrics.impossibleMovements > 5) {
        recommendations.push(
          'Multiple impossible movements detected - verify user authenticity',
        );
      }

      if (metrics.suspiciousPatterns > 3) {
        recommendations.push(
          'Suspicious touch patterns detected - monitor user activity',
        );
      }
    }

    // General security recommendations
    recommendations.push('Monitor touch validation metrics regularly');
    recommendations.push(
      'Implement additional bot detection if suspicious activity increases',
    );
    recommendations.push('Log security events for analysis');

    return recommendations;
  }
}

// Singleton instance for touch validation
const touchValidator = new TouchEventValidator();

// Main validation function
export const validateTouchEvent = (
  event: TouchEvent,
  elementId?: string,
): TouchEventValidation => {
  return touchValidator.validateTouchEvent(event, elementId);
};

// Server-side validation function
export const validateTouchDataServer = (touchData: any): boolean => {
  return touchValidator.validateTouchData(touchData);
};

export { touchValidator, TouchEventValidator };
export type { TouchEventValidation, TouchSecurityMetrics };

export default validateTouchEvent;
