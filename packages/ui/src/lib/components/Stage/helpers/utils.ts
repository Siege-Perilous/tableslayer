import * as THREE from 'three';

export function textureToBase64(texture: THREE.DataTexture): string {
  if (!texture.image.data) {
    throw new Error('Texture image data is null');
  }
  return texture.image.data.toString();
}

export function base64ToTexture(base64: string) {
  return new Promise((resolve) => {
    const image = new Image();
    image.src = base64;

    image.onload = () => {
      const texture = new THREE.Texture(image);
      texture.needsUpdate = true; // Update the texture with the loaded image
      resolve(texture);
    };
  });
}
