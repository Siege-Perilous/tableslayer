import type * as THREE from 'three';

export interface PerformanceMetrics {
  frameTime: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  textures: number;
  geometries: number;
  composerTime: number;
  overlayTime: number;
  weatherTime: number;
  totalRenderTime: number;
}

export interface PerformanceHistory {
  timestamps: number[];
}

const HISTORY_SIZE = 120; // Store last 120 frames (~2 seconds at 60fps)

// Performance metrics state
export const performanceMetrics: { value: PerformanceMetrics } = $state({
  value: {
    frameTime: 0,
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    composerTime: 0,
    overlayTime: 0,
    weatherTime: 0,
    totalRenderTime: 0
  }
});

// Historical data for graphing - just timestamps, calculate frame times from deltas
export const performanceHistory: { value: PerformanceHistory } = $state({
  value: {
    timestamps: []
  }
});

// Timing helpers
let lastLogTime = 0;

/**
 * Start timing a render pass
 */
export const startTiming = (): number => {
  return performance.now();
};

/**
 * End timing a render pass and return elapsed time in ms
 */
export const endTiming = (startTime: number): number => {
  return performance.now() - startTime;
};

/**
 * Update metrics at the start of each frame
 */
export const beginFrame = (): number => {
  return performance.now();
};

/**
 * Update metrics at the end of each frame
 */
export const endFrame = (
  _frameStartTime: number,
  renderer: THREE.WebGLRenderer,
  timings: {
    composerTime: number;
    overlayTime: number;
    weatherTime?: number;
  }
): void => {
  const now = performance.now();

  // Add timestamp to history
  const history = performanceHistory.value;
  history.timestamps.push(now);

  // Trim history to size limit
  while (history.timestamps.length > HISTORY_SIZE) {
    history.timestamps.shift();
  }

  // Calculate FPS from timestamps (frames / time elapsed)
  // Use recent window for current FPS
  const timestamps = history.timestamps;
  let fps = 0;
  let frameTime = 0;

  if (timestamps.length >= 2) {
    // Use last 30 frames or all available for FPS calculation
    const sampleSize = Math.min(30, timestamps.length);
    const oldestIdx = timestamps.length - sampleSize;
    const elapsed = now - timestamps[oldestIdx];

    if (elapsed > 0) {
      fps = ((sampleSize - 1) / elapsed) * 1000;
      frameTime = elapsed / (sampleSize - 1);
    }
  }

  // Update metrics
  const info = renderer.info;

  performanceMetrics.value = {
    frameTime,
    fps,
    drawCalls: info.render.calls,
    triangles: info.render.triangles,
    textures: info.memory.textures,
    geometries: info.memory.geometries,
    composerTime: timings.composerTime,
    overlayTime: timings.overlayTime,
    weatherTime: timings.weatherTime ?? 0,
    totalRenderTime: timings.composerTime + timings.overlayTime + (timings.weatherTime ?? 0)
  };

  performanceHistory.value = { ...history };
};

/**
 * Log metrics to console at specified rate
 */
export const logMetrics = (rate: number): void => {
  const now = performance.now();

  if (now - lastLogTime < rate) return;

  const m = performanceMetrics.value;
  console.log(
    `[Perf] FPS: ${m.fps.toFixed(1)} | Frame: ${m.frameTime.toFixed(2)}ms | ` +
      `Draw calls: ${m.drawCalls} | Triangles: ${m.triangles} | ` +
      `Textures: ${m.textures} | Geometries: ${m.geometries} | ` +
      `Composer: ${m.composerTime.toFixed(2)}ms | Overlay: ${m.overlayTime.toFixed(2)}ms`
  );

  lastLogTime = now;
};

/**
 * Get average FPS over the entire history window
 */
export const getAverageFps = (): number => {
  const timestamps = performanceHistory.value.timestamps;
  if (timestamps.length < 2) return 0;

  const elapsed = timestamps[timestamps.length - 1] - timestamps[0];
  if (elapsed <= 0) return 0;

  return ((timestamps.length - 1) / elapsed) * 1000;
};

/**
 * Get the 1% low FPS (slowest 1% of frames)
 */
export const get1PercentLowFps = (): number => {
  const timestamps = performanceHistory.value.timestamps;
  if (timestamps.length < 10) return 0;

  // Calculate frame times from timestamp deltas
  const frameTimes: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    frameTimes.push(timestamps[i] - timestamps[i - 1]);
  }

  // Sort descending (longest frame times first)
  frameTimes.sort((a, b) => b - a);

  // Get 99th percentile (1% slowest)
  const p99Index = Math.max(0, Math.floor(frameTimes.length * 0.01));
  const p99FrameTime = frameTimes[p99Index];

  return p99FrameTime > 0 ? 1000 / p99FrameTime : 0;
};

/**
 * Get frame times calculated from timestamps (for graphing)
 */
export const getFrameTimes = (): number[] => {
  const timestamps = performanceHistory.value.timestamps;
  if (timestamps.length < 2) return [];

  const frameTimes: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    frameTimes.push(timestamps[i] - timestamps[i - 1]);
  }
  return frameTimes;
};

/**
 * Reset all metrics and history
 */
export const resetMetrics = (): void => {
  performanceMetrics.value = {
    frameTime: 0,
    fps: 0,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
    geometries: 0,
    composerTime: 0,
    overlayTime: 0,
    weatherTime: 0,
    totalRenderTime: 0
  };

  performanceHistory.value = {
    timestamps: []
  };

  lastLogTime = 0;
};
