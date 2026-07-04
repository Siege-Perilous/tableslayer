import { browser } from '$app/environment';

export interface GestureDetectorOptions {
  /**
   * Number of fingers required for the gesture
   */
  fingerCount: number;

  /**
   * How long to hold before triggering (in milliseconds)
   */
  holdDuration: number;

  /**
   * Callback when gesture is detected
   */
  onGesture: (position: { x: number; y: number }) => void;

  /**
   * Optional target element (defaults to window)
   */
  target?: HTMLElement;

  /**
   * Maximum movement allowed during hold (in pixels)
   */
  maxMovement?: number;
}

export interface GestureDetector {
  destroy: () => void;
}

/**
 * Creates a multi-finger long-press gesture detector
 *
 * @example
 * ```typescript
 * const detector = createGestureDetector({
 *   fingerCount: 2,
 *   holdDuration: 500,
 *   onGesture: (position) => {
 *     showMenuAt(position.x, position.y);
 *   }
 * });
 *
 * // Later, clean up
 * detector.destroy();
 * ```
 */
export function createGestureDetector(options: GestureDetectorOptions): GestureDetector {
  if (!browser) {
    return { destroy: () => {} };
  }

  const { fingerCount, holdDuration, onGesture, target = document.body, maxMovement = 20 } = options;

  let touchStartTime: number | null = null;
  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let initialTouches: Touch[] = [];
  let hasTriggered = false;

  function calculateCenterPoint(touches: TouchList | Touch[]): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    const count = touches.length;

    for (let i = 0; i < count; i++) {
      const touch = touches[i];
      sumX += touch.clientX;
      sumY += touch.clientY;
    }

    return {
      x: sumX / count,
      y: sumY / count
    };
  }

  function calculateMaxMovement(initialTouches: Touch[], currentTouches: TouchList): number {
    let maxDist = 0;

    for (let i = 0; i < Math.min(initialTouches.length, currentTouches.length); i++) {
      const initial = initialTouches[i];
      const current = currentTouches[i];

      const dx = current.clientX - initial.clientX;
      const dy = current.clientY - initial.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > maxDist) {
        maxDist = dist;
      }
    }

    return maxDist;
  }

  function handleTouchStart(e: TouchEvent) {
    // Only trigger if exact finger count matches
    if (e.touches.length === fingerCount) {
      touchStartTime = Date.now();
      hasTriggered = false;

      // Store initial touch positions
      initialTouches = Array.from(e.touches);

      // Clear any existing timer
      if (holdTimer) {
        clearTimeout(holdTimer);
      }

      // Start hold timer
      holdTimer = setTimeout(() => {
        // Check if fingers are still down and haven't moved too much
        if (touchStartTime && !hasTriggered) {
          const centerPoint = calculateCenterPoint(initialTouches);
          hasTriggered = true;
          onGesture(centerPoint);
        }
      }, holdDuration);
    } else {
      // Wrong number of fingers, cancel
      cleanup();
    }
  }

  function handleTouchMove(e: TouchEvent) {
    // If we're tracking a gesture
    if (touchStartTime && !hasTriggered) {
      // Check if fingers moved too much
      const movement = calculateMaxMovement(initialTouches, e.touches);

      if (movement > maxMovement) {
        // Too much movement, cancel gesture
        cleanup();
      }

      // Also cancel if finger count changed
      if (e.touches.length !== fingerCount) {
        cleanup();
      }
    }
  }

  function handleTouchEnd(e: TouchEvent) {
    // If fingers lifted before timer completed, cancel
    if (touchStartTime && !hasTriggered) {
      cleanup();
    }

    // If all fingers lifted, reset
    if (e.touches.length === 0) {
      cleanup();
    }
  }

  function handleTouchCancel() {
    cleanup();
  }

  function cleanup() {
    touchStartTime = null;
    initialTouches = [];
    hasTriggered = false;

    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
  }

  // Add event listeners
  target.addEventListener('touchstart', handleTouchStart, { passive: true });
  target.addEventListener('touchmove', handleTouchMove, { passive: true });
  target.addEventListener('touchend', handleTouchEnd, { passive: true });
  target.addEventListener('touchcancel', handleTouchCancel, { passive: true });

  return {
    destroy() {
      cleanup();
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      target.removeEventListener('touchcancel', handleTouchCancel);
    }
  };
}

