import * as THREE from 'three';
import type { DrawingTool } from './types';

export class Rectangle implements DrawingTool {
  context: CanvasRenderingContext2D;
  origin?: THREE.Vector2;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  draw(p: THREE.Vector2) {
    if (!this.origin) return;
    this.context.fillRect(this.origin.x, this.origin.y, p.x - this.origin.x, p.y - this.origin.y);
  }

  drawOutline(p: THREE.Vector2) {
    if (!this.origin) return;
    this.context.fillRect(this.origin.x, this.origin.y, p.x - this.origin.x, p.y - this.origin.y);
  }
}
