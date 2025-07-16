import * as THREE from 'three';
import type { GridLayerProps } from '../../GridLayer/types';
import { SceneLayer, SceneLayerOrder } from '../../Scene/types';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { createTextCanvas } from '../utils/canvasDrawing';
import { calculateLineDistance } from '../utils/distanceCalculations';

/**
 * Interface defining the contract that all measurement implementations must follow.
 * Provides methods for lifecycle management, rendering, and data access for measurements.
 */
export interface IMeasurement {
  /**
   * Updates the measurement with a new end point, typically called during mouse movement.
   * @param {THREE.Vector2} endPoint - The new end point coordinates in world space
   * @returns {void}
   */
  update(endPoint: THREE.Vector2): void;

  /**
   * Renders the complete measurement including shape and text as a Three.js object.
   * @returns {THREE.Object3D} A Three.js group containing the measurement visualization
   */
  render(): THREE.Object3D;

  /**
   * Renders only the shape portion of the measurement (without text labels).
   * @returns {THREE.Object3D} A Three.js object representing the measurement shape
   */
  renderShape(): THREE.Object3D;

  /**
   * Cleans up all Three.js resources and removes the measurement from memory.
   * Should be called when the measurement is no longer needed.
   * @returns {void}
   */
  dispose(): void;

  /**
   * Calculates and returns the current distance of the measurement.
   * @returns {number} The distance value in the configured world units
   */
  getDistance(): number;

  /**
   * Gets the formatted text that should be displayed for this measurement.
   * @returns {string} The formatted distance text with units
   */
  getDisplayText(): string;
}

/**
 * Abstract base class providing common functionality for all measurement types.
 * Handles shared behavior like distance calculation, text rendering, resource management,
 * and coordinate transformations while allowing subclasses to implement specific shapes.
 */
export abstract class BaseMeasurement implements IMeasurement {
  /** Unique identifier for this measurement instance */
  public id: string;
  /** The type of measurement (line, circle, rectangle, etc.) */
  public type: MeasurementType;
  /** Starting point of the measurement in world coordinates */
  public startPoint: THREE.Vector2;
  /** Current end point of the measurement in world coordinates */
  public endPoint: THREE.Vector2;
  /** Calculated distance value in world units */
  public distance: number;
  /** Timestamp when the measurement was created */
  public createdAt: number;
  /** Primary color for the measurement visualization */
  public color: string;
  /** Opacity level for the measurement (0.0 to 1.0) */
  public opacity: number;
  /** Line thickness for drawing measurement elements */
  public thickness: number;
  /** Diameter of the measurement markers/points */
  public markerSize: number;
  /** Thickness of outline strokes around measurement elements */
  public outlineThickness: number;
  /** Color used for outline strokes */
  public outlineColor: string;
  /** Whether to display distance text labels */
  public showDistance: boolean;
  /** Whether to snap measurement points to the grid */
  public snapToGrid: boolean;
  /** Whether to use DMG 252 measurement calculations */
  public enableDMG252: boolean;

  /** Display properties containing resolution and size information */
  protected displayProps: DisplayProps;
  /** Grid properties containing spacing and units information */
  protected gridProps: GridLayerProps;
  /** The rendered shape object in the Three.js scene */
  protected shapeObject: THREE.Object3D | null = null;
  /** The rendered text object in the Three.js scene */
  protected textObject: THREE.Object3D | null = null;
  /** Reusable canvas geometry for efficient rendering */
  protected canvasGeometry: THREE.BufferGeometry | null = null;
  /** Reusable canvas material for efficient rendering */
  protected canvasMaterial: THREE.MeshBasicMaterial | null = null;
  /** Flag indicating whether this measurement has been disposed */
  protected isDisposed = false;