/**
 * Creates a combined gesture detector that works with both touch and mouse
 * - Touch: Two-finger long-press
 * - Mouse: Right-click
 */
export function createUnifiedGestureDetector(
  onGesture: (position: { x: number; y: number }) => void,
  target: HTMLElement = document.body,
  touchOptions?: Partial<GestureDetectorOptions>
): GestureDetector {
  if (!browser) {
    return { destroy: () => {} };
  }

  // Create touch detector for two-finger long-press
  const touchDetector = createGestureDetector({
    fingerCount: touchOptions?.fingerCount ?? 2,
    holdDuration: touchOptions?.holdDuration ?? 500,
    onGesture,
    target,
    maxMovement: touchOptions?.maxMovement ?? 20
  });

  // Add right-click handler for mouse
  function handleContextMenu(e: MouseEvent) {
    e.preventDefault();
    onGesture({ x: e.clientX, y: e.clientY });
  }

  target.addEventListener('contextmenu', handleContextMenu);

  return {
    destroy() {
      touchDetector.destroy();
      target.removeEventListener('contextmenu', handleContextMenu);
    }
  };
}

export interface MultiFingerPanOptions {
  /**
   * Exact number of fingers required for the pan
   */
  fingerCount: number;

  /**
   * Called with the centroid's screen-pixel movement per touchmove
   */
  onPan: (dx: number, dy: number) => void;

  /**
   * Called when the gesture ends (a finger lifted or was added)
   */
  onPanEnd?: () => void;

  /**
   * Optional target element (defaults to document.body)
   */
  target?: HTMLElement;
}

/**
 * Creates a multi-finger drag gesture that emits centroid movement deltas,
 * e.g. a four-finger map pan. Only active while exactly `fingerCount` fingers
 * are down; adding or lifting a finger ends the gesture.
 */
export function createMultiFingerPan(options: MultiFingerPanOptions): GestureDetector {
  if (!browser) {
    return { destroy: () => {} };
  }

  const { fingerCount, onPan, onPanEnd, target = document.body } = options;

  let previousCentroid: { x: number; y: number } | null = null;

  function centroid(touches: TouchList): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < touches.length; i++) {
      sumX += touches[i].clientX;
      sumY += touches[i].clientY;
    }
    return { x: sumX / touches.length, y: sumY / touches.length };
  }

  function syncTracking(e: TouchEvent) {
    const active = e.touches.length === fingerCount;
    if (!active && previousCentroid) onPanEnd?.();
    previousCentroid = active ? centroid(e.touches) : null;
  }

  function handleTouchMove(e: TouchEvent) {
    if (e.touches.length !== fingerCount) {
      if (previousCentroid) onPanEnd?.();
      previousCentroid = null;
      return;
    }

    e.preventDefault();
    const current = centroid(e.touches);
    if (previousCentroid) {
      onPan(current.x - previousCentroid.x, current.y - previousCentroid.y);
    }
    previousCentroid = current;
  }

  target.addEventListener('touchstart', syncTracking, { passive: true });
  target.addEventListener('touchend', syncTracking, { passive: true });
  target.addEventListener('touchcancel', syncTracking, { passive: true });
  target.addEventListener('touchmove', handleTouchMove, { passive: false });

  return {
    destroy() {
      target.removeEventListener('touchstart', syncTracking);
      target.removeEventListener('touchend', syncTracking);
      target.removeEventListener('touchcancel', syncTracking);
      target.removeEventListener('touchmove', handleTouchMove);
    }
  };
}
