<script lang="ts">
  import * as THREE from 'three';
  import { useThrelte } from '@threlte/core';
  import { EffectComposer, EffectPass } from 'postprocessing';
  import { WeatherEffect } from '../../effects/WeatherEffect';
  import type { WeatherProps } from './types';

  let { props, composer }: { props: WeatherProps; composer: EffectComposer } = $props();

  const { camera, size } = useThrelte();

  const weatherEffect = new WeatherEffect(props);
  let weatherPass = $state(new EffectPass(undefined, weatherEffect));
  composer.addPass(weatherPass);

  $effect(() => {
    weatherEffect.resolution = new THREE.Vector2($size.width, $size.height);
    weatherPass.mainCamera = $camera;
    weatherEffect.updateProps(props);
  });
</script>
