<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import { AnnotationEffect } from '../Stage/components/AnnotationLayer/types';

  import annotationEffectsFragmentShader from '../Stage/shaders/AnnotationEffects.frag?raw';
  import annotationVertexShader from '../Stage/shaders/default.vert?raw';

  interface Props {
    effectType: AnnotationEffect;
  }

  const { effectType }: Props = $props();

  // Create circular mask texture with mipmaps
  // Use 512x512 to match shader expectations for texSize calculations
  const createCircularMaskTexture = (): THREE.DataTexture => {
    const textureSize = 512;
    const data = new Uint8Array(textureSize * textureSize * 4);

    const center = textureSize / 2;
    const radius = textureSize / 2 - 4; // Slight inset for smooth edges

    for (let y = 0; y < textureSize; y++) {
      for (let x = 0; x < textureSize; x++) {
        const dx = x - center;
        const dy = y - center;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Smooth anti-aliased edge
        const edge = 1.0 - Math.max(0, Math.min(1, (dist - radius + 2) / 4));
        const value = Math.floor(edge * 255);

        const idx = (y * textureSize + x) * 4;
        data[idx] = value;
        data[idx + 1] = value;
        data[idx + 2] = value;
        data[idx + 3] = value;
      }
    }

    const texture = new THREE.DataTexture(data, textureSize, textureSize, THREE.RGBAFormat);
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    return texture;
  };

  const maskTexture = createCircularMaskTexture();
  console.log('EffectPreview maskTexture created:', {
    width: maskTexture.image.width,
    height: maskTexture.image.height,
    generateMipmaps: maskTexture.generateMipmaps,
    minFilter: maskTexture.minFilter,
    magFilter: maskTexture.magFilter
  });

  const getEffectColor = (effect: AnnotationEffect): THREE.Vector3 => {
    switch (effect) {
      case AnnotationEffect.Fire:
        return new THREE.Vector3(1.0, 0.3, 0.1);
      case AnnotationEffect.Water:
        return new THREE.Vector3(0.2, 0.5, 0.8);
      case AnnotationEffect.Ice:
        return new THREE.Vector3(0.7, 0.85, 1.0);
      case AnnotationEffect.Magic:
        return new THREE.Vector3(0.6, 0.3, 0.9);
      case AnnotationEffect.Grease:
        return new THREE.Vector3(0.3, 0.2, 0.1);
      case AnnotationEffect.SpaceTear:
        return new THREE.Vector3(0.2, 0.0, 0.4);
      default:
        return new THREE.Vector3(1.0, 1.0, 1.0);
    }
  };

  const emptyClippingPlanes = [
    new THREE.Vector4(0, 0, 0, 0),
    new THREE.Vector4(0, 0, 0, 0),
    new THREE.Vector4(0, 0, 0, 0),
    new THREE.Vector4(0, 0, 0, 0)
  ];

  // Replace NUM_CLIPPING_PLANES with 4 directly in the shader source
  // This is needed because Three.js replaces this token before processing defines
  const fragmentShaderFixed = annotationEffectsFragmentShader.replace(/NUM_CLIPPING_PLANES/g, '4');

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMaskTexture: { value: maskTexture },
      uTime: { value: 0.0 },
      uEffectType: { value: effectType },
      uBaseColor: { value: getEffectColor(effectType) },
      uOpacity: { value: 1.0 },
      uSpeed: { value: 0.5 },
      uIntensity: { value: 1.0 },
      uSoftness: { value: 0.5 },
      uBorder: { value: 0.5 },
      uRoughness: { value: 0.3 },
      uEdgeMinMipMapLevel: { value: 0 },
      uEdgeMaxMipMapLevel: { value: 4 },
      uClippingPlanes: { value: emptyClippingPlanes }
    },
    transparent: true,
    fragmentShader: fragmentShaderFixed,
    vertexShader: annotationVertexShader,
    clipping: false
  });

  console.log('EffectPreview material created:', {
    effectType,
    uniforms: {
      uEffectType: material.uniforms.uEffectType.value,
      uOpacity: material.uniforms.uOpacity.value,
      uIntensity: material.uniforms.uIntensity.value,
      uSoftness: material.uniforms.uSoftness.value,
      uBorder: material.uniforms.uBorder.value
    }
  });

  $effect(() => {
    material.uniforms.uEffectType.value = effectType;
    material.uniforms.uBaseColor.value = getEffectColor(effectType);
    material.uniformsNeedUpdate = true;
  });

  // Animate the effect
  useTask((delta) => {
    material.uniforms.uTime.value += delta;
  });
</script>

<T.OrthographicCamera
  makeDefault
  manual
  position.z={1}
  oncreate={(ref) => {
    // Force camera frustum to match our 2x2 plane
    ref.left = -1;
    ref.right = 1;
    ref.top = 1;
    ref.bottom = -1;
    ref.near = 0.1;
    ref.far = 10;
    ref.updateProjectionMatrix();
    console.log('EffectPreview Camera after manual setup:', {
      left: ref.left,
      right: ref.right,
      top: ref.top,
      bottom: ref.bottom
    });
  }}
/>
<T.Mesh
  oncreate={(ref) => {
    console.log('EffectPreview Mesh created:', {
      geometry: ref.geometry,
      geometryParams: (ref.geometry as THREE.PlaneGeometry).parameters,
      material: ref.material,
      position: ref.position.toArray(),
      scale: ref.scale.toArray()
    });
  }}
>
  <T.PlaneGeometry args={[2, 2]} />
  <T is={material} />
</T.Mesh>
