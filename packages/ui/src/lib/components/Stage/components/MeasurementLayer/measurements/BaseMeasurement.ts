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
  /** The Three.js group object containing the measurement visualization */
  object: THREE.Group;

  /**
   * Updates the measurement with a new end point, typically called during mouse movement.
   * @param {THREE.Vector2} endPoint - The new end point coordinates in world space
   * @returns {void}
   */
  update(endPoint: THREE.Vector2): void;

  /**
   * Renders only the shape portion of the measurement (without text labels).
   * @returns {void}
   */
  renderShape(): void;

  /**
   * Cleans up all Three.js resources and removes the measurement from memory.
   * Should be called when the measurement is no longer needed.
   * @returns {void}
   */
  dispose(): void;
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
  /** The group object in the Three.js scene */
  public object: THREE.Group;
  /** The rendered shape object in the Three.js scene */
  protected shapeMesh: THREE.Mesh;
  /** The rendered text object in the Three.js scene */
  protected textMesh: THREE.Mesh;

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

    this.object = new THREE.Group();
    this.object.userData.measurementId = this.id;

    const shapeMaterial = new THREE.MeshBasicMaterial({
      map: null,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide
    });

    this.shapeMesh = new THREE.Mesh(undefined, shapeMaterial);
    this.shapeMesh.layers.set(SceneLayer.Overlay);
    this.shapeMesh.renderOrder = SceneLayerOrder.Measurement;

    this.textMesh = this.createTextMesh('', new THREE.Vector2(0, 0));
    this.textMesh.layers.set(SceneLayer.Overlay);
    this.textMesh.renderOrder = SceneLayerOrder.Measurement;

    this.object.add(this.shapeMesh);
    this.object.add(this.textMesh);
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

    this.renderShape();
    this.renderText();
  }

  /**
   * Renders the distance text label for this measurement with standard positioning logic.
   * Positions text 150 pixels away from the end point in the direction of the measurement.
   * All measurement types share this text positioning and styling approach.
   * Returns an empty group if distance display is disabled.
   *
   * @returns {void}
   */
  renderText(): void {
    // Calculate direction from start to end point and normalize
    const direction = this.endPoint.clone().sub(this.startPoint).normalize();

    // Position text 150px offset from the end point
    const textPosition = this.endPoint.clone().add(direction.multiplyScalar(150));

    const distance = calculateLineDistance(
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
    const text = `${distance.toFixed(1)} ${this.gridProps.worldGridUnits}`;

    const fontSize = this.displayProps.resolution.y / 15;
    const textCanvas = createTextCanvas(text, fontSize, this.color, this.outlineColor, this.outlineThickness);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(textCanvas);
    texture.premultiplyAlpha = false;
    texture.needsUpdate = true;

    if (this.textMesh.material instanceof THREE.MeshBasicMaterial) {
      this.textMesh.material.dispose();
      this.textMesh.material.map = texture;
      this.textMesh.material.map.needsUpdate = true;
    }

    this.textMesh.position.set(textPosition.x, textPosition.y, 1);
  }

  /**
   * Abstract method that must be implemented by each measurement type to render its specific shape.
   * Should create and return a Three.js object representing the measurement's visual geometry
   * (line, circle, rectangle, etc.) based on the current start and end points.
   * The mesh should be stored in the `this.mesh` property.
   *
   * @returns {void}
   */
  abstract renderShape(): void;

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
   * Updates the shape mesh with a new geometry and texture.
   * @param {THREE.PlaneGeometry} geometry - The new geometry to use
   * @param {THREE.CanvasTexture} texture - The new texture to use
   * @returns {void}
   */
  protected updateShapeMesh(geometry: THREE.PlaneGeometry, texture: THREE.CanvasTexture): void {
    this.shapeMesh.geometry?.dispose();
    this.shapeMesh.geometry = geometry;
    if (this.shapeMesh.material instanceof THREE.MeshBasicMaterial) {
      this.shapeMesh.material.map = texture;
      this.shapeMesh.material.map.needsUpdate = true;
    }
  }

  /**
   * Completely destroys this measurement instance and cleans up all associated resources.
   * Removes objects from the scene, disposes of Three.js resources, and marks the measurement as disposed.
   * Should be called when the measurement is no longer needed to prevent memory leaks.
   * @returns {void}
   */
  dispose(): void {
    this.isDisposed = true;

    this.shapeMesh.removeFromParent();
    if (this.shapeMesh instanceof THREE.Mesh) {
      this.shapeMesh.geometry?.dispose();
      (this.shapeMesh.material as THREE.Material)?.dispose();
    }

    this.textMesh.removeFromParent();
    if (this.textMesh instanceof THREE.Mesh) {
      this.textMesh.geometry?.dispose();
      (this.textMesh.material as THREE.Material)?.dispose();
    }

    this.object.removeFromParent();
  }
}
