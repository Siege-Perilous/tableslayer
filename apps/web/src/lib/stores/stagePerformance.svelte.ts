import { getPreference, setPreference } from '$lib/utils/gameSessionPreferences';
import type { PerformanceTier } from '@tableslayer/stage';

export type StagePerformanceSetting = 'auto' | PerformanceTier;

const TIER_ORDER: PerformanceTier[] = ['high', 'medium', 'low'];

export const TIER_MAX_PIXEL_RATIO: Record<PerformanceTier, number> = {
  high: 2,
  medium: 1.5,
  low: 1
};

// Watchdog tuning: sample FPS once per second over a rolling 10 sample window,
// step down when the median is below the thresholds, and never step more than
// once per cooldown period to avoid oscillation
const SAMPLE_INTERVAL_MS = 1000;
const SAMPLE_WINDOW = 10;
const STEP_COOLDOWN_MS = 30000;
const FPS_STEP_ONE = 45;
const FPS_STEP_TWO = 25;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
};

/**
 * Client-local stage rendering quality preference. 'auto' (the default) starts
 * at high quality and an rAF-based FPS watchdog steps the resolved tier down
 * on devices that can't keep up. Manual settings pin the tier and disable the
 * watchdog. The resolved tier is persisted so subsequent loads start at the
 * right tier instead of re-probing from high.
 */
class StagePerformanceStore {
  setting = $state<StagePerformanceSetting>('auto');
  resolvedTier = $state<PerformanceTier>('high');

  #initialized = false;
  #rafId: number | null = null;
  #frameCount = 0;
  #sampleStart = 0;
  #samples: number[] = [];
  #lastStepAt = 0;

  get effectiveTier(): PerformanceTier {
    return this.setting === 'auto' ? this.resolvedTier : this.setting;
  }

  get maxPixelRatio(): number {
    return TIER_MAX_PIXEL_RATIO[this.effectiveTier];
  }

  /**
   * Loads persisted preferences and starts the watchdog if in auto mode.
   * Client-only (reads cookies); call from onMount. Safe to call repeatedly.
   */
  init() {
    if (!this.#initialized) {
      this.#initialized = true;
      this.setting = getPreference('stagePerformance') ?? 'auto';
      this.resolvedTier = this.setting === 'auto' ? (getPreference('stagePerformanceResolved') ?? 'high') : 'high';
      document.addEventListener('visibilitychange', this.#onVisibilityChange);
    }
    this.#syncWatchdog();
  }

  /**
   * Sets the user preference. Selecting 'auto' resets the resolved tier to
   * high and re-probes, which doubles as the "reset" affordance.
   */
  setSetting(setting: StagePerformanceSetting) {
    this.setting = setting;
    setPreference('stagePerformance', setting);

    if (setting === 'auto') {
      this.resolvedTier = 'high';
      setPreference('stagePerformanceResolved', 'high');
      this.#lastStepAt = 0;
    }

    this.#syncWatchdog();
  }

  #onVisibilityChange = () => {
    // Backgrounded tabs throttle rAF and would trigger false downgrades
    this.#syncWatchdog();
  };

  #syncWatchdog() {
    const shouldRun = this.#initialized && this.setting === 'auto' && this.resolvedTier !== 'low' && !document.hidden;

    if (shouldRun && this.#rafId === null) {
      this.#samples = [];
      this.#frameCount = 0;
      this.#sampleStart = performance.now();
      this.#rafId = requestAnimationFrame(this.#onFrame);
    } else if (!shouldRun && this.#rafId !== null) {
      cancelAnimationFrame(this.#rafId);
      this.#rafId = null;
      this.#samples = [];
    }
  }

  #onFrame = (now: number) => {
    this.#rafId = requestAnimationFrame(this.#onFrame);
    this.#frameCount++;

    const elapsed = now - this.#sampleStart;
    if (elapsed < SAMPLE_INTERVAL_MS) return;

    this.#samples.push((this.#frameCount * 1000) / elapsed);
    if (this.#samples.length > SAMPLE_WINDOW) this.#samples.shift();
    this.#frameCount = 0;
    this.#sampleStart = now;

    if (this.#samples.length < SAMPLE_WINDOW) return;
    if (now - this.#lastStepAt < STEP_COOLDOWN_MS) return;

    const fps = median(this.#samples);
    const steps = fps < FPS_STEP_TWO ? 2 : fps < FPS_STEP_ONE ? 1 : 0;
    if (steps === 0) return;

    const currentIndex = TIER_ORDER.indexOf(this.resolvedTier);
    const nextTier = TIER_ORDER[Math.min(currentIndex + steps, TIER_ORDER.length - 1)];

    this.resolvedTier = nextTier;
    setPreference('stagePerformanceResolved', nextTier);
    this.#lastStepAt = now;
    this.#samples = [];
    this.#syncWatchdog();
  };
}

export const stagePerformance = new StagePerformanceStore();
