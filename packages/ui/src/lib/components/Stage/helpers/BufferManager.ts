import * as THREE from 'three';

// Create render targets for ping-pong buffer
export class BufferManager {
  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;
  private currentTarget: THREE.WebGLRenderTarget;
  private previousTarget: THREE.WebGLRenderTarget;

  constructor(width: number, height: number) {
    const options = {
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      alpha: true
    };

    this.renderTargetA = new THREE.WebGLRenderTarget(width, height, options);
    this.renderTargetB = new THREE.WebGLRenderTarget(width, height, options);
    this.currentTarget = this.renderTargetA;
    this.previousTarget = this.renderTargetB;
  }

  swap() {
    const temp = this.currentTarget;
    this.currentTarget = this.previousTarget;
    this.previousTarget = temp;
  }

  get current() {
    return this.currentTarget;
  }
  get previous() {
    return this.previousTarget;
  }

  resize(width: number, height: number) {
    this.renderTargetA.setSize(width, height);
    this.renderTargetB.setSize(width, height);
  }

  dispose() {
    this.renderTargetA.dispose();
    this.renderTargetB.dispose();
  }
}
