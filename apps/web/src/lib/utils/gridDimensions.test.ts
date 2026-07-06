import { describe, expect, it } from 'vitest';
import { extractDimensionsFromFilename, orientDimensionsToImage } from './gridDimensions';

describe('extractDimensionsFromFilename', () => {
  it('keeps the numbers in filename order (WxH describes the image)', () => {
    expect(extractDimensionsFromFilename('pirateking-30x60.jpg')).toEqual({ width: 30, height: 60 });
    expect(extractDimensionsFromFilename('tavern_15x12.jpg')).toEqual({ width: 15, height: 12 });
  });

  it('handles grid prefixes and separator variants', () => {
    expect(extractDimensionsFromFilename('grid-30x20.png')).toEqual({ width: 30, height: 20 });
    expect(extractDimensionsFromFilename('g_30X20.png')).toEqual({ width: 30, height: 20 });
    expect(extractDimensionsFromFilename('dungeon_30-20.webp')).toEqual({ width: 30, height: 20 });
  });

  it('returns empty when no dimensions are present', () => {
    expect(extractDimensionsFromFilename('dungeon.png')).toEqual({});
  });
});

describe('orientDimensionsToImage', () => {
  it('keeps counts that match the image orientation', () => {
    expect(orientDimensionsToImage({ width: 30, height: 60 }, { width: 1800, height: 3600 })).toEqual({
      width: 30,
      height: 60
    });
  });

  it('swaps counts transposed against the image orientation', () => {
    expect(orientDimensionsToImage({ width: 60, height: 30 }, { width: 1800, height: 3600 })).toEqual({
      width: 30,
      height: 60
    });
  });

  it('leaves square images and square counts alone', () => {
    expect(orientDimensionsToImage({ width: 30, height: 60 }, { width: 2000, height: 2000 })).toEqual({
      width: 30,
      height: 60
    });
    expect(orientDimensionsToImage({ width: 30, height: 30 }, { width: 1800, height: 3600 })).toEqual({
      width: 30,
      height: 30
    });
  });

  it('passes through when the image size or counts are unknown', () => {
    expect(orientDimensionsToImage({ width: 60, height: 30 }, null)).toEqual({ width: 60, height: 30 });
    expect(orientDimensionsToImage({}, { width: 1800, height: 3600 })).toEqual({});
  });
});
