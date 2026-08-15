import { decodeRLE } from '@tableslayer/ui';
import * as THREE from 'three';
import { peekRLEDimensions } from '../components/DrawingLayer/types';
import { noClipPlanes } from './clippingPlaneStore.svelte';
import { displayToMapSpace, type MapTransform } from './mapSpace';

/**
 * Decodes RLE mask data (alpha channel only) into a DataTexture, flipped
 * vertically to match the WebGL coordinate system. Dimensions come from the
 * embedded header when present, otherwise from the fallbacks.
 */
export const rleToDataTexture = (
  rleData: Uint8Array,
  fallbackWidth: number = 1024,
  fallbackHeight: number = 1024
): { texture: THREE.DataTexture; width: number; height: number } => {
  const dims = peekRLEDimensions(rleData);
  const width = dims?.width ?? fallbackWidth;
  const height = dims?.height ?? fallbackHeight;
  const actualRleData = dims ? rleData.slice(8) : rleData;

  const binaryData = decodeRLE(actualRleData, width * height);

  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = y * width + x;
      const dstIndex = ((height - 1 - y) * width + x) * 4;
      rgba[dstIndex + 3] = binaryData[srcIndex]; // Alpha channel only
    }
  }

  const texture = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat);
  texture.needsUpdate = true;

  return { texture, width, height };
};

/**
 * Re-projects a legacy display-space annotation mask into map space.
 *
 * Legacy MapDefined scenes persisted annotation masks at display resolution,
 * covering the display rect at the scene origin. The map-anchored annotation
 * texture covers the map instead, so the legacy texture is rendered once into
 * a map-sized target, positioned where the display rect sits in map-local
 * coordinates (the inverse of the map transform).
 *
 * The caller owns the returned render target and must dispose it after
 * loading its texture into the drawing buffers.
 */
export const convertMaskToMapSpace = (
  renderer: THREE.WebGLRenderer,
  legacyTexture: THREE.Texture,
  legacySize: { width: number; height: number },
  mapSize: { width: number; height: number },
  map: MapTransform
): THREE.WebGLRenderTarget => {
  const target = new THREE.WebGLRenderTarget(mapSize.width, mapSize.height, {
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    depthBuffer: false
  });

  // Camera spans map-local space: [-mapW/2, mapW/2] x [-mapH/2, mapH/2]
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -mapSize.width / 2,
    mapSize.width / 2,
    mapSize.height / 2,
    -mapSize.height / 2,
    0.1,
    10
  );
  camera.position.z = 1;

  // The display rect (centered at the scene origin) expressed in map-local
  // coordinates: position is the inverse map transform of the origin, the
  // rotation is unwound, and sizes divide by the map zoom
  const center = displayToMapSpace({ x: 0, y: 0 }, map);
  const material = new THREE.MeshBasicMaterial({ map: legacyTexture, transparent: true });
  const geometry = new THREE.PlaneGeometry(1, 1);
  const quad = new THREE.Mesh(geometry, material);
  quad.position.set(center.x, center.y, 0);
  quad.rotation.z = (-map.rotation / 180.0) * Math.PI;
  quad.scale.set(legacySize.width / map.zoom, legacySize.height / map.zoom, 1);
  scene.add(quad);

  // The global renderer state (clipping planes, autoClear) belongs to the main
  // render loop; save and restore around the offscreen render
  const previousTarget = renderer.getRenderTarget();
  const previousClippingPlanes = renderer.clippingPlanes;
  renderer.clippingPlanes = noClipPlanes();
  renderer.setRenderTarget(target);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(previousTarget);
  renderer.clippingPlanes = previousClippingPlanes;

  geometry.dispose();
  material.dispose();

  return target;
};
