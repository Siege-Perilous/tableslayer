import * as THREE from 'three';

export function textureToBase64(texture: THREE.Texture) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  // Set canvas dimensions to the texture dimensions
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;

  // Draw the texture image onto the canvas
  context.drawImage(texture.image, 0, 0);

  canvas.remove();

  // Get the base64-encoded data URL of the canvas
  return canvas.toDataURL('image/png'); // "image/png" or other formats as needed
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
