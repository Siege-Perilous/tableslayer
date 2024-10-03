<script lang="ts">
  import * as THREE from 'three';
  import { useThrelte } from '@threlte/core';
  import { EffectComposer, EffectPass } from 'postprocessing';
  import { GridEffect } from '../../effects/GridEffect';
  import type { GridProps } from './types';

  let { props, composer }: { props: GridProps; composer: EffectComposer } = $props();

  const { camera, size } = useThrelte();

  const gridEffect = new GridEffect(props);
  let gridPass = $state(new EffectPass(undefined, gridEffect));
  composer.addPass(gridPass);

  $effect(() => {
    gridEffect.resolution = new THREE.Vector2($size.width, $size.height);
    gridPass.mainCamera = $camera;
    gridEffect.updateProps(props);
  });
</script>