  /**
   * Creates a new measurement instance with the specified properties.
   * Initializes all measurement parameters and sets up the coordinate system.
   *
   * @param {MeasurementType} type - The specific type of measurement being created
   * @param {THREE.Vector2} startPoint - Initial starting point in world coordinates
   * @param {MeasurementLayerProps} measurementProps - Configuration properties for the measurement
   * @param {DisplayProps} displayProps - Display settings including resolution and dimensions
   * @param {GridLayerProps} gridProps - Grid configuration for snapping and units
   */
  constructor(
    type: MeasurementType,
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps,
    gridProps: GridLayerProps
  ) {
    this.id = crypto.randomUUID();
    this.type = type;
    this.startPoint = startPoint.clone();
    this.endPoint = startPoint.clone();
    this.distance = 0;
    this.createdAt = Date.now();
    this.color = measurementProps.color;
    this.opacity = measurementProps.opacity;
    this.thickness = measurementProps.thickness;
    this.markerSize = measurementProps.markerSize;
    this.outlineThickness = measurementProps.outlineThickness;
    this.outlineColor = measurementProps.outlineColor;
    this.showDistance = measurementProps.showDistance;
    this.snapToGrid = measurementProps.snapToGrid;
    this.enableDMG252 = measurementProps.enableDMG252;
    this.displayProps = displayProps;
    this.gridProps = gridProps;
  }

  /**
   * Updates the measurement with a new end point and recalculates all derived values.
   * Recreates the shape and text objects to reflect the new measurement geometry.
   * This method is called continuously during measurement creation as the user moves the mouse.
   *
   * @param {THREE.Vector2} endPoint - The new end point coordinates in world space
   * @returns {void}
   */
  update(endPoint: THREE.Vector2): void {
    if (this.isDisposed) return;

    this.endPoint = endPoint.clone();
    this.distance = this.getDistance();

    if (this.shapeObject) {
      this.shapeObject.removeFromParent();
    }
    this.shapeObject = this.renderShape();

    if (this.textObject) {
      this.textObject.removeFromParent();
    }
    this.textObject = this.renderText();
  }

  /**
   * Renders the complete measurement as a Three.js group containing both shape and text elements.
   * Creates a new group with proper metadata and adds all visualization components.
   * Returns an empty group if the measurement has been disposed.
   *
   * @returns {THREE.Object3D} A Three.js group containing the complete measurement visualization
   */
  render(): THREE.Object3D {
    if (this.isDisposed) {
      const emptyGroup = new THREE.Group();
      return emptyGroup;
    }

    const group = new THREE.Group();
    group.userData.measurementId = this.id;

    // Render shape
    const shape = this.renderShape();
    if (shape) {
      group.add(shape);
    }

    // Render text
    const text = this.renderText();
    if (text) {
      group.add(text);
    }

    return group;
  }

  /**
   * Generates the formatted text string that represents this measurement's distance.
   * Includes the distance value rounded to one decimal place plus the world units.
   *
   * @returns {string} Formatted distance text (e.g., "15.3 ft" or "4.7 m")
   */
  getDisplayText(): string {
    const distance = this.getDistance();
    return `${distance.toFixed(1)} ${this.gridProps.worldGridUnits}`;
  }

  /**
   * Calculates the distance between start and end points using the configured measurement system.
   * Uses the standard line distance calculation that accounts for grid snapping, world scaling,
   * and optional DMG 252 measurement standards. This implementation is shared by all measurement types.
   *
   * @returns {number} The calculated distance in the configured world units
   */
  getDistance(): number {
    return calculateLineDistance(
      this.startPoint,
      this.endPoint,
      this.gridProps.spacing,
      this.displayProps.size,
      this.displayProps.resolution,
      this.gridProps.gridType,
      this.snapToGrid,
      this.enableDMG252,
      this.gridProps.worldGridSize,
      this.gridProps.worldGridUnits
    );
  }

