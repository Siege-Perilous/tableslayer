<script lang="ts">
  import * as THREE from 'three';
  import { T, useLoader, type Props as ThrelteProps } from '@threlte/core';
  import { TextureLoader } from 'three';
  import type { EdgeOverlayProps } from './types';
  import type { DisplayProps } from '../Stage/types';
  import { SceneLayer } from '../Scene/types';

  import vertexShader from '../../shaders/default.vert?raw';
  import fragmentShader from '../../shaders/Overlay.frag?raw';

  interface Props extends ThrelteProps<typeof THREE.Mesh> {
    props: EdgeOverlayProps;
    display: DisplayProps;
  }

  const { props, display, ...meshProps }: Props = $props();
  const loader = useLoader(TextureLoader);
  let texture: THREE.Texture | undefined = $state();

  // Load texture when URL changes
  $effect(() => {
    if (!props.url) return;

    loader
      .load(props.url, {
        transform: (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          return tex;
        }
      })
      .then((tex) => {
        texture = tex;
      });
  });

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: null },
      uResolution: { value: new THREE.Vector2(display.resolution.x, display.resolution.y) },
      uOpacity: { value: props.opacity },
      uFadeStart: { value: props.fadeStart },
      uFadeEnd: { value: props.fadeEnd },
      uScale: { value: props.scale }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false
  });

  // Update uniforms when props change
  $effect(() => {
    material.uniforms.uTexture.value = texture;
    material.uniforms.uOpacity.value = props.opacity;
    material.uniforms.uFadeStart.value = props.fadeStart;
    material.uniforms.uFadeEnd.value = props.fadeEnd;
    material.uniforms.uScale.value = props.scale;
  });
</script>

<T.Mesh
  name="gridLayer"
  scale={[display.resolution.x, display.resolution.y, 1]}
  layers={[SceneLayer.Overlay]}
  {...meshProps}
>
  <T.ShaderMaterial is={material} />
  <T.PlaneGeometry />
</T.Mesh>
