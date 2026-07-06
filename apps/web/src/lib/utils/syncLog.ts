// TEMPORARY instrumentation for diagnosing multi-editor sync smoothness.
// Logs unconditionally (works in deployed preview builds, unlike devLog) and
// emits plain strings for easy copy/paste. Each tracker prints one summary
// line per second while events flow, plus a trailing line when a burst ends.
// Remove once the pan-smoothness investigation is over.

const wallClock = () => new Date().toISOString().slice(11, 23);

// Distinguishes windows when pasting logs from several consoles
let role = 'unset';
export const setSyncLogRole = (r: string) => {
  role = `${r}#${Math.random().toString(36).slice(2, 6)}`;
};

const line = (label: string, message: string) => {
  console.log(`[sync ${wallClock()} ${role}] ${label}: ${message}`);
};

const WINDOW_MS = 1000;
const BURST_GAP_MS = 500;

/**
 * Records event cadence and logs `n` events, avg/max gap between them, and the
 * latest detail string — one line per WINDOW_MS while events flow. A gap over
 * BURST_GAP_MS flushes the previous burst so idle time never pollutes gapMax.
 */
export const createCadenceTracker = (label: string) => {
  let count = 0;
  let windowStart = 0;
  let lastAt = 0;
  let gapSum = 0;
  let gapMax = 0;
  let detail = '';

  const emit = (endAt: number) => {
    const gaps = count - 1;
    const span = Math.round(endAt - windowStart);
    const avg = gaps > 0 ? (gapSum / gaps).toFixed(1) : '-';
    line(
      label,
      `n=${count} span=${span}ms gapAvg=${avg}ms gapMax=${gapMax.toFixed(1)}ms${detail ? ` last=${detail}` : ''}`
    );
    count = 0;
    gapSum = 0;
    gapMax = 0;
    detail = '';
  };

  return {
    record(d?: string) {
      const t = performance.now();
      if (count > 0 && t - lastAt > BURST_GAP_MS) emit(lastAt);
      if (count === 0) windowStart = t;
      else {
        const gap = t - lastAt;
        gapSum += gap;
        if (gap > gapMax) gapMax = gap;
      }
      lastAt = t;
      count++;
      if (d !== undefined) detail = d;
      if (t - windowStart >= WINDOW_MS) emit(t);
    }
  };
};

/**
 * Detects main-thread stalls regardless of cause: a 25ms heartbeat timer that
 * logs whenever it fires much later than scheduled. A `stall=280ms` line means
 * SOMETHING blocked the main thread that long — correlate its timestamp with
 * the surrounding rebuild/frame duration lines to attribute it.
 */
let stallDetectorStarted = false;
export const startStallDetector = () => {
  if (stallDetectorStarted) return;
  stallDetectorStarted = true;
  const HEARTBEAT_MS = 25;
  const REPORT_OVER_MS = 100;
  let expected = performance.now() + HEARTBEAT_MS;
  setInterval(() => {
    const t = performance.now();
    const late = t - expected;
    if (late > REPORT_OVER_MS) line('stall', `blocked=${late.toFixed(0)}ms`);
    expected = t + HEARTBEAT_MS;
  }, HEARTBEAT_MS);
};

/**
 * Times a synchronous block and returns its result; durations over the
 * threshold log immediately as their own line.
 */
export const timeSync = <T>(label: string, thresholdMs: number, fn: () => T): T => {
  const start = performance.now();
  const result = fn();
  const dur = performance.now() - start;
  if (dur > thresholdMs) line(label, `dur=${dur.toFixed(0)}ms`);
  return result;
};

/**
 * Logs this window's animation-frame health once per second: frames per
 * second and the worst frame gap. Slow fps / big gaps in a window that is
 * visibly on screen means the compositor or GPU is starving it.
 */
let rafLoggerStarted = false;
export const startRafLogger = () => {
  if (rafLoggerStarted || typeof requestAnimationFrame !== 'function') return;
  rafLoggerStarted = true;
  let frames = 0;
  let windowStart = performance.now();
  let lastAt = windowStart;
  let gapMax = 0;

  let workMax = 0;

  // This callback re-registers every frame, so it always runs LAST in the rAF
  // list: now() minus the frame's vsync timestamp ≈ time all earlier rAF
  // callbacks (the whole Threlte frame, every useTask) spent this frame.
  const tick = (frameTimestamp: number) => {
    const t = performance.now();
    frames++;
    const gap = t - lastAt;
    if (gap > gapMax) gapMax = gap;
    const work = t - frameTimestamp;
    if (work > workMax) workMax = work;
    lastAt = t;
    if (t - windowStart >= WINDOW_MS) {
      const fps = (frames * 1000) / (t - windowStart);
      line(
        'raf',
        `fps=${fps.toFixed(1)} gapMax=${gapMax.toFixed(1)}ms workMax=${workMax.toFixed(1)}ms visible=${document.visibilityState === 'visible'} focused=${document.hasFocus()}`
      );
      frames = 0;
      gapMax = 0;
      workMax = 0;
      windowStart = t;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
