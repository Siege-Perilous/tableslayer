import * as THREE from 'three';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle, drawRectangle } from '../utils/canvasDrawing';
import { calculateLineDistance } from '../utils/distanceCalculations';
import { BaseMeasurement } from './BaseMeasurement';

export class RectangleMeasurement extends BaseMeasurement {
  private canvasGeometry: THREE.BufferGeometry | null = null;
  private canvasMaterial: THREE.MeshBasicMaterial | null = null;

  constructor(
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps,
    gridProps: any
  ) {
    super(MeasurementType.Square, startPoint, measurementProps, displayProps, gridProps);
  }

  getDistance(): number {
    // For rectangles, calculate the diagonal distance to opposite corner
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

  getDisplayText(): string {
    const distance = this.getDistance();
    return `${distance.toFixed(1)} ${this.gridProps.worldGridUnits}`;
  }

  renderShape(): THREE.Object3D {
    // Dispose previous geometry and material
    if (this.canvasGeometry) {
      this.canvasGeometry.dispose();
    }
    if (this.canvasMaterial) {
      this.canvasMaterial.dispose();
    }

    // Calculate rectangle bounds
    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);

    const width = maxX - minX;
    const height = maxY - minY;

    // Create canvas for the rectangle
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Add padding for outline and corner points
    const padding = Math.max(this.thickness * 4 + this.outlineThickness, 40);

    canvas.width = Math.max(width + padding * 2, 100);
    canvas.height = Math.max(height + padding * 2, 100);

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate rectangle position on canvas
    const rectX = padding;
    const rectY = padding;
    const rectWidth = width;
    const rectHeight = height;

    // Draw rectangle using utility function
    if (rectWidth > 0 && rectHeight > 0) {
      drawRectangle(
        context,
        rectX,
        rectY,
        rectWidth,
        rectHeight,
        this.color,
        this.thickness,
        this.color,
        0.2,
        this.outlineThickness > 0 ? this.outlineColor : undefined,
        this.outlineThickness > 0 ? this.outlineThickness : undefined
      );
    }

    // Draw corner points
    const cornerRadius = this.thickness * 2;

    // Top-left corner
    drawCircle(context, rectX, rectY, cornerRadius, this.color, this.outlineColor, this.outlineThickness);

    // Top-right corner
    drawCircle(context, rectX + rectWidth, rectY, cornerRadius, this.color, this.outlineColor, this.outlineThickness);

    // Bottom-right corner
    drawCircle(
      context,
      rectX + rectWidth,
      rectY + rectHeight,
      cornerRadius,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    // Bottom-left corner
    drawCircle(context, rectX, rectY + rectHeight, cornerRadius, this.color, this.outlineColor, this.outlineThickness);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane geometry for the rectangle
    this.canvasGeometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    this.canvasMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide
    });

    const rectangleMesh = new THREE.Mesh(this.canvasGeometry, this.canvasMaterial);
    // Position the mesh so it aligns with the rectangle bounds
    rectangleMesh.position.set(minX + width / 2, minY + height / 2, 0);

    return rectangleMesh;
  }

  renderText(): THREE.Object3D {
    if (!this.showDistance) {
      return new THREE.Group();
    }

    // Position text with 150px offset from the end point, like other measurements
    const direction = this.endPoint.clone().sub(this.startPoint).normalize();
    const textPosition = this.endPoint.clone().add(direction.multiplyScalar(150));

    // Use the shared text rendering method
    return this.createTextMesh(this.getDisplayText(), textPosition);
  }

  updateShape(): void {
    // Override to handle rectangle-specific updates if needed
  }

  updateText(): void {
    // Override to handle rectangle-specific text updates if needed
  }

  dispose(): void {
    super.dispose();
    if (this.canvasGeometry) {
      this.canvasGeometry.dispose();
      this.canvasGeometry = null;
    }
    if (this.canvasMaterial) {
      this.canvasMaterial.dispose();
      this.canvasMaterial = null;
    }
  }
}
