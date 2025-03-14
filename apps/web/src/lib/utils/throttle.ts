/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds
 * @param func The function to throttle
 * @param wait The number of milliseconds to throttle invocations to
 * @returns A new, throttled function
 */
export function throttle<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function throttled(...args: Parameters<T>) {
    const now = Date.now();
    const remaining = wait - (now - lastCall);

    // Store the latest args
    lastArgs = args;

    // If enough time has passed, execute immediately
    if (remaining <= 0) {
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
      lastCall = now;
      func(...args);
    } else if (!timeout) {
      // Otherwise set a timeout to execute at the end of the wait period
      timeout = setTimeout(() => {
        lastCall = Date.now();
        timeout = null;
        if (lastArgs) {
          func(...lastArgs);
        }
      }, remaining);
    }
  };
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds have elapsed
 * since the last time the debounced function was invoked.
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A new, debounced function
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function debounced(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}
