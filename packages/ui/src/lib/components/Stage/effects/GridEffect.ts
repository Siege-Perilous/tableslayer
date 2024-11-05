/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect } from 'postprocessing';
import * as THREE from 'three';
import type { GridProps } from '../components/GridLayer/types';

import fragmentShader from '../shaders/GridShader.frag?raw';

export class GridEffect extends Effect {
  constructor(props: GridProps) {
    super('GridEffect', fragmentShader, {
      uniforms: new Map<string, THREE.Uniform<any>>([
        ['gridType', new THREE.Uniform(props.gridType)],
        ['opacity', new THREE.Uniform(props.opacity)],
        ['spacing', new THREE.Uniform(props.spacing)],
        ['offset', new THREE.Uniform(props.offset)],
        ['lineThickness', new THREE.Uniform(props.lineThickness)],
        ['lineColor', new THREE.Uniform(props.lineColor)],
        ['shadowIntensity', new THREE.Uniform(props.shadowIntensity)],
        ['shadowSize', new THREE.Uniform(props.shadowSize)],
        ['shadowColor', new THREE.Uniform(props.shadowColor)],
        ['uResolution', new THREE.Uniform(new THREE.Vector2(0, 0))]
      ])
    });
  }

  updateProps(props: GridProps) {
    const uniforms = this.uniforms;
    uniforms.get('gridType')!.value = props.gridType;
    uniforms.get('opacity')!.value = props.opacity;
    uniforms.get('spacing')!.value = props.spacing;
    uniforms.get('offset')!.value = props.offset;
    uniforms.get('lineThickness')!.value = props.lineThickness;
    uniforms.get('lineColor')!.value = props.lineColor;
    uniforms.get('shadowIntensity')!.value = props.shadowIntensity;
    uniforms.get('shadowSize')!.value = props.shadowSize;
    uniforms.get('shadowColor')!.value = props.shadowColor;
  }

  get resolution(): THREE.Vector2 {
    return this.uniforms.get('uResolution')?.value;
  }

  set resolution(value) {
    this.uniforms.get('uResolution')!.value = value;
  }
}
