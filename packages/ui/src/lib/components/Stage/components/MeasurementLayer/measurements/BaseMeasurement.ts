import * as THREE from 'three';
import type { GridLayerProps } from '../../GridLayer/types';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { createTextCanvas } from '../utils/canvasDrawing';
import { calculateLineDistance } from '../utils/distanceCalculations';

export interface IMeasurement {
  id: string;
  type: MeasurementType;
  startPoint: THREE.Vector2;
  endPoint: THREE.Vector2;
  distance: number;
  createdAt: number;
  color: string;
  opacity: number;
  thickness: number;
  outlineThickness: number;
  outlineColor: string;

  // Lifecycle methods
  update(endPoint: THREE.Vector2): void;
  render(): THREE.Object3D;
  dispose(): void;
  getDistance(): number;
  getDisplayText(): string;
}

export abstract class BaseMeasurement implements IMeasurement {
  public id: string;
  public type: MeasurementType;
  public startPoint: THREE.Vector2;
  public endPoint: THREE.Vector2;
  public distance: number;
  public createdAt: number;
  public color: string;
  public opacity: number;
  public thickness: number;
  public outlineThickness: number;
  public outlineColor: string;
  public showDistance: boolean;
  public snapToGrid: boolean;
  public enableDMG252: boolean;
  protected displayProps: DisplayProps;
  protected gridProps: GridLayerProps;

  protected shapeObject: THREE.Object3D | null = null;
  protected textObject: THREE.Object3D | null = null;
  protected canvasGeometry: THREE.BufferGeometry | null = null;
  protected canvasMaterial: THREE.MeshBasicMaterial | null = null;
  protected isDisposed = false;

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
    this.outlineThickness = measurementProps.outlineThickness;
    this.outlineColor = measurementProps.outlineColor;
    this.showDistance = measurementProps.showDistance;
    this.snapToGrid = measurementProps.snapToGrid;
    this.enableDMG252 = measurementProps.enableDMG252;
    this.displayProps = displayProps;
    this.gridProps = gridProps;
  }

  update(endPoint: THREE.Vector2): void {
    if (this.isDisposed) return;

    this.endPoint = endPoint.clone();
    this.distance = this.getDistance();

    // Update the rendered objects
    this.updateShape();
    this.updateText();
  }

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

  getDisplayText(): string {
    const distance = this.getDistance();
    return `${distance.toFixed(1)} ${this.gridProps.worldGridUnits}`;
  }

  /**
   * Calculate the distance between start and end points using the standard line distance calculation.
   * This implementation is shared by all measurement types as they all use the same distance calculation.
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

  // Protected helper methods
  protected updateShape(): void {
    if (this.shapeObject) {
      this.shapeObject.removeFromParent();
    }
    this.shapeObject = this.renderShape();
  }

  protected updateText(): void {
    if (this.textObject) {
      this.textObject.removeFromParent();
    }
    this.textObject = this.renderText();
  }

  protected createLineMaterial(): THREE.LineBasicMaterial {
    return new THREE.LineBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: this.opacity,
      linewidth: this.thickness
    });
  }

  protected createMeshMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: this.opacity
    });
  }

  /**
   * Creates a text mesh with consistent styling across all measurements
   * @param text The text to display
   * @param position The world position where the text should be placed
   * @returns A Three.js mesh containing the rendered text
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
    textMesh.position.set(position.x, position.y, 1); // Slightly above the line

    return textMesh;
  }

  /**
   * Helper method to dispose existing canvas resources before creating new ones
   * This should be called at the start of renderShape() in derived classes
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
   * Helper method to create canvas-based material with consistent settings
   * @param texture The canvas texture to use
   * @returns A configured MeshBasicMaterial
   */
  protected createCanvasMaterial(texture: THREE.CanvasTexture): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide
    });
  }

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

  // Abstract methods that must be implemented by subclasses
  abstract renderShape(): THREE.Object3D;

  /**
   * Renders the distance text for the measurement.
   * All measurement types use the same text positioning logic:
   * - Text is positioned 150px away from the end point
   * - Direction is calculated from start point to end point
   * - Uses the shared createTextMesh method for consistent styling
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
}
