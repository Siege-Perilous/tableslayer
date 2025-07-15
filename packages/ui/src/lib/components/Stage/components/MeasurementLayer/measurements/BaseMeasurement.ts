import * as THREE from 'three';
import { MeasurementType } from '../types';

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
  public showDistance: boolean;

  protected shapeObject: THREE.Object3D | null = null;
  protected textObject: THREE.Object3D | null = null;
  protected isDisposed = false;

  constructor(
    type: MeasurementType,
    startPoint: THREE.Vector2,
    color: string,
    opacity: number,
    thickness: number,
    unit: string = 'ft',
    showDistance: boolean = true
  ) {
    this.id = crypto.randomUUID();
    this.type = type;
    this.startPoint = startPoint.clone();
    this.endPoint = startPoint.clone();
    this.distance = 0;
    this.unit = unit;
    this.createdAt = Date.now();
    this.color = color;
    this.opacity = opacity;
    this.thickness = thickness;
    this.showDistance = showDistance;
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
   * @param displayProps Display properties for sizing
   * @returns A Three.js mesh containing the rendered text
   */
  protected createTextMesh(text: string, position: THREE.Vector2, displayProps: any): THREE.Mesh {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    const fontSize = 160;

    // Set text properties for measurement
    context.font = `Raven Hell ${fontSize}px`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';

    // Measure text
    const textMetrics = context.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    // Set canvas size with proper padding for outline
    const outlineWidth = 4;
    const canvasWidth = textWidth + outlineWidth * 2;
    const canvasHeight = textHeight + outlineWidth * 2;

    // Create high-resolution canvas for crisp text
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw text outline (black)
    context.font = `Raven Hell ${fontSize + 1}px`;
    context.strokeStyle = '#000000';
    context.lineWidth = outlineWidth;
    context.strokeText(text, canvas.width / 2, canvas.height / 2);

    // Draw text fill (colored)
    context.font = `Raven Hell ${fontSize}px`;
    context.fillStyle = this.color;
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane geometry for text with world dimensions
    const geometry = new THREE.PlaneGeometry(canvas.width * 2, canvas.height * 2);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide
    });

    const textMesh = new THREE.Mesh(geometry, material);
    textMesh.position.set(position.x - canvas.width / 2, position.y - canvas.height / 2, 1);

    return textMesh;
  }
}
