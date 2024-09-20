<script lang="ts">
  import { onMount } from 'svelte';
  import * as THREE from 'three';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
  import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
  import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass';
  import { GridPass } from './effects/GridPass';
  import type StageProps from './StageProps';

  let canvas: HTMLCanvasElement;

  let props: StageProps = $props();

  let gridPass: GridPass;

  export const updateProps = (props: StageProps) => {
    gridPass.update(props.grid);
  };

  onMount(() => {
    // Scene, camera, and renderer setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);

    camera.position.z = 1.5; // Set camera a little further back

    // A simple object in the scene to demonstrate rendering (this will be post-processed)
    const boxGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    scene.add(box);

    // Set up EffectComposer for post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    gridPass = new GridPass(props.grid, new THREE.Vector2(canvas.clientWidth, canvas.clientHeight));
    composer.addPass(gridPass);

    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // Render loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Box rotation for demonstration
      box.rotation.x += 0.01;
      box.rotation.y += 0.01;

      // Render using EffectComposer
      composer.render();
    };
    animate();

    // Handle window resizing
    const handleResize = () => {
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      composer.setSize(canvas.clientWidth, canvas.clientHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<!-- The canvas element for Three.js rendering -->
<canvas bind:this={canvas}></canvas>

<style>
  canvas {
    width: 100%;
    height: 100%;
  }
</style>