  /**
   * Creates a Three.js mesh displaying text with consistent styling across all measurements.
   * Generates a canvas-based texture with the specified text and applies standard material settings
   * for proper transparency, layering, and visual appearance.
   *
   * @param {string} text - The text content to display
   * @param {THREE.Vector2} position - World coordinates where the text should be positioned
   * @returns {THREE.Mesh} A Three.js mesh containing the rendered text
   */
  protected createTextMesh(text: string, position: THREE.Vector2): THREE.Mesh {
    const fontSize = this.displayProps.resolution.y / 15;

    const canvas = createTextCanvas(text, fontSize, this.color, this.outlineColor, this.outlineThickness);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.premultiplyAlpha = false;
    texture.needsUpdate = true;

    // Create plane geometry for text with world dimensions
    const geometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide,
      alphaTest: 0.01, // Only render pixels with alpha > 0.01
      depthWrite: false // Don't write to depth buffer to avoid z-fighting
    });

    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.layers.set(SceneLayer.Overlay);
    textMesh.renderOrder = SceneLayerOrder.Measurement;
    textMesh.position.set(position.x, position.y, 1); // Slightly above the line

    return textMesh;
  }

  /**
   * Safely disposes of existing canvas-based rendering resources to prevent memory leaks.
   * Should be called before creating new geometry and materials in renderShape() implementations.
   * Properly cleans up Three.js geometry and material objects.
   * @returns {void}
   */
  protected disposeCanvasResources(): void {
    if (this.canvasGeometry) {
      this.canvasGeometry.dispose();
      this.canvasGeometry = null;
    }
    if (this.canvasMaterial) {
      this.canvasMaterial.dispose();
      this.canvasMaterial = null;
    }
  }

  /**
   * Creates a Three.js material configured for canvas-based textures with standard measurement settings.
   * Applies consistent transparency, opacity, and rendering properties used across all measurements.
   *
   * @param {THREE.CanvasTexture} texture - The canvas texture to apply to the material
   * @returns {THREE.MeshBasicMaterial} A configured material ready for use with measurement meshes
   */
  protected createCanvasMaterial(texture: THREE.CanvasTexture): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide
    });
  }

  /**
   * Completely destroys this measurement instance and cleans up all associated resources.
   * Removes objects from the scene, disposes of Three.js resources, and marks the measurement as disposed.
   * Should be called when the measurement is no longer needed to prevent memory leaks.
   * @returns {void}
   */
  dispose(): void {
    this.isDisposed = true;

    if (this.shapeObject) {
      this.shapeObject.removeFromParent();
      if (this.shapeObject instanceof THREE.Mesh) {
        this.shapeObject.geometry?.dispose();
        (this.shapeObject.material as THREE.Material)?.dispose();
      }
    }

    if (this.textObject) {
      this.textObject.removeFromParent();
      if (this.textObject instanceof THREE.Mesh) {
        this.textObject.geometry?.dispose();
        (this.textObject.material as THREE.Material)?.dispose();
      }
    }

    this.disposeCanvasResources();
  }

  /**
   * Renders the distance text label for this measurement with standard positioning logic.
   * Positions text 150 pixels away from the end point in the direction of the measurement.
   * All measurement types share this text positioning and styling approach.
   * Returns an empty group if distance display is disabled.
   *
   * @returns {THREE.Object3D} A Three.js object containing the distance text, or empty group if disabled
   */
  renderText(): THREE.Object3D {
    if (!this.showDistance) {
      return new THREE.Group();
    }

    // Calculate direction from start to end point and normalize
    const direction = this.endPoint.clone().sub(this.startPoint).normalize();

    // Position text 150px offset from the end point
    const textPosition = this.endPoint.clone().add(direction.multiplyScalar(150));

    // Use the shared text rendering method
    return this.createTextMesh(this.getDisplayText(), textPosition);
  }

  /**
   * Abstract method that must be implemented by each measurement type to render its specific shape.
   * Should create and return a Three.js object representing the measurement's visual geometry
   * (line, circle, rectangle, etc.) based on the current start and end points.
   *
   * @returns {THREE.Object3D} A Three.js object representing the measurement shape
   */
  abstract renderShape(): THREE.Object3D;
}
