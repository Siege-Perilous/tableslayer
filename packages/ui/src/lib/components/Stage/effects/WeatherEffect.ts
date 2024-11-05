/* eslint-disable @typescript-eslint/no-explicit-any */
import { Effect } from 'postprocessing';
import * as THREE from 'three';
import type { WeatherProps } from '../layers/Weather/types';

import fragmentShader from '../shaders/WeatherShader.frag?raw';

export class WeatherEffect extends Effect {
  constructor(props: WeatherProps) {
    super('GridEffect', fragmentShader, {
      uniforms: new Map<string, THREE.Uniform<any>>([
        ['uOpacity', new THREE.Uniform(props.opacity)],
        ['uAngle', new THREE.Uniform(props.angle)],
        ['uSpeed', new THREE.Uniform(props.speed)],
        ['uIntensity', new THREE.Uniform(props.intensity)],
        ['uScale', new THREE.Uniform(props.scale)],
        ['uColor', new THREE.Uniform(props.color)],
        ['uResolution', new THREE.Uniform(new THREE.Vector2(0, 0))]
      ])
    });
  }

  updateProps(props: WeatherProps) {
    const uniforms = this.uniforms;
    uniforms.get('uOpacity')!.value = props.opacity;
    uniforms.get('uAngle')!.value = props.angle;
    uniforms.get('uSpeed')!.value = props.speed;
    uniforms.get('uScale')!.value = props.scale;
    uniforms.get('uIntensity')!.value = props.intensity;
    uniforms.get('uColor')!.value = props.color;
  }

  get resolution(): THREE.Vector2 {
    return this.uniforms.get('uResolution')?.value;
  }

  set resolution(value) {
    this.uniforms.get('uResolution')!.value = value;
  }
}
