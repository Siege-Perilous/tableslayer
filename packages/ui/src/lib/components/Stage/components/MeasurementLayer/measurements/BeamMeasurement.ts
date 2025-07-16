import * as THREE from 'three';
import { SceneLayer, SceneLayerOrder } from '../../Scene/types';
import type { DisplayProps } from '../../Stage/types';
import { MeasurementType, type MeasurementLayerProps } from '../types';
import { drawCircle, drawRectangle } from '../utils/canvasDrawing';
import { BaseMeasurement } from './BaseMeasurement';

export class BeamMeasurement extends BaseMeasurement {
  private beamWidth: number;

  constructor(
    startPoint: THREE.Vector2,
    measurementProps: MeasurementLayerProps,
    displayProps: DisplayProps,
    gridProps: any
  ) {
    super(MeasurementType.Beam, startPoint, measurementProps, displayProps, gridProps);
    this.beamWidth = measurementProps.beamWidth;
  }

  renderShape(): THREE.Object3D {
    // Dispose previous geometry and material using base class helper
    this.disposeCanvasResources();

    // Calculate beam parameters
    const direction = this.endPoint.clone().sub(this.startPoint);
    const length = direction.length();
    const angle = Math.atan2(direction.y, direction.x);

    // Convert beam width from world units to pixels
    const pixelsPerInch = this.displayProps.resolution.x / this.displayProps.size.x;
    const beamWidthInches = (this.beamWidth * this.gridProps.spacing) / this.gridProps.worldGridSize;
    const beamWidthPixels = beamWidthInches * pixelsPerInch;

    // Create canvas for the beam
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    // Calculate canvas size - accommodate beam dimensions plus padding
    const padding = Math.max(this.markerSize + this.outlineThickness + beamWidthPixels, 40);
    const canvasWidth = length + padding * 2;
    const canvasHeight = beamWidthPixels + padding * 2;

    canvas.width = Math.max(canvasWidth, 100);
    canvas.height = Math.max(canvasHeight, 100);

    // Clear canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Save context and apply rotation
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);

    // Calculate rectangle dimensions centered on canvas
    const rectX = -length / 2;
    const rectY = -beamWidthPixels / 2;
    const rectWidth = length;
    const rectHeight = beamWidthPixels;

    // Draw beam rectangle using utility function
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

    // Draw start point circle
    drawCircle(context, rectX, 0, this.markerSize / 2, this.color, this.outlineColor, this.outlineThickness);

    // Draw end point circle
    drawCircle(
      context,
      rectX + rectWidth,
      0,
      this.markerSize / 2,
      this.color,
      this.outlineColor,
      this.outlineThickness
    );

    // Restore context
    context.restore();

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    // Create plane geometry for the beam
    this.canvasGeometry = new THREE.PlaneGeometry(canvas.width, canvas.height);
    this.canvasMaterial = this.createCanvasMaterial(texture);

    const beamMesh = new THREE.Mesh(this.canvasGeometry, this.canvasMaterial);
    beamMesh.layers.set(SceneLayer.Overlay);
    beamMesh.renderOrder = SceneLayerOrder.Measurement;

    // Position and rotate the mesh
    const centerX = (this.startPoint.x + this.endPoint.x) / 2;
    const centerY = (this.startPoint.y + this.endPoint.y) / 2;
    beamMesh.position.set(centerX, centerY, 0);
    beamMesh.rotation.z = angle;

    return beamMesh;
  }
}
