import * as THREE from 'three';
import { Ellipse } from './Ellipse';
import { Rectangle } from './Rectangle';
import { RoundBrush } from './RoundBrush';
import { SquareBrush } from './SquareBrush';

export interface DrawingTool {
  origin?: THREE.Vector2;
  size?: number;
  brushTexture?: THREE.Texture;
  updateOverlay(e: MouseEvent, p: THREE.Vector2): void;
}

export interface Brush {
  size: number;
}

export const Tool = {
  RoundBrush,
  SquareBrush,
  Ellipse,
  Rectangle
};
