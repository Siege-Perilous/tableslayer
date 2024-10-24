import * as THREE from 'three';
import type { DrawingTool } from './types';

export class Ellipse implements DrawingTool {
  context: CanvasRenderingContext2D;
  origin?: THREE.Vector2;

  constructor(context: CanvasRenderingContext2D) {
    this.context = context;
  }

  reset() {}

  draw(p: THREE.Vector2) {
    if (!this.origin) return;

    const r = this.getRadius(p);
    this.context.beginPath();
    this.context.ellipse(this.origin.x + r.x, this.origin.y + r.y, r.x, r.y, 0, 0, 2 * Math.PI);
    this.context.fill();
  }

  drawOutline(p: THREE.Vector2) {
    if (!this.origin) return;

    const r = this.getRadius(p);
    this.context.beginPath();
    this.context.ellipse(this.origin.x + r.x, this.origin.y + r.y, r.x, r.y, 0, 0, 2 * Math.PI);
    this.context.fill();
  }

  getRadius(p: THREE.Vector2): THREE.Vector2 {
    if (!this.origin) return new THREE.Vector2();

    return new THREE.Vector2(Math.abs(p.x - this.origin.x) / 2, Math.abs(p.y - this.origin.y) / 2);
  }
}
