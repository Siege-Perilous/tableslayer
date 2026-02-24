import * as THREE from 'three';
export interface LazyBrushConfig {
    radius?: number;
    enabled?: boolean;
    friction?: number;
    initialPoint?: {
        x: number;
        y: number;
    };
}
export declare class LazyBrushManager {
    private lazyBrush;
    private isEnabled;
    private friction;
    private hasStarted;
    private currentStrokePoints;
    constructor(config?: LazyBrushConfig);
    /**
     * Updates the lazy brush configuration
     */
    updateConfig(config: Partial<LazyBrushConfig>): void;
    /**
     * Starts a new stroke
     */
    startStroke(point: THREE.Vector2): void;
    /**
     * Updates the current stroke with a new point
     * Returns an array of interpolated points to draw
     */
    updateStroke(point: THREE.Vector2): THREE.Vector2[];
    /**
     * Ends the current stroke
     */
    endStroke(): void;
    /**
     * Gets the current lazy pointer position
     */
    getLazyPosition(): THREE.Vector2 | null;
    /**
     * Gets the current brush position (smoothed)
     */
    getBrushPosition(): THREE.Vector2 | null;
    /**
     * Resets the lazy brush
     */
    reset(): void;
    /**
     * Returns whether lazy brush is enabled
     */
    get enabled(): boolean;
    /**
     * Sets whether lazy brush is enabled
     */
    set enabled(value: boolean);
    /**
     * Gets the lazy radius
     */
    get radius(): number;
    /**
     * Sets the lazy radius
     */
    set radius(value: number);
}
