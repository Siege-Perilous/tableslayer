import * as THREE from 'three';

// Create render targets for ping-pong buffer
export class BufferManager {
  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;
  current: THREE.WebGLRenderTarget;
  previous: THREE.WebGLRenderTarget;

  /**
   * Creates a new buffer manager
   * @param width - The width of the buffers
   * @param height - The height of the buffers
   */
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
    this.current = this.renderTargetA;
    this.previous = this.renderTargetB;
  }

  /**
   * Swaps the current and previous buffers
   */
  swap() {
    const temp = this.current;
    this.current = this.previous;
    this.previous = temp;
    console.log('swap');
  }

  /**
   * Renders both buffers with the current state
   * @param renderer - The renderer to use
   * @param scene - The scene to render
   * @param camera - The camera to render
   * @param persist - Whether to persist the changes to both buffers
   */
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, persist: boolean = false) {
    // First render to current buffer
    renderer.setRenderTarget(this.current);
    renderer.render(scene, camera);

    // Optionally render to previous buffer to persist changes
    if (persist) {
      this.swap();
    }

    // Reset render target
    renderer.setRenderTarget(null);
  }

  /**
   * Resizes the buffers
   * @param width - The width of the buffers
   * @param height - The height of the buffers
   */
  resize(width: number, height: number) {
    this.renderTargetA.setSize(width, height);
    this.renderTargetB.setSize(width, height);
  }

  /**
   * Disposes of the buffers
   */
  dispose() {
    this.renderTargetA.dispose();
    this.renderTargetB.dispose();
  }
}
