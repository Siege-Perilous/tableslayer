import * as THREE from 'three';
import type { Brush, DrawingTool } from './types';

export class RoundBrush implements DrawingTool, Brush {
  size: number;
  context: CanvasRenderingContext2D;
  origin?: THREE.Vector2;

  constructor(size: number, context: CanvasRenderingContext2D) {
    this.size = size;
    this.context = context;
  }

  draw(p: THREE.Vector2) {
    this.context.lineWidth = this.size;
    this.context.lineCap = 'round';

    if (!this.origin) {
      this.origin = p;
    }

    this.context.beginPath();
    this.context.moveTo(this.origin.x, this.origin.y);
    this.context.lineTo(p.x, p.y);
    this.context.stroke();
    this.context.closePath();

    this.origin.copy(p);
  }

  drawOutline(p: THREE.Vector2) {
    this.context.beginPath();
    this.context.ellipse(p.x, p.y, this.size / 2, this.size / 2, 0, 0, 2 * Math.PI);
    this.context.fill();
  }
}
