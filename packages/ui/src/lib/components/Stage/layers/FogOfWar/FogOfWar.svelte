<script lang="ts">
  import * as THREE from 'three';
  import { T, type Size, useThrelte } from '@threlte/core';
  import type { FogOfWarProps } from './types';
  import { onMount } from 'svelte';

  let { props, scale }: { props: FogOfWarProps; scale: THREE.Vector3 } = $props();

  const { camera } = useThrelte();

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
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', stopDrawing);
    window.addEventListener('mousemove', onMouseMove);

    // Create a canvas element to draw on
    canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'rgba(255, 255, 255, 255)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    texture = new THREE.CanvasTexture(canvas);
    material = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    fogQuad.material = material;
  });

  function onMouseDown(event: MouseEvent): void {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, $camera);
    const intersects = raycaster.intersectObject(fogQuad);

    if (intersects.length > 0) {
      const { point } = intersects[0];
      const localPoint = fogQuad.worldToLocal(point);
      drawStartPos.set((0.5 + localPoint.x) * canvas.width, localPoint.y * canvas.height);
      console.log(localPoint);
      drawing = true;
    }
  }

  function stopDrawing(): void {
    drawing = false;
  }

  function onMouseMove(e: MouseEvent): void {
    if (drawing) {
      draw(e.offsetX, e.offsetY);
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
    }
  });
</script>

<T.Mesh bind:ref={fogQuad} position={[0, 0, -3]} rotation={[0, 0, 0]}>
  <T.PlaneGeometry />
</T.Mesh>
