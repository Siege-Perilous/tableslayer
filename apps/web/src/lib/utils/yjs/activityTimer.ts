import { browser } from '$app/environment';
import { devLog } from '../debug';

export interface ActivityTimer {
  /**
   * Resets the inactivity timer
   */
  reset(): void;

  /**
   * Destroys the timer and removes event listeners
   */
  destroy(): void;

  /**
   * Checks if the timer is currently active (not yet expired)
   */
  isActive(): boolean;

  /**
   * Manually trigger the timeout callback (for testing)
   */
  trigger(): void;
}

/**
 * Creates an activity timer that fires a callback after a period of inactivity.
 * Automatically resets on specified DOM events.
 *
 * @param timeoutMs - Milliseconds of inactivity before timeout fires
 * @param onTimeout - Callback to execute when timeout occurs
 * @param resetEvents - Array of event names that should reset the timer
 * @param target - Optional target element (defaults to window)
 * @returns ActivityTimer interface with reset(), destroy(), and isActive() methods
 *
 * @example
 * ```typescript
 * const timer = createActivityTimer(5000, () => {
 *   activeLayer = MapLayerType.None;
 * }, ['mousedown', 'touchstart', 'mousemove', 'touchmove']);
 *
 * // Later, clean up
 * timer.destroy();
 * ```
 */
export function createActivityTimer(
  timeoutMs: number,
  onTimeout: () => void,
  resetEvents: string[] = ['mousedown', 'touchstart', 'mousemove', 'touchmove'],
  target: EventTarget = browser ? window : ({} as EventTarget)
): ActivityTimer {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let isDestroyed = false;
  let hasExpired = false;

  const reset = () => {
    if (isDestroyed) {
      return;
    }

    hasExpired = false;

    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      if (!isDestroyed) {
        hasExpired = true;
        devLog('activity', `Inactivity timeout fired after ${timeoutMs}ms`);
        onTimeout();
      }
    }, timeoutMs);

    devLog('activity', `Activity timer reset, will expire in ${timeoutMs}ms`);
  };

  const handleEvent = () => {
    reset();
  };

  // Set up event listeners
  if (browser && target) {
    resetEvents.forEach((eventName) => {
      target.addEventListener(eventName, handleEvent, { passive: true });
    });
  }

  // Start the initial timer
  reset();

  return {
    reset,

    destroy() {
      isDestroyed = true;
      hasExpired = true;

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      // Remove event listeners
      if (browser && target) {
        resetEvents.forEach((eventName) => {
          target.removeEventListener(eventName, handleEvent);
        });
      }

      devLog('activity', 'Activity timer destroyed');
    },

    isActive() {
      return !isDestroyed && !hasExpired;
    },

    trigger() {
      if (!isDestroyed) {
        hasExpired = true;
        devLog('activity', 'Activity timer manually triggered');
        onTimeout();
      }
    }
  };
}

/**
 * Creates an activity timer that checks if specific conditions are met before firing.
 * Useful for preventing timeout during active drawing, dragging, etc.
 *
 * @param timeoutMs - Milliseconds of inactivity before timeout fires
 * @param onTimeout - Callback to execute when timeout occurs
 * @param shouldAllowTimeout - Function that returns true if timeout should be allowed to fire
 * @param resetEvents - Array of event names that should reset the timer
 * @param target - Optional target element (defaults to window)
 *
 * @example
 * ```typescript
 * const timer = createConditionalActivityTimer(
 *   5000,
 *   () => { activeLayer = MapLayerType.None; },
 *   () => !stage?.fogOfWar?.isDrawing() && !stage?.markers?.isDraggingMarker(),
 *   ['mousedown', 'touchstart', 'mousemove']
 * );
 * ```
 */
export function createConditionalActivityTimer(
  timeoutMs: number,
  onTimeout: () => void,
  shouldAllowTimeout: () => boolean,
  resetEvents: string[] = ['mousedown', 'touchstart', 'mousemove', 'touchmove'],
  target: EventTarget = browser ? window : ({} as EventTarget)
): ActivityTimer {
  const conditionalCallback = () => {
    if (shouldAllowTimeout()) {
      devLog('activity', 'Conditional timeout: conditions met, firing callback');
      onTimeout();
    } else {
      devLog('activity', 'Conditional timeout: conditions not met, skipping callback');
    }
  };

  return createActivityTimer(timeoutMs, conditionalCallback, resetEvents, target);
}
