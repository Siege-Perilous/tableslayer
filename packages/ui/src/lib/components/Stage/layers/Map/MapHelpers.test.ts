import type { Size } from '@threlte/core';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { getImageScale } from './MapHelpers';
import { ScaleMode } from './types';

describe('getImageScale', () => {
  it('should return the scaled size using custom scale', () => {
    const imageSize: Size = { width: 800, height: 600 };
    const canvasSize: Size = { width: 400, height: 300 };
    const customScale = 2;
    const result = getImageScale(imageSize, canvasSize, ScaleMode.Custom, customScale);

    const expected = new THREE.Vector3(imageSize.width * customScale, imageSize.height * customScale, 1 * customScale);
    expect(result).toEqual(expected);
  });

  it('should scale to fill the container with cropping (image aspect < canvas aspect)', () => {
    const imageSize: Size = { width: 800, height: 600 };
    const canvasSize: Size = { width: 1200, height: 600 };
    const result = getImageScale(imageSize, canvasSize, ScaleMode.Fill, 1);

    const expectedWidth = canvasSize.width;
    const expectedHeight = canvasSize.width / (imageSize.width / imageSize.height);
    expect(result.x).toBeCloseTo(expectedWidth);
    expect(result.y).toBeCloseTo(expectedHeight);
  });

  it('should scale to fill the container with cropping (image aspect > canvas aspect)', () => {
    const imageSize: Size = { width: 800, height: 600 };
    const canvasSize: Size = { width: 600, height: 1200 };
    const result = getImageScale(imageSize, canvasSize, ScaleMode.Fill, 1);

    const expectedWidth = canvasSize.height * (imageSize.width / imageSize.height);
    const expectedHeight = canvasSize.height;
    expect(result.x).toBeCloseTo(expectedWidth);
    expect(result.y).toBeCloseTo(expectedHeight);
  });

  it('should scale to fit the container without cropping (image aspect > canvas aspect)', () => {
    const imageSize: Size = { width: 800, height: 600 };
    const canvasSize: Size = { width: 600, height: 1200 };
    const result = getImageScale(imageSize, canvasSize, ScaleMode.Fit, 1);

    const expectedWidth = canvasSize.height * (imageSize.width / imageSize.height);
    const expectedHeight = canvasSize.height;
    expect(result.x).toBeCloseTo(expectedWidth);
    expect(result.y).toBeCloseTo(expectedHeight);
  });

  it('should scale to fit the container without cropping (image aspect < canvas aspect)', () => {
    const imageSize: Size = { width: 800, height: 600 };
    const canvasSize: Size = { width: 1200, height: 600 };
    const result = getImageScale(imageSize, canvasSize, ScaleMode.Fit, 1);

    const expectedWidth = canvasSize.width;
    const expectedHeight = canvasSize.width / (imageSize.width / imageSize.height);
    expect(result.x).toBeCloseTo(expectedWidth);
    expect(result.y).toBeCloseTo(expectedHeight);
  });
});
