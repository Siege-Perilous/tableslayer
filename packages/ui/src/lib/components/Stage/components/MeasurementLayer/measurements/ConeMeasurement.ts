import * as THREE from 'three';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle, drawCone } from '../utils/canvasDrawing';
import { BaseMeasurement } from './BaseMeasurement';

export class ConeMeasurement extends BaseMeasurement {
  private coneAngle: number;

  constructor(
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps,
    gridProps: any
  ) {
    super(MeasurementType.Cone, startPoint, measurementProps, displayProps, gridProps);
    this.coneAngle = measurementProps.coneAngle;
  }

  renderShape(): THREE.Object3D {
    // Dispose previous geometry and material using base class helper
    this.disposeCanvasResources();

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
    const context = canvas.getContext('2d')!;

    // Calculate canvas size - accommodate full cone plus padding
    const padding = Math.max(this.thickness * 4 + this.outlineThickness, 40);
    const canvasSize = (radius + padding) * 2;

    canvas.width = Math.max(canvasSize, 100);
    canvas.height = Math.max(canvasSize, 100);

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Canvas center coordinates
    const canvasCenterX = canvas.width / 2;
    const canvasCenterY = canvas.height / 2;

    // Draw cone using utility function
    if (radius > 0) {
      drawCone(
        context,
        canvasCenterX,
        canvasCenterY,
        radius,
        startAngle,
        endAngle,
        this.color,
        this.thickness,
        this.color,
        0.2,
        this.outlineThickness > 0 ? this.outlineColor : undefined,
        this.outlineThickness > 0 ? this.outlineThickness : undefined
      );
    }

    // Draw center point (cone origin)
    drawCircle(
      context,
      canvasCenterX,
      canvasCenterY,
      this.thickness * 2,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    // Draw point at the center of the cone's end arc (invert Y for canvas coordinates)
    const endPointX = canvasCenterX + Math.cos(centerAngle) * radius;
    const endPointY = canvasCenterY - Math.sin(centerAngle) * radius;
    drawCircle(context, endPointX, endPointY, this.thickness * 2, this.color, this.outlineColor, this.outlineThickness);

    // Draw points at the cone's edges (invert Y for canvas coordinates)
    const startEdgeX = canvasCenterX + Math.cos(startAngle) * radius;
    const startEdgeY = canvasCenterY - Math.sin(startAngle) * radius;
    drawCircle(
      context,
      startEdgeX,
      startEdgeY,
      this.thickness * 1.5,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    const endEdgeX = canvasCenterX + Math.cos(endAngle) * radius;
    const endEdgeY = canvasCenterY - Math.sin(endAngle) * radius;
    drawCircle(context, endEdgeX, endEdgeY, this.thickness * 1.5, this.color, this.outlineColor, this.outlineThickness);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane geometry for the cone
    this.canvasGeometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    this.canvasMaterial = this.createCanvasMaterial(texture);

    const coneMesh = new THREE.Mesh(this.canvasGeometry, this.canvasMaterial);
    // Position the mesh so the center aligns with the start point (cone origin)
    coneMesh.position.set(this.startPoint.x, this.startPoint.y, 0);

    return coneMesh;
  }
}
