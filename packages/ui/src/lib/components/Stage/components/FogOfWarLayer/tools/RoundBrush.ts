import * as THREE from 'three';
import type { Brush, DrawingTool } from './types';

export class RoundBrush implements DrawingTool, Brush {
  size: number;
  origin?: THREE.Vector2;
  brushTexture?: THREE.Texture | undefined;

  constructor(size: number) {
    this.size = size;

    const brushData = new Uint8Array(size * size * 4);
    brushData.fill(0);
    this.brushTexture = new THREE.DataTexture(
      brushData,
      size,
      size,
      THREE.RGBAFormat,
      THREE.UnsignedByteType,
      THREE.Texture.DEFAULT_MAPPING
    );

    console.log(this.brushTexture);
  }

  updateOverlay(e: MouseEvent) {
    const toolOverlay: HTMLDivElement | null = document.querySelector('.fog-tool-overlay');

    if (toolOverlay) {
      toolOverlay.style.left = `${e.clientX - this.size / 2}px`;
      toolOverlay.style.top = `${e.clientY - this.size / 2}px`;
    }
  }
}
