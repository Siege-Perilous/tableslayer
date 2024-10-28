/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect } from 'postprocessing';
import * as THREE from 'three';
import type { WeatherProps } from '../layers/Weather/types';

import fragmentShader from '../shaders/WeatherShader.frag?raw';

export class WeatherEffect extends Effect {
  constructor(props: WeatherProps) {
    super('GridEffect', fragmentShader, {
      uniforms: new Map<string, THREE.Uniform<any>>([
        ['opacity', new THREE.Uniform(props.opacity)],
        ['scale', new THREE.Uniform(props.scale)],
        ['uResolution', new THREE.Uniform(new THREE.Vector2(0, 0))]
      ])
    });
  }

  updateProps(props: WeatherProps) {
    const uniforms = this.uniforms;
    uniforms.get('opacity')!.value = props.opacity;
    uniforms.get('scale')!.value = props.scale;
  }

  get resolution(): THREE.Vector2 {
    return this.uniforms.get('uResolution')?.value;
  }

  set resolution(value) {
    this.uniforms.get('uResolution')!.value = value;
  }
}
