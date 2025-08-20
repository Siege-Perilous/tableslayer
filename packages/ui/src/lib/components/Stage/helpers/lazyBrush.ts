import { LazyBrush } from 'lazy-brush';
import * as THREE from 'three';

export interface LazyBrushConfig {
  radius?: number;
  enabled?: boolean;
  friction?: number;
  initialPoint?: { x: number; y: number };
}

export class LazyBrushManager {
  private lazyBrush: LazyBrush;
  private isEnabled: boolean;
  private friction: number;
  private hasStarted: boolean = false;
  private currentStrokePoints: THREE.Vector2[] = [];

  constructor(config: LazyBrushConfig = {}) {
    this.lazyBrush = new LazyBrush({
      radius: config.radius ?? 15, // Default radius for smoothing
      enabled: config.enabled ?? true,
      initialPoint: config.initialPoint ?? { x: 0, y: 0 }
    });
    this.isEnabled = config.enabled ?? true;
    this.friction = config.friction ?? 0.5; // Default friction for moderate smoothing
  }

  /**
   * Updates the lazy brush configuration
   */
  updateConfig(config: Partial<LazyBrushConfig>) {
    if (config.radius !== undefined) {
      this.lazyBrush.setRadius(config.radius);
    }
    if (config.enabled !== undefined) {
      this.isEnabled = config.enabled;
      // LazyBrush doesn't have an enable property, we'll handle it internally
    }
    if (config.friction !== undefined) {
      this.friction = config.friction;
    }
  }

  /**
   * Starts a new stroke
   */
  startStroke(point: THREE.Vector2) {
    this.hasStarted = true;
    this.currentStrokePoints = [];

    if (this.isEnabled) {
      // Update lazy brush with the starting point - force both pointer and brush to the same position
      this.lazyBrush.update({ x: point.x, y: point.y }, { both: true });
      this.currentStrokePoints.push(point.clone());
    }
  }

  /**
   * Updates the current stroke with a new point
   * Returns an array of interpolated points to draw
   */
  updateStroke(point: THREE.Vector2): THREE.Vector2[] {
    if (!this.hasStarted) {
      this.startStroke(point);
      return [];
    }

    if (!this.isEnabled) {
      // If lazy brush is disabled, just return the direct line
      const lastPoint = this.currentStrokePoints[this.currentStrokePoints.length - 1] || point;
      this.currentStrokePoints.push(point.clone());
      return [lastPoint, point];
    }

    // Update the lazy brush with the new pointer position
    this.lazyBrush.update({ x: point.x, y: point.y }, { friction: this.friction });

    // Get the brush position (this is the smoothed position)
    const brushPoint = this.lazyBrush.getBrushCoordinates();

    // Check if the brush has moved enough to add a new point
    if (this.lazyBrush.brushHasMoved()) {
      const smoothedPoint = new THREE.Vector2(brushPoint.x, brushPoint.y);

      // Get the last point we drew
      const lastPoint = this.currentStrokePoints[this.currentStrokePoints.length - 1];

      // Add the new smoothed point to our stroke
      this.currentStrokePoints.push(smoothedPoint.clone());

      // Removed console logging for performance

      // Return the segment to draw
      if (lastPoint) {
        return [lastPoint, smoothedPoint];
      }
    }

    return [];
  }

  /**
   * Ends the current stroke
   */
  endStroke() {
    this.hasStarted = false;
    this.currentStrokePoints = [];
  }

  /**
   * Gets the current lazy pointer position
   */
  getLazyPosition(): THREE.Vector2 | null {
    if (!this.isEnabled || !this.hasStarted) {
      return null;
    }

    const lazyCoords = this.lazyBrush.getPointerCoordinates();
    return new THREE.Vector2(lazyCoords.x, lazyCoords.y);
  }

  /**
   * Gets the current brush position (smoothed)
   */
  getBrushPosition(): THREE.Vector2 | null {
    if (!this.isEnabled || !this.hasStarted) {
      return null;
    }

    const brushCoords = this.lazyBrush.getBrushCoordinates();
    return new THREE.Vector2(brushCoords.x, brushCoords.y);
  }

  /**
   * Resets the lazy brush
   */
  reset() {
    this.hasStarted = false;
    this.currentStrokePoints = [];
    this.lazyBrush.update({ x: 0, y: 0 }, { both: true });
  }

  /**
   * Returns whether lazy brush is enabled
   */
  get enabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Sets whether lazy brush is enabled
   */
  set enabled(value: boolean) {
    this.isEnabled = value;
    // LazyBrush doesn't have an enable property, we'll handle it internally
  }

  /**
   * Gets the lazy radius
   */
  get radius(): number {
    return this.lazyBrush.radius;
  }

  /**
   * Sets the lazy radius
   */
  set radius(value: number) {
    this.lazyBrush.setRadius(value);
  }
}
