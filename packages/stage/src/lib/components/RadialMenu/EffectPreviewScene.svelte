<script lang="ts">
  import * as THREE from 'three';
  import { T, useTask } from '@threlte/core';
  import { AnnotationEffect, getDefaultEffectProps } from '../Stage/components/AnnotationLayer/types';

  import annotationEffectsFragmentShader from '../Stage/shaders/AnnotationEffects.frag?raw';
  import annotationVertexShader from '../Stage/shaders/default.vert?raw';

  interface Props {
    effectType: AnnotationEffect;
    shape?: 'circle' | 'rounded';
  }

  const { effectType, shape = 'circle' }: Props = $props();

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

  // Create rounded square mask texture with mipmaps
  const createRoundedSquareMaskTexture = (): THREE.DataTexture => {
    const textureSize = 512;
    const data = new Uint8Array(textureSize * textureSize * 4);

    const inset = 4; // Slight inset for smooth edges
    const halfSize = textureSize / 2 - inset;
    const cornerRadius = textureSize * 0.15; // ~15% corner radius

    // Signed distance function for rounded rectangle
    const sdRoundedBox = (px: number, py: number, bx: number, by: number, r: number): number => {
      const qx = Math.abs(px) - bx + r;
      const qy = Math.abs(py) - by + r;
      const outsideDist = Math.sqrt(Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2);
      const insideDist = Math.min(Math.max(qx, qy), 0);
      return outsideDist + insideDist - r;
    };

    for (let y = 0; y < textureSize; y++) {
      for (let x = 0; x < textureSize; x++) {
        const px = x - textureSize / 2;
        const py = y - textureSize / 2;

        const dist = sdRoundedBox(px, py, halfSize, halfSize, cornerRadius);

        // Smooth anti-aliased edge
        const edge = 1.0 - Math.max(0, Math.min(1, (dist + 2) / 4));
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

  const maskTexture = shape === 'rounded' ? createRoundedSquareMaskTexture() : createCircularMaskTexture();

  const getEffectColor = (effect: AnnotationEffect): THREE.Vector3 => {
    switch (effect) {
      case AnnotationEffect.Fire:
        return new THREE.Vector3(1.0, 0.3, 0.1);
      case AnnotationEffect.Water:
        return new THREE.Vector3(0.2, 0.5, 0.8);
      case AnnotationEffect.Ice:
        return new THREE.Vector3(0.7, 0.85, 1.0);
      case AnnotationEffect.Magic:
        // Saturated purple (#9333ea) to match AnnotationMaterial
        return new THREE.Vector3(0.576, 0.2, 0.918);
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

  // Get effect defaults and adjust for small preview size
  const effectProps = getDefaultEffectProps(effectType);
  // Reduce border effect for small previews to avoid artifacts
  const previewBorder = Math.min(effectProps.border, 0.2);

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uMaskTexture: { value: maskTexture },
      uTime: { value: 0.0 },
      uEffectType: { value: effectType },
      uBaseColor: { value: getEffectColor(effectType) },
      uOpacity: { value: 1.0 },
      uSpeed: { value: effectProps.speed },
      uIntensity: { value: effectProps.intensity },
      uSoftness: { value: effectProps.softness },
      uBorder: { value: previewBorder },
      uRoughness: { value: effectProps.roughness },
      uEdgeMinMipMapLevel: { value: 0 },
      uEdgeMaxMipMapLevel: { value: 4 },
      uClippingPlanes: { value: emptyClippingPlanes }
    },
    transparent: true,
    fragmentShader: fragmentShaderFixed,
    vertexShader: annotationVertexShader,
    clipping: false
  });

  $effect(() => {
    const props = getDefaultEffectProps(effectType);
    material.uniforms.uEffectType.value = effectType;
    material.uniforms.uBaseColor.value = getEffectColor(effectType);
    material.uniforms.uSpeed.value = props.speed;
    material.uniforms.uIntensity.value = props.intensity;
    material.uniforms.uSoftness.value = props.softness;
    material.uniforms.uBorder.value = Math.min(props.border, 0.2);
    material.uniforms.uRoughness.value = props.roughness;
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
  }}
/>
<T.Mesh>
  <T.PlaneGeometry args={[2, 2]} />
  <T is={material} />
</T.Mesh>
