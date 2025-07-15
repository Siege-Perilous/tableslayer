import * as THREE from 'three';
import { calculateLineDistance } from '../distanceCalculations';
import { MeasurementType } from '../types';
import { BaseMeasurement } from './BaseMeasurement';

export class LineMeasurement extends BaseMeasurement {
  private canvasGeometry: THREE.BufferGeometry | null = null;
  private canvasMaterial: THREE.MeshBasicMaterial | null = null;

  private displayProps: any;

  constructor(
    startPoint: THREE.Vector2,
    color: string,
    opacity: number,
    thickness: number,
    unit: string = 'ft',
    showDistance: boolean = true,
    displayProps: any
  ) {
    super(MeasurementType.Line, startPoint, color, opacity, thickness, unit, showDistance);
    this.displayProps = displayProps;
  }

  getDistance(): number {
    return calculateLineDistance(this.startPoint, this.endPoint);
  }

  renderShape(): THREE.Object3D {
    // Dispose previous geometry and material
    if (this.canvasGeometry) {
      this.canvasGeometry.dispose();
    }
    if (this.canvasMaterial) {
      this.canvasMaterial.dispose();
    }

    // Create canvas for the line
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Calculate the bounding box of the line
    const minX = Math.min(this.startPoint.x, this.endPoint.x);
    const maxX = Math.max(this.startPoint.x, this.endPoint.x);
    const minY = Math.min(this.startPoint.y, this.endPoint.y);
    const maxY = Math.max(this.startPoint.y, this.endPoint.y);

    // Add padding for line thickness and circles at endpoints
    const endpointRadius = this.thickness * 2;
    const padding = Math.max(this.thickness, endpointRadius, 20);
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    canvas.width = Math.max(width, 100); // Increased minimum width
    canvas.height = Math.max(height, 100); // Increased minimum height

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the line
    context.strokeStyle = this.color;
    context.lineWidth = this.thickness;
    context.lineCap = 'round';
    context.lineJoin = 'round';

    // Transform coordinates: Three.js world space -> Canvas space
    // Canvas origin is top-left, Three.js origin is center of the plane
    const startX = this.startPoint.x - minX + padding;
    const startY = canvas.height - (this.startPoint.y - minY + padding); // Invert Y
    const endX = this.endPoint.x - minX + padding;
    const endY = canvas.height - (this.endPoint.y - minY + padding); // Invert Y

    // Draw the line
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();

    // Draw circles at start and end points
    const circleRadius = this.thickness * 2;

    // Start point circle
    context.beginPath();
    context.arc(startX, startY, circleRadius, 0, Math.PI * 2);
    context.fillStyle = this.color;
    context.fill();

    // End point circle
    context.beginPath();
    context.arc(endX, endY, circleRadius, 0, Math.PI * 2);
    context.fillStyle = this.color;
    context.fill();

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane geometry for the line
    this.canvasGeometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    this.canvasMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: this.opacity,
      side: THREE.DoubleSide
    });

    const lineMesh = new THREE.Mesh(this.canvasGeometry, this.canvasMaterial);
    // Position the mesh so its center aligns with the center of the line area
    lineMesh.position.set(minX + width / 2 - padding, minY + height / 2 - padding, 0);

    return lineMesh;
  }

  renderText(): THREE.Object3D {
    if (!this.showDistance) {
      return new THREE.Group();
    }

    // Calculate text position (midpoint of the line)
    const midPoint = new THREE.Vector2(
      (this.startPoint.x + this.endPoint.x) / 2,
      (this.startPoint.y + this.endPoint.y) / 2
    );

    // Use the shared text rendering method
    return this.createTextMesh(this.getDisplayText(), midPoint, this.displayProps);
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
