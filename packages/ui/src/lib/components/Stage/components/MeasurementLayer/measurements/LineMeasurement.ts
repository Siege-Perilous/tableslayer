import * as THREE from 'three';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle } from '../utils/canvasDrawing';
import { BaseMeasurement } from './BaseMeasurement';

export class LineMeasurement extends BaseMeasurement {
  constructor(
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps,
    gridProps: any
  ) {
    super(MeasurementType.Line, startPoint, measurementProps, displayProps, gridProps);
  }

  renderShape(): void {
    // Create canvas for the line
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { colorSpace: 'srgb' })!;

    // Calculate the bounding box of the line
    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);

    // Add padding for line thickness and circles at endpoints
    const endpointRadius = (this.markerSize + this.outlineThickness) * 2;
    const padding = Math.max(endpointRadius, 20);
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Transform coordinates: Three.js world space -> Canvas space
    // Canvas origin is top-left, Three.js origin is center of the plane
    const startX = this.startPoint.x - minX + padding;
    const startY = canvas.height - (this.startPoint.y - minY + padding); // Invert Y
    const endX = this.endPoint.x - minX + padding;
    const endY = canvas.height - (this.endPoint.y - minY + padding); // Invert Y

    // Draw the line with dashed pattern
    // First draw the outline if needed
    if (this.outlineThickness > 0) {
      context.strokeStyle = this.outlineColor;
      context.lineWidth = this.thickness + this.outlineThickness * 2;
      context.lineCap = 'round';
      context.lineJoin = 'round';

      // Set dash pattern for outline
      const dashLength = 20;
      const gapLength = 10;
      context.setLineDash([dashLength, gapLength]);

      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      context.stroke();
    }

    // Draw the main line with dashed pattern
    context.strokeStyle = this.color;
    context.lineWidth = this.thickness;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Set dash pattern - adjust based on line thickness for good visual proportion
    const dashLength = 20;
    const gapLength = 10;
    context.setLineDash([dashLength, gapLength]);

    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();

    // Reset dash pattern for other elements
    context.setLineDash([]);

    // Start point circle
    drawCircle(context, startX, startY, this.markerSize / 2, this.color, this.outlineColor, this.outlineThickness);

    // End point circle
    drawCircle(context, endX, endY, this.markerSize / 2, this.color, this.outlineColor, this.outlineThickness);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    this.updateShapeMesh(new THREE.PlaneGeometry(canvas.width, canvas.height), texture);
    this.shapeMesh.position.set(minX + width / 2 - padding, minY + height / 2 - padding, 0);
  }
}
