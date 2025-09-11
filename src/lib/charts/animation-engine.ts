'use client';

interface AnimationConfig {
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier';
  delay?: number;
  iterations?: number;
  direction?: 'normal' | 'reverse' | 'alternate';
  fillMode?: 'none' | 'forwards' | 'backwards' | 'both';
}

interface ChartAnimationSettings {
  enabled: boolean;
  performance: 'low' | 'medium' | 'high';
  deviceOptimized: boolean;
  frameRate: number;
  reduceMotion: boolean;
}

interface AnimationSequence {
  id: string;
  steps: AnimationStep[];
  onComplete?: () => void;
  onStart?: () => void;
  onProgress?: (progress: number) => void;
}

interface AnimationStep {
  element: string;
  property: string;
  from: number | string;
  to: number | string;
  config: AnimationConfig;
}

class ChartAnimationEngine {
  private activeAnimations = new Map<string, Animation>();
  private animationQueue: AnimationSequence[] = [];
  private settings: ChartAnimationSettings;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.settings = this.detectOptimalSettings();
    this.performanceMonitor = new PerformanceMonitor();

    // Listen for reduced motion preference changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      mediaQuery.addEventListener('change', (e) => {
        this.settings.reduceMotion = e.matches;
      });
    }
  }

  private detectOptimalSettings(): ChartAnimationSettings {
    if (typeof window === 'undefined') {
      return {
        enabled: true,
        performance: 'medium',
        deviceOptimized: true,
        frameRate: 60,
        reduceMotion: false,
      };
    }

    // Detect device capabilities
    const deviceType = this.getDeviceType();
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    // Performance detection based on device and hardware
    const performance = this.detectPerformanceLevel();

    return {
      enabled: !prefersReducedMotion,
      performance,
      deviceOptimized: true,
      frameRate: deviceType === 'mobile' ? 30 : 60,
      reduceMotion: prefersReducedMotion,
    };
  }

  private getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
    if (typeof window === 'undefined') return 'desktop';

    const width = window.innerWidth;
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }

  private detectPerformanceLevel(): 'low' | 'medium' | 'high' {
    if (typeof window === 'undefined') return 'medium';

    // Check for hardware concurrency (CPU cores)
    const cores = navigator.hardwareConcurrency || 4;

    // Check for memory (if available)
    const memory = (navigator as any).deviceMemory || 4;

    // Check connection speed
    const connection = (navigator as any).connection;
    const effectiveType = connection?.effectiveType || '4g';

    // Score-based performance detection
    let score = 0;

    // CPU score
    if (cores >= 8) score += 3;
    else if (cores >= 4) score += 2;
    else score += 1;

    // Memory score
    if (memory >= 8) score += 3;
    else if (memory >= 4) score += 2;
    else score += 1;

    // Connection score
    if (effectiveType === '4g') score += 2;
    else if (effectiveType === '3g') score += 1;

    // Device type penalty
    const deviceType = this.getDeviceType();
    if (deviceType === 'mobile') score -= 1;

    if (score >= 7) return 'high';
    if (score >= 4) return 'medium';
    return 'low';
  }

  private getOptimizedConfig(baseConfig: AnimationConfig): AnimationConfig {
    const deviceType = this.getDeviceType();
    const performance = this.settings.performance;

    let optimizedConfig = { ...baseConfig };

    // Adjust duration based on performance and device
    if (performance === 'low' || deviceType === 'mobile') {
      optimizedConfig.duration = Math.min(baseConfig.duration, 300);
    } else if (performance === 'medium') {
      optimizedConfig.duration = Math.min(baseConfig.duration, 500);
    }

    // Simplify easing for better performance
    if (performance === 'low') {
      if (baseConfig.easing === 'cubic-bezier') {
        optimizedConfig.easing = 'ease-out';
      }
    }

    // Reduce motion if requested
    if (this.settings.reduceMotion) {
      optimizedConfig.duration = Math.min(optimizedConfig.duration, 150);
      optimizedConfig.easing = 'linear';
    }

    return optimizedConfig;
  }

  public createDataEntryAnimation(
    chartType: 'line' | 'bar' | 'area' | 'pie',
    dataPoints: number,
  ): AnimationSequence {
    const deviceType = this.getDeviceType();
    const baseDelay = deviceType === 'mobile' ? 50 : 30;
    const maxDelay = deviceType === 'mobile' ? 1000 : 2000;

    // Limit animation points for performance
    const maxAnimatedPoints = {
      mobile: 50,
      tablet: 100,
      desktop: 200,
    }[deviceType];

    const animatedPoints = Math.min(dataPoints, maxAnimatedPoints);
    const step =
      dataPoints > animatedPoints ? Math.ceil(dataPoints / animatedPoints) : 1;

    const steps: AnimationStep[] = [];

    if (chartType === 'bar') {
      // Animate bars growing from bottom
      for (let i = 0; i < animatedPoints; i++) {
        steps.push({
          element: `.bar-${i * step}`,
          property: 'scaleY',
          from: 0,
          to: 1,
          config: this.getOptimizedConfig({
            duration: 400,
            easing: 'ease-out',
            delay: Math.min(i * baseDelay, maxDelay),
          }),
        });
      }
    } else if (chartType === 'line' || chartType === 'area') {
      // Animate path drawing
      steps.push({
        element: '.recharts-line-curve, .recharts-area-curve',
        property: 'strokeDasharray',
        from: '0,1000',
        to: '1000,0',
        config: this.getOptimizedConfig({
          duration: 1500,
          easing: 'ease-in-out',
        }),
      });

      // Animate dots appearance
      for (let i = 0; i < animatedPoints; i++) {
        steps.push({
          element: `.recharts-line-dot:nth-child(${i * step + 1})`,
          property: 'opacity',
          from: 0,
          to: 1,
          config: this.getOptimizedConfig({
            duration: 200,
            easing: 'ease-out',
            delay: 500 + Math.min(i * (baseDelay / 2), maxDelay / 2),
          }),
        });
      }
    } else if (chartType === 'pie') {
      // Animate pie segments
      steps.push({
        element: '.recharts-pie',
        property: 'transform',
        from: 'scale(0)',
        to: 'scale(1)',
        config: this.getOptimizedConfig({
          duration: 800,
          easing: 'ease-out',
        }),
      });
    }

    return {
      id: `data-entry-${chartType}-${Date.now()}`,
      steps,
      onComplete: () => {
        this.performanceMonitor.recordAnimation('data-entry', steps.length);
      },
    };
  }

  public createInteractionAnimation(
    interactionType: 'hover' | 'click' | 'zoom' | 'pan',
    element: string,
  ): AnimationSequence {
    const steps: AnimationStep[] = [];

    switch (interactionType) {
      case 'hover':
        steps.push({
          element,
          property: 'transform',
          from: 'scale(1)',
          to: 'scale(1.05)',
          config: this.getOptimizedConfig({
            duration: 150,
            easing: 'ease-out',
          }),
        });
        break;

      case 'click':
        steps.push({
          element,
          property: 'transform',
          from: 'scale(1)',
          to: 'scale(0.95)',
          config: this.getOptimizedConfig({
            duration: 100,
            easing: 'ease-in',
            direction: 'alternate',
            iterations: 2,
          }),
        });
        break;

      case 'zoom':
        steps.push({
          element,
          property: 'transform',
          from: 'scale(1)',
          to: 'scale(1.1)',
          config: this.getOptimizedConfig({
            duration: 300,
            easing: 'ease-in-out',
          }),
        });
        break;

      case 'pan':
        steps.push({
          element,
          property: 'transform',
          from: 'translateX(0)',
          to: 'translateX(10px)',
          config: this.getOptimizedConfig({
            duration: 200,
            easing: 'ease-out',
            direction: 'alternate',
            iterations: 2,
          }),
        });
        break;
    }

    return {
      id: `interaction-${interactionType}-${Date.now()}`,
      steps,
    };
  }

  public createLoadingAnimation(containerElement: string): AnimationSequence {
    const steps: AnimationStep[] = [];

    // Shimmer effect for loading
    steps.push({
      element: `${containerElement} .loading-shimmer`,
      property: 'transform',
      from: 'translateX(-100%)',
      to: 'translateX(100%)',
      config: this.getOptimizedConfig({
        duration: 1500,
        easing: 'linear',
        iterations: Infinity,
      }),
    });

    // Pulse effect for chart skeleton
    steps.push({
      element: `${containerElement} .chart-skeleton`,
      property: 'opacity',
      from: 0.4,
      to: 1,
      config: this.getOptimizedConfig({
        duration: 1000,
        easing: 'ease-in-out',
        direction: 'alternate',
        iterations: Infinity,
      }),
    });

    return {
      id: `loading-${Date.now()}`,
      steps,
    };
  }

  public async playAnimation(sequence: AnimationSequence): Promise<void> {
    if (!this.settings.enabled || this.settings.reduceMotion) {
      // Skip animations but still call callbacks
      sequence.onStart?.();
      sequence.onProgress?.(1);
      sequence.onComplete?.();
      return;
    }

    const animationPromises: Promise<void>[] = [];
    sequence.onStart?.();

    for (const step of sequence.steps) {
      const elements = document.querySelectorAll(step.element);

      for (const element of elements) {
        const animation = this.createCSSAnimation(element as HTMLElement, step);
        this.activeAnimations.set(`${sequence.id}-${step.element}`, animation);

        const promise = new Promise<void>((resolve) => {
          animation.addEventListener('finish', () => {
            resolve();
            this.activeAnimations.delete(`${sequence.id}-${step.element}`);
          });

          animation.addEventListener('cancel', () => {
            resolve();
            this.activeAnimations.delete(`${sequence.id}-${step.element}`);
          });
        });

        animationPromises.push(promise);
      }
    }

    // Track progress
    let completedAnimations = 0;
    const totalAnimations = animationPromises.length;

    animationPromises.forEach((promise) => {
      promise.then(() => {
        completedAnimations++;
        const progress = completedAnimations / totalAnimations;
        sequence.onProgress?.(progress);
      });
    });

    // Wait for all animations to complete
    await Promise.all(animationPromises);
    sequence.onComplete?.();
  }

  private createCSSAnimation(
    element: HTMLElement,
    step: AnimationStep,
  ): Animation {
    const keyframes: Keyframe[] = [];

    // Create keyframes based on property and values
    if (typeof step.from === 'string' && typeof step.to === 'string') {
      keyframes.push({ [step.property]: step.from });
      keyframes.push({ [step.property]: step.to });
    } else {
      keyframes.push({ [step.property]: step.from.toString() });
      keyframes.push({ [step.property]: step.to.toString() });
    }

    const animationOptions: KeyframeAnimationOptions = {
      duration: step.config.duration,
      easing: this.getEasingFunction(step.config.easing),
      delay: step.config.delay || 0,
      iterations: step.config.iterations || 1,
      direction: step.config.direction || 'normal',
      fill: step.config.fillMode || 'forwards',
    };

    const animation = element.animate(keyframes, animationOptions);
    animation.play();

    return animation;
  }

  private getEasingFunction(easing: string): string {
    const easingMap = {
      linear: 'linear',
      'ease-in': 'cubic-bezier(0.4, 0, 1, 1)',
      'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
      'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      'cubic-bezier': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    };

    return easingMap[easing as keyof typeof easingMap] || 'ease';
  }

  public cancelAnimation(animationId: string): void {
    for (const [key, animation] of this.activeAnimations.entries()) {
      if (key.startsWith(animationId)) {
        animation.cancel();
        this.activeAnimations.delete(key);
      }
    }
  }

  public cancelAllAnimations(): void {
    for (const animation of this.activeAnimations.values()) {
      animation.cancel();
    }
    this.activeAnimations.clear();
  }

  public updateSettings(newSettings: Partial<ChartAnimationSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): ChartAnimationSettings {
    return { ...this.settings };
  }

  public getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }
}

