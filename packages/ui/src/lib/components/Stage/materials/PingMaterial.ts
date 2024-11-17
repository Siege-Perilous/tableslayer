import * as THREE from 'three';
import type { PingLayerProps } from '../components/PingLayer/types';

import fragmentShader from '../shaders/PingShader.frag?raw';
import vertexShader from '../shaders/PingShader.vert?raw';

export class PingMaterial extends THREE.ShaderMaterial {
  constructor(props: PingLayerProps) {
    super({
      transparent: true,
      vertexShader,
      fragmentShader,
      uniforms: {
        uTime: new THREE.Uniform(0),
        uColor: new THREE.Uniform(props.color),
        uOpacity: new THREE.Uniform(props.opacity),
        uPulseSpeed: new THREE.Uniform(props.pulseSpeed),
        uPulseAmplitude: new THREE.Uniform(props.pulseAmplitude),
        uSharpness: new THREE.Uniform(props.sharpness),
        uThickness: new THREE.Uniform(props.thickness)
      }
    });
  }

  updateProps(props: PingLayerProps) {
    this.uniforms.uColor.value = props.color;
    this.uniforms.uOpacity.value = props.opacity;
    this.uniforms.uPulseSpeed.value = props.pulseSpeed;
    this.uniforms.uPulseAmplitude.value = props.pulseAmplitude;
    this.uniforms.uSharpness.value = props.sharpness;
    this.uniforms.uThickness.value = props.thickness;
  }
}
