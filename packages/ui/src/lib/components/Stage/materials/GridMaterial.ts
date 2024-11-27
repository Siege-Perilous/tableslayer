import * as THREE from 'three';
import type { GridLayerProps } from '../components/GridLayer/types';
import type { DisplayProps } from '../components/Stage/types';
import fragmentShader from '../shaders/GridShader.frag?raw';
import vertexShader from '../shaders/default.vert?raw';

export class GridMaterial extends THREE.ShaderMaterial {
  constructor(grid: GridLayerProps, display: DisplayProps) {
    super({
      transparent: true,
      vertexShader,
      fragmentShader,
      uniforms: {
        uOpacity: new THREE.Uniform(grid.opacity),
        uGridType: new THREE.Uniform(grid.gridType),
        uSpacing_in: new THREE.Uniform(grid.spacing),
        uPadding_px: new THREE.Uniform(display.padding),
        uLineThickness: new THREE.Uniform(grid.lineThickness),
        uLineColor: new THREE.Uniform(new THREE.Color(grid.lineColor)),
        uShadowIntensity: new THREE.Uniform(grid.shadowIntensity),
        uShadowSize: new THREE.Uniform(grid.shadowSize),
        uShadowColor: new THREE.Uniform(new THREE.Color(grid.shadowColor)),
        uSceneScale: new THREE.Uniform(1),
        uResolution_px: new THREE.Uniform(new THREE.Vector2(0, 0)),
        uDisplaySize_in: new THREE.Uniform(new THREE.Vector2(0, 0))
      }
    });
  }

  updateProps(grid: GridLayerProps, display: DisplayProps) {
    this.uniforms.uOpacity.value = grid.opacity;
    this.uniforms.uGridType.value = grid.gridType;
    this.uniforms.uSpacing_in.value = grid.spacing;
    this.uniforms.uPadding_px.value = display.padding;
    this.uniforms.uLineThickness.value = grid.lineThickness;
    this.uniforms.uLineColor.value = new THREE.Color(grid.lineColor);
    this.uniforms.uShadowIntensity.value = grid.shadowIntensity;
    this.uniforms.uShadowSize.value = grid.shadowSize;
    this.uniforms.uShadowColor.value = new THREE.Color(grid.shadowColor);
    this.uniforms.uResolution_px.value = new THREE.Vector2(display.resolution.x, display.resolution.y);
    this.uniforms.uDisplaySize_in.value = new THREE.Vector2(display.size.x, display.size.y);
  }
}
