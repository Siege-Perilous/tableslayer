import * as THREE from 'three';
import type { WeatherProps } from '../components/WeatherLayer/types';

import fragmentShader from '../shaders/WeatherShader.frag?raw';
import vertexShader from '../shaders/default.vert?raw';

export class WeatherMaterial extends THREE.ShaderMaterial {
  constructor(props: WeatherProps) {
    super({
      transparent: true,
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: new THREE.Uniform(0),
        uOpacity: new THREE.Uniform(props.opacity),
        uAngle: new THREE.Uniform(props.angle),
        uSpeed: new THREE.Uniform(props.speed),
        uIntensity: new THREE.Uniform(props.intensity),
        uScale: new THREE.Uniform(props.scale),
        uColor: new THREE.Uniform(props.color),
        uResolution: new THREE.Uniform(new THREE.Vector2(0, 0))
      }
    });
  }

  updateProps(props: WeatherProps) {
    this.uniforms.uOpacity.value = props.opacity;
    this.uniforms.uAngle.value = props.angle;
    this.uniforms.uSpeed.value = props.speed;
    this.uniforms.uScale.value = props.scale;
    this.uniforms.uIntensity.value = props.intensity;
    this.uniforms.uColor.value = props.color;
  }
}
