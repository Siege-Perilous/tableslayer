<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size, useThrelte } from '@threlte/core';
  import type { FogOfWarProps } from './types';
  import { onMount } from 'svelte';

  let { props, scale }: { props: FogOfWarProps; scale: THREE.Vector3 } = $props();

  const { camera, renderer, size } = useThrelte();

  $inspect(size);

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let raycaster: THREE.Raycaster;
  let fogQuad = $state(new THREE.Mesh());
  let material: THREE.MeshBasicMaterial;
  let texture: THREE.CanvasTexture;

  let mouse = new THREE.Vector2();
  let drawing: boolean = false;
  let drawStartPos: THREE.Vector2 = new THREE.Vector2();

  onMount(() => {
    // Initialize raycaster
    raycaster = new THREE.Raycaster();

    // Event listeners for mouse interaction
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', stopDrawing);
    renderer.domElement.addEventListener('mousemove', onMouseMove);

    // Create a canvas element to draw on
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('2d')!;

    texture = new THREE.CanvasTexture(canvas);
    material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    fogQuad.material = material;
  });

  function onMouseDown(e: MouseEvent): void {
    mouse.x = (e.offsetX / $size.width) * 2 - 1;
    mouse.y = -(e.offsetY / $size.height) * 2 + 1;

    raycaster.setFromCamera(mouse, $camera);
    const intersects = raycaster.intersectObject(fogQuad);

    if (intersects.length > 0) {
      const { point } = intersects[0];
      const localPoint = fogQuad.worldToLocal(point);
      drawStartPos.set(canvas.width * (localPoint.x + 0.5), canvas.height * (-localPoint.y + 0.5));
      drawing = true;
    }
  }

  function stopDrawing(): void {
    drawing = false;
  }

  function onMouseMove(e: MouseEvent): void {
    mouse.x = (e.offsetX / $size.width) * 2 - 1;
    mouse.y = -(e.offsetY / $size.height) * 2 + 1;

    raycaster.setFromCamera(mouse, $camera);
    const intersects = raycaster.intersectObject(fogQuad);

    if (intersects.length > 0) {
      const { point } = intersects[0];
      const localPoint = fogQuad.worldToLocal(point);
      draw(canvas.width * (localPoint.x + 0.5), canvas.height * (-localPoint.y + 0.5));
    }
  }

  function draw(x: number, y: number): void {
    if (drawing && material?.map) {
      ctx.lineWidth = 50;
      ctx.lineCap = 'round';

      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = '#000000';

      ctx.moveTo(drawStartPos.x, drawStartPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();

      drawStartPos.set(x, y);

      texture.needsUpdate = true;
    }
  }

  $effect(() => {
    if (fogQuad) {
      fogQuad.scale.copy(scale);
      canvas.width = scale.x;
      canvas.height = scale.y;
      ctx.fillStyle = 'rgba(255, 255, 255, 255)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  });
</script>

<T.Mesh bind:ref={fogQuad} name="FogOfWar" position={[0, 0, -3]} rotation={[0, 0, 0]}>
  <T.PlaneGeometry />
</T.Mesh>
