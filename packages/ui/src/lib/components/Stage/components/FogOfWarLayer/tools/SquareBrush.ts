import * as THREE from 'three';
import type { Brush, DrawingTool } from './types';

export class SquareBrush implements DrawingTool, Brush {
  size: number;
  context: CanvasRenderingContext2D;

  constructor(size: number, context: CanvasRenderingContext2D) {
    this.size = size;
    this.context = context;
  }

  reset() {}

  draw(p: THREE.Vector2) {
    this.context.fillRect(p.x - this.size / 2, p.y - this.size / 2, this.size, this.size);
  }

  updateOverlay(e: MouseEvent, p: THREE.Vector2) {
    this.context.fillRect(p.x - this.size / 2, p.y - this.size / 2, this.size, this.size);
  }
}
