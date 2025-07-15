import * as THREE from 'three';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';

export interface IMeasurement {
  id: string;
  type: MeasurementType;
  startPoint: THREE.Vector2;
  endPoint: THREE.Vector2;
  distance: number;
  unit: string;
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
  public unit: string;
  public createdAt: number;
  public color: string;
  public opacity: number;
  public thickness: number;
  public outlineThickness: number;
  public outlineColor: string;
  public showDistance: boolean;
  protected displayProps: DisplayProps;

  protected shapeObject: THREE.Object3D | null = null;
  protected textObject: THREE.Object3D | null = null;
  protected isDisposed = false;

  constructor(
    type: MeasurementType,
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps
  ) {
    this.id = crypto.randomUUID();
    this.type = type;
    this.startPoint = startPoint.clone();
    this.endPoint = startPoint.clone();
    this.distance = 0;
    this.unit = measurementProps.distanceUnit;
    this.createdAt = Date.now();
    this.color = measurementProps.color;
    this.opacity = measurementProps.opacity;
    this.thickness = measurementProps.thickness;
    this.outlineThickness = measurementProps.outlineThickness;
    this.outlineColor = measurementProps.outlineColor;
    this.showDistance = measurementProps.showDistance;
    this.displayProps = displayProps;
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
  }

  getDisplayText(): string {
    const distance = this.getDistance();
    return `${distance.toFixed(1)} ${this.unit}`;
  }

  // Abstract methods that must be implemented by subclasses
  abstract getDistance(): number;
  abstract renderShape(): THREE.Object3D;
  abstract renderText(): THREE.Object3D;

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
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    const fontSize = this.displayProps.resolution.y / 15;
    context.canvas.width = 1024;
    context.canvas.height = 1024;

    context.font = `${fontSize}px Raven Hell`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 16;
    context.strokeStyle = '#000000';
    context.fillStyle = 'transparent';

    context.strokeText(text, canvas.width / 2, canvas.height / 2, 1024);

    context.fillStyle = this.color;
    context.strokeStyle = 'transparent';

    context.fillText(text, canvas.width / 2, canvas.height / 2, 1024);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane geometry for text with world dimensions
    const geometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide
    });

    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.set(position.x, position.y, 1); // Slightly above the line

    return textMesh;
  }
}
