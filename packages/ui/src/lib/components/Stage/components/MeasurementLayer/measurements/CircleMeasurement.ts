import * as THREE from 'three';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle, drawLargeCircle } from '../utils/canvasDrawing';
import { BaseMeasurement } from './BaseMeasurement';

export class CircleMeasurement extends BaseMeasurement {
  constructor(
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps,
    gridProps: any
  ) {
    super(MeasurementType.Circle, startPoint, measurementProps, displayProps, gridProps);
  }

  getDisplayText(): string {
    const radius = this.getDistance();
    return `${radius.toFixed(1)} ${this.gridProps.worldGridUnits}`;
  }

  renderShape(): THREE.Object3D {
    // Dispose previous geometry and material using base class helper
    this.disposeCanvasResources();

    // Calculate radius in pixels
    const radiusPixels = this.startPoint.distanceTo(this.endPoint);

    // Create canvas for the circle
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Calculate canvas size - need to accommodate the full circle plus outline and points
    const padding = Math.max(this.thickness * 4 + this.outlineThickness, 40);
    const canvasSize = (radiusPixels + padding) * 2;

    canvas.width = Math.max(canvasSize, 100);
    canvas.height = Math.max(canvasSize, 100);

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Canvas center coordinates
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;

    // Draw the large circle with fill and stroke using utility function
    drawLargeCircle(
      context,
      canvasCenterX,
      canvasCenterY,
      radiusPixels,
      this.color,
      this.thickness,
      this.color,
      0.2,
      this.outlineThickness > 0 ? this.outlineColor : undefined,
      this.outlineThickness > 0 ? this.outlineThickness : undefined
    );

    // Draw center point
    drawCircle(
      context,
      canvasCenterX,
      canvasCenterY,
      this.thickness * 2,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    // Draw radius indicator point at the edge of the circle
    // Calculate the position of the end point relative to start point, then place on circle edge
    const direction = this.endPoint.clone().sub(this.startPoint).normalize();
    const edgeX = canvasCenterX + direction.x * radiusPixels;
    const edgeY = canvasCenterY - direction.y * radiusPixels; // Invert Y for canvas coordinates
    drawCircle(context, edgeX, edgeY, this.thickness * 2, this.color, this.outlineColor, this.outlineThickness);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane geometry for the circle
    this.canvasGeometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    this.canvasMaterial = this.createCanvasMaterial(texture);

    const circleMesh = new THREE.Mesh(this.canvasGeometry, this.canvasMaterial);
    // Position the mesh so the center aligns with the start point (circle center)
    circleMesh.position.set(this.startPoint.x, this.startPoint.y, 0);

    return circleMesh;
  }
}
