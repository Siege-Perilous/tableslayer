import * as THREE from 'three';

// Create render targets for ping-pong buffer
export class BufferManager {
  private renderer: THREE.WebGLRenderer;
  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;
  private onRender?: (current: THREE.WebGLRenderTarget) => void;
  current: THREE.WebGLRenderTarget;
  previous: THREE.WebGLRenderTarget;

  /**
   * Creates a new buffer manager
   * @param width - The width of the buffers
   * @param height - The height of the buffers
   */
  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    onRender?: (current: THREE.WebGLRenderTarget) => void
  ) {
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

    this.renderer = renderer;
    this.renderTargetA = new THREE.WebGLRenderTarget(width, height, options);
    this.renderTargetB = new THREE.WebGLRenderTarget(width, height, options);
    this.current = this.renderTargetA;
    this.previous = this.renderTargetB;
    this.onRender = onRender;
  }

  /**
   * Swaps the current and previous buffers
   */
  persistChanges() {
    const temp = this.current;
    this.current = this.previous;
    this.previous = temp;
  }

  /**
   * Renders both buffers with the current state
   * @param scene - The scene to render
   * @param camera - The camera to render
   * @param persist - Whether to persist the changes to both buffers
   */
  render(scene: THREE.Scene, camera: THREE.Camera) {
    // First render to current buffer
    this.renderer.setRenderTarget(this.current);
    this.renderer.render(scene, camera);
    this.onRender?.(this.current);
    this.renderer.setRenderTarget(null);
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
