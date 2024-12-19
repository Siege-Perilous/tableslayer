import * as THREE from 'three';
import type { Brush, DrawingTool } from './types';

export class SquareBrush implements DrawingTool, Brush {
  size: number;
  brushTexture: THREE.DataTexture;

  constructor(size: number) {
    this.size = size;

    const brushData = new Uint8Array(size * size);
    brushData.fill(255);
    this.brushTexture = new THREE.DataTexture(brushData, size, size, THREE.RedFormat, THREE.UnsignedByteType);
  }

  updateOverlay(e: MouseEvent) {
    const toolOverlay: HTMLDivElement | null = document.querySelector('.fog-tool-overlay');

    if (toolOverlay) {
      toolOverlay.style.left = `${e.clientX}px`;
      toolOverlay.style.top = `${e.clientY}px`;
    }
  }
}
