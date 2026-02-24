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
export declare const performanceMetrics: {
    value: PerformanceMetrics;
};
export declare const performanceHistory: {
    value: PerformanceHistory;
};
/**
 * Start timing a render pass
 */
export declare const startTiming: () => number;
/**
 * End timing a render pass and return elapsed time in ms
 */
export declare const endTiming: (startTime: number) => number;
/**
 * Update metrics at the start of each frame
 */
export declare const beginFrame: () => number;
/**
 * Update metrics at the end of each frame
 */
export declare const endFrame: (_frameStartTime: number, renderer: THREE.WebGLRenderer, timings: {
    composerTime: number;
    overlayTime: number;
    weatherTime?: number;
}) => void;
/**
 * Log metrics to console at specified rate
 */
export declare const logMetrics: (rate: number) => void;
/**
 * Get average FPS over the entire history window
 */
export declare const getAverageFps: () => number;
/**
 * Get the 1% low FPS (slowest 1% of frames)
 */
export declare const get1PercentLowFps: () => number;
/**
 * Get frame times calculated from timestamps (for graphing)
 */
export declare const getFrameTimes: () => number[];
/**
 * Reset all metrics and history
 */
export declare const resetMetrics: () => void;
