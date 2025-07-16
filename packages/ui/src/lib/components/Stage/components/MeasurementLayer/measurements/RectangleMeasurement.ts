import * as THREE from 'three';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle, drawRectangle } from '../utils/canvasDrawing';
import { BaseMeasurement } from './BaseMeasurement';

export class RectangleMeasurement extends BaseMeasurement {
  constructor(
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps,
    gridProps: any
  ) {
    super(MeasurementType.Square, startPoint, measurementProps, displayProps, gridProps);
  }

  getDisplayText(): string {
    const distance = this.getDistance();
    return `${distance.toFixed(1)} ${this.gridProps.worldGridUnits}`;
  }

  renderShape(): THREE.Object3D {
    // Dispose previous geometry and material using base class helper
    this.disposeCanvasResources();

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
    this.canvasMaterial = this.createCanvasMaterial(texture);

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
}
