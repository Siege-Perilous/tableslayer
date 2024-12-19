import * as THREE from 'three';
import type { DrawingTool } from './types';

export class Rectangle implements DrawingTool {
  origin?: THREE.Vector2;

  constructor() {}

  draw(p: THREE.Vector2) {
    if (!this.origin) return;
    //this.context.fillRect(this.origin.x, this.origin.y, p.x - this.origin.x, p.y - this.origin.y);
  }

  updateOverlay(e: MouseEvent, p: THREE.Vector2) {
    if (!this.origin) return;
    //this.context.fillRect(this.origin.x, this.origin.y, p.x - this.origin.x, p.y - this.origin.y);
  }
}
