/**
 * Debounce utility for performance optimization
 * Delays function execution until after delay milliseconds have passed
 */

export function debounce<Args extends any[]>(
  func: (...args: Args) => any,
  delay: number,
) {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: Args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
}

export function debounceAsync<Args extends any[]>(
  func: (...args: Args) => Promise<any>,
  delay: number,
) {
  let timeoutId: NodeJS.Timeout | null = null;
  let latestResolve: ((value: any) => void) | null = null;
  let latestReject: ((error: any) => void) | null = null;

  return function (...args: Args): Promise<any> {
    return new Promise((resolve, reject) => {
      // Cancel previous timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
        if (latestResolve) {
          latestReject?.(new Error('Debounced call cancelled'));
        }
      }

      latestResolve = resolve;
      latestReject = reject;

      timeoutId = setTimeout(async () => {
        try {
          const result = await func(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  };
}
