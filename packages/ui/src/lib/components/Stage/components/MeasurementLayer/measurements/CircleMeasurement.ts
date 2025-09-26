import * as THREE from 'three';
import type { GridLayerProps } from '../../GridLayer/types';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle } from '../utils/canvasDrawing';
import { BaseMeasurement } from './BaseMeasurement';

export class CircleMeasurement extends BaseMeasurement {
  constructor(
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps,
    gridProps: GridLayerProps
  ) {
    super(MeasurementType.Circle, startPoint, measurementProps, displayProps, gridProps);
  }

  renderShape(): void {
    // Calculate radius in pixels
    const radiusPixels = this.startPoint.distanceTo(this.endPoint);

    // Create canvas for the circle
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { colorSpace: 'srgb' })!;

    // Calculate canvas size - need to accommodate the full circle plus outline and points
    const padding = Math.max(this.markerSize + this.outlineThickness, 40);
    const canvasSize = (radiusPixels + padding) * 2;

    canvas.width = Math.max(canvasSize, 100);
    canvas.height = Math.max(canvasSize, 100);

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Canvas center coordinates
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;

    // Draw the large circle with dashed pattern
    // First draw the fill
    context.fillStyle = this.color;
    context.globalAlpha = 0.2;
    context.beginPath();
    context.arc(canvasCenterX, canvasCenterY, radiusPixels, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1.0;

    // Draw the outline with dashed pattern if needed
    if (this.outlineThickness > 0) {
      context.strokeStyle = this.outlineColor;
      context.lineWidth = this.thickness + this.outlineThickness * 2;
      context.setLineDash([20, 10]); // Dashed pattern
      context.beginPath();
      context.arc(canvasCenterX, canvasCenterY, radiusPixels, 0, Math.PI * 2);
      context.stroke();
    }

    // Draw the main stroke with dashed pattern
    context.strokeStyle = this.color;
    context.lineWidth = this.thickness;
    context.setLineDash([20, 10]); // Dashed pattern
    context.beginPath();
    context.arc(canvasCenterX, canvasCenterY, radiusPixels, 0, Math.PI * 2);
    context.stroke();

    // Reset dash pattern for other elements
    context.setLineDash([]);

    // Draw center point
    drawCircle(
      context,
      canvasCenterX,
      canvasCenterY,
      this.markerSize / 2,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    // Draw radius indicator point at the edge of the circle
    // Calculate the position of the end point relative to start point, then place on circle edge
    const direction = this.endPoint.clone().sub(this.startPoint).normalize();
    const edgeX = canvasCenterX + direction.x * radiusPixels;
    const edgeY = canvasCenterY - direction.y * radiusPixels; // Invert Y for canvas coordinates
    drawCircle(context, edgeX, edgeY, this.markerSize / 2, this.color, this.outlineColor, this.outlineThickness);

    // Create texture from canvas
    const shapeTexture = new THREE.CanvasTexture(canvas);
    shapeTexture.needsUpdate = true;

    this.updateShapeMesh(new THREE.PlaneGeometry(canvas.width, canvas.height), shapeTexture);
    this.shapeMesh.position.set(this.startPoint.x, this.startPoint.y, 0);
  }
}
