import * as THREE from 'three';
import type { GridLayerProps } from '../../GridLayer/types';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle } from '../utils/canvasDrawing';
import { BaseMeasurement } from './BaseMeasurement';

export class ConeMeasurement extends BaseMeasurement {
  private coneAngle: number;

  constructor(
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps,
    gridProps: GridLayerProps
  ) {
    super(MeasurementType.Cone, startPoint, measurementProps, displayProps, gridProps);
    this.coneAngle = measurementProps.coneAngle;
  }

  renderShape(): void {
    // Calculate cone parameters
    const radius = this.startPoint.distanceTo(this.endPoint);
    const direction = this.endPoint.clone().sub(this.startPoint);
    const centerAngle = Math.atan2(direction.y, direction.x);

    // Convert cone angle from degrees to radians and calculate start/end angles
    const coneAngleRad = (this.coneAngle * Math.PI) / 180;
    const startAngle = centerAngle - coneAngleRad / 2;
    const endAngle = centerAngle + coneAngleRad / 2;

    // Create canvas for the cone
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { colorSpace: 'srgb' })!;

    // Calculate canvas size - accommodate full cone plus padding
    const padding = Math.max(this.markerSize + this.outlineThickness, 40);
    const canvasSize = (radius + padding) * 2;

    canvas.width = Math.max(canvasSize, 100);
    canvas.height = Math.max(canvasSize, 100);

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Canvas center coordinates
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;

    // Draw cone with dashed pattern
    if (radius > 0) {
      // First draw the fill
      context.fillStyle = this.color;
      context.globalAlpha = 0.2;
      context.beginPath();
      context.moveTo(canvasCenterX, canvasCenterY);
      context.arc(canvasCenterX, canvasCenterY, radius, -startAngle, -endAngle, true);
      context.closePath();
      context.fill();
      context.globalAlpha = 1.0;

      // Draw the outline with dashed pattern if needed
      if (this.outlineThickness > 0) {
        context.strokeStyle = this.outlineColor;
        context.lineWidth = this.thickness + this.outlineThickness * 2;
        context.setLineDash([20, 10]); // Dashed pattern

        // Draw the arc
        context.beginPath();
        context.arc(canvasCenterX, canvasCenterY, radius, -startAngle, -endAngle, true);
        context.stroke();

        // Draw the sides
        context.beginPath();
        context.moveTo(canvasCenterX, canvasCenterY);
        context.lineTo(canvasCenterX + Math.cos(-startAngle) * radius, canvasCenterY + Math.sin(-startAngle) * radius);
        context.stroke();

        context.beginPath();
        context.moveTo(canvasCenterX, canvasCenterY);
        context.lineTo(canvasCenterX + Math.cos(-endAngle) * radius, canvasCenterY + Math.sin(-endAngle) * radius);
        context.stroke();
      }

      // Draw the main stroke with dashed pattern
      context.strokeStyle = this.color;
      context.lineWidth = this.thickness;
      context.setLineDash([20, 10]); // Dashed pattern

      // Draw the arc
      context.beginPath();
      context.arc(canvasCenterX, canvasCenterY, radius, -startAngle, -endAngle, true);
      context.stroke();

      // Draw the sides
      context.beginPath();
      context.moveTo(canvasCenterX, canvasCenterY);
      context.lineTo(canvasCenterX + Math.cos(-startAngle) * radius, canvasCenterY + Math.sin(-startAngle) * radius);
      context.stroke();

      context.beginPath();
      context.moveTo(canvasCenterX, canvasCenterY);
      context.lineTo(canvasCenterX + Math.cos(-endAngle) * radius, canvasCenterY + Math.sin(-endAngle) * radius);
      context.stroke();

      // Reset dash pattern for other elements
      context.setLineDash([]);
    }

    // Draw center point (cone origin)
    drawCircle(
      context,
      canvasCenterX,
      canvasCenterY,
      this.markerSize / 2,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    // Draw point at the center of the cone's end arc (invert Y for canvas coordinates)
    const endPointX = canvasCenterX + Math.cos(centerAngle) * radius;
    const endPointY = canvasCenterY - Math.sin(centerAngle) * radius;
    drawCircle(
      context,
      endPointX,
      endPointY,
      this.markerSize / 2,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    // Draw points at the cone's edges (invert Y for canvas coordinates)
    const startEdgeX = canvasCenterX + Math.cos(startAngle) * radius;
    const startEdgeY = canvasCenterY - Math.sin(startAngle) * radius;
    drawCircle(
      context,
      startEdgeX,
      startEdgeY,
      this.markerSize / 2,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    const endEdgeX = canvasCenterX + Math.cos(endAngle) * radius;
    const endEdgeY = canvasCenterY - Math.sin(endAngle) * radius;
    drawCircle(context, endEdgeX, endEdgeY, this.markerSize / 2, this.color, this.outlineColor, this.outlineThickness);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    this.updateShapeMesh(new THREE.PlaneGeometry(canvas.width, canvas.height), texture);

    // Position the cone at the start point (cone origin) in world coordinates
    this.shapeMesh.position.set(this.startPoint.x, this.startPoint.y, 0);
  }
}
