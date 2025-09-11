/**
 * Performance monitoring utilities for WedSync
 */

export function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      console.log(`⚡ ${name} took ${duration.toFixed(2)}ms`);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number,
): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number,
): T {
  let inThrottle: boolean;
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  }) as T;
}