class PerformanceMonitor {
  private animationMetrics: Array<{
    type: string;
    elementCount: number;
    duration: number;
    timestamp: number;
  }> = [];

  public recordAnimation(type: string, elementCount: number): void {
    this.animationMetrics.push({
      type,
      elementCount,
      duration: performance.now(),
      timestamp: Date.now(),
    });

    // Keep only last 100 metrics
    if (this.animationMetrics.length > 100) {
      this.animationMetrics = this.animationMetrics.slice(-100);
    }
  }

  public getAverageAnimationTime(type?: string): number {
    let metrics = this.animationMetrics;
    if (type) {
      metrics = metrics.filter((m) => m.type === type);
    }

    if (metrics.length === 0) return 0;

    const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
    return totalDuration / metrics.length;
  }

  public getMetrics(): any[] {
    return [...this.animationMetrics];
  }
}

// Global animation engine
const chartAnimationEngine = new ChartAnimationEngine();

// React hook for animations
export const useChartAnimations = () => {
  const createDataEntryAnimation = (
    chartType: 'line' | 'bar' | 'area' | 'pie',
    dataPoints: number,
  ) => chartAnimationEngine.createDataEntryAnimation(chartType, dataPoints);

  const createInteractionAnimation = (
    interactionType: 'hover' | 'click' | 'zoom' | 'pan',
    element: string,
  ) =>
    chartAnimationEngine.createInteractionAnimation(interactionType, element);

  const createLoadingAnimation = (containerElement: string) =>
    chartAnimationEngine.createLoadingAnimation(containerElement);

  const playAnimation = (sequence: AnimationSequence) =>
    chartAnimationEngine.playAnimation(sequence);

  const cancelAnimation = (animationId: string) =>
    chartAnimationEngine.cancelAnimation(animationId);

  const updateSettings = (settings: Partial<ChartAnimationSettings>) =>
    chartAnimationEngine.updateSettings(settings);

  return {
    createDataEntryAnimation,
    createInteractionAnimation,
    createLoadingAnimation,
    playAnimation,
    cancelAnimation,
    updateSettings,
    settings: chartAnimationEngine.getSettings(),
    activeAnimations: chartAnimationEngine.getActiveAnimationCount(),
  };
};

export { ChartAnimationEngine, chartAnimationEngine };
export type {
  AnimationConfig,
  ChartAnimationSettings,
  AnimationSequence,
  AnimationStep,
};
