import * as THREE from 'three';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle } from '../utils/canvasDrawing';
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
    // Calculate the distance from center to mouse position
    const distance = this.startPoint.distanceTo(this.endPoint);

    // For a square, use the same distance for both width and height
    // This creates a square where the distance from center to edge equals the distance to the mouse
    const halfSize = distance;
    const squareSize = halfSize * 2;

    // Create canvas for the square
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { colorSpace: 'srgb' })!;

    // Add padding for outline and corner points
    const padding = Math.max(this.markerSize + this.outlineThickness, 40);
    const canvasSize = squareSize + padding * 2;

    canvas.width = Math.max(canvasSize, 100);
    canvas.height = Math.max(canvasSize, 100);

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Canvas center coordinates
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;

    // Calculate square position on canvas (centered)
    const rectX = canvasCenterX - halfSize;
    const rectY = canvasCenterY - halfSize;

    // Draw square with dashed pattern
    if (squareSize > 0) {
      // First draw the fill
      context.fillStyle = this.color;
      context.globalAlpha = 0.2;
      context.fillRect(rectX, rectY, squareSize, squareSize);
      context.globalAlpha = 1.0;

      // Draw the outline with dashed pattern if needed
      if (this.outlineThickness > 0) {
        context.strokeStyle = this.outlineColor;
        context.lineWidth = this.thickness + this.outlineThickness * 2;
        context.setLineDash([20, 10]); // Dashed pattern
        context.strokeRect(rectX, rectY, squareSize, squareSize);
      }

      // Draw the main stroke with dashed pattern
      context.strokeStyle = this.color;
      context.lineWidth = this.thickness;
      context.setLineDash([20, 10]); // Dashed pattern
      context.strokeRect(rectX, rectY, squareSize, squareSize);

      // Reset dash pattern for other elements
      context.setLineDash([]);
    }

    // Draw center point (like circle measurement)
    drawCircle(
      context,
      canvasCenterX,
      canvasCenterY,
      this.markerSize / 2,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    // Draw corner points
    const cornerRadius = this.markerSize / 2;

    // Top-left corner
    drawCircle(context, rectX, rectY, cornerRadius, this.color, this.outlineColor, this.outlineThickness);

    // Top-right corner
    drawCircle(context, rectX + squareSize, rectY, cornerRadius, this.color, this.outlineColor, this.outlineThickness);

    // Bottom-right corner
    drawCircle(
      context,
      rectX + squareSize,
      rectY + squareSize,
      cornerRadius,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    // Bottom-left corner
    drawCircle(context, rectX, rectY + squareSize, cornerRadius, this.color, this.outlineColor, this.outlineThickness);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    this.updateShapeMesh(new THREE.PlaneGeometry(canvas.width, canvas.height), texture);

    // Position the square at the center point (startPoint), like circle measurement
    this.shapeMesh.position.set(this.startPoint.x, this.startPoint.y, 0);
  }
}
