import * as THREE from 'three';
import { SceneLayer, SceneLayerOrder } from '../../Scene/types';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle, drawLine } from '../utils/canvasDrawing';
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

  renderShape(): THREE.Object3D {
    // Dispose previous geometry and material using base class helper
    this.disposeCanvasResources();

    // Create canvas for the line
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Calculate the bounding box of the line
    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);

    // Add padding for line thickness and circles at endpoints
    const endpointRadius = (this.thickness + this.outlineThickness) * 2;
    const padding = Math.max(endpointRadius, 20);
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    canvas.width = width;
    canvas.height = height;

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';

    // Transform coordinates: Three.js world space -> Canvas space
    // Canvas origin is top-left, Three.js origin is center of the plane
    const startX = this.startPoint.x - minX + padding;
    const startY = canvas.height - (this.startPoint.y - minY + padding); // Invert Y
    const endX = this.endPoint.x - minX + padding;
    const endY = canvas.height - (this.endPoint.y - minY + padding); // Invert Y

    // Draw the line
    drawLine(context, startX, startY, endX, endY, this.color, this.thickness, this.outlineColor, this.outlineThickness);

    // Start point circle
    drawCircle(context, startX, startY, this.markerSize / 2, this.color, this.outlineColor, this.outlineThickness);

    // End point circle
    drawCircle(context, endX, endY, this.markerSize / 2, this.color, this.outlineColor, this.outlineThickness);

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane geometry for the line
    this.canvasGeometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    this.canvasMaterial = this.createCanvasMaterial(texture);

    const lineMesh = new THREE.Mesh(this.canvasGeometry, this.canvasMaterial);
    lineMesh.layers.set(SceneLayer.Overlay);
    lineMesh.renderOrder = SceneLayerOrder.Measurement;
    lineMesh.position.set(minX + width / 2 - padding, minY + height / 2 - padding, 0);

    return lineMesh;
  }
}
