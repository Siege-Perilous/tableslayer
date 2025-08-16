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

  renderShape(): void {
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
    const padding = Math.max(this.markerSize + this.outlineThickness, 40);

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
    const cornerRadius = this.markerSize / 2;

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

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    this.updateShapeMesh(new THREE.PlaneGeometry(canvas.width, canvas.height), texture);

    // Position the rectangle at its true center point
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    this.shapeMesh.position.set(centerX, centerY, 0);
  }
}
