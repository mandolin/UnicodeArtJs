import { calculateBlockSize, bilinearInterpolate, generateSamplingArray } from '../src/sampler';
import type { ImageData } from '../src/types/image';
import { Interpolation, type ArtConfig } from '../src/types/config';
import { PresetCharset } from '../src/types/charset';

function config(overrides: Partial<ArtConfig> = {}): ArtConfig {
  return {
    height: 2,
    matrixSize: 2,
    ratio: 1,
    interpolation: Interpolation.BILINEAR,
    charset: { type: PresetCharset.ASCII },
    invert: false,
    trimTrailingSpaces: false,
    enableEarlyTermination: true,
    maxParallelTasks: 0,
    ...overrides
  };
}

describe('sampler', () => {
  describe('calculateBlockSize', () => {
    test('calculates block size correctly for normal ratio', () => {
      // Create a mock image: 100x200 pixels
      const mockImage: ImageData = {
        width: 200,
        height: 100,
        data: new Uint8Array(20000)
      };

      // outputHeight=10, outputWidth=20, ratio=2.0
      const result = calculateBlockSize(mockImage, 10, 20, 2.0);
      expect(result.blockH).toBeGreaterThanOrEqual(10); // ceil(100/10) = 10
    });

    test('handles small source size', () => {
      const mockImage: ImageData = {
        width: 50,
        height: 50,
        data: new Uint8Array(2500)
      };

      const result = calculateBlockSize(mockImage, 10, 10, 2.0);
      expect(result.blockH).toBeGreaterThanOrEqual(2); // Minimum is 2
    });

    test('handles different ratios', () => {
      const mockImage: ImageData = {
        width: 200,
        height: 100,
        data: new Uint8Array(20000)
      };

      const result1 = calculateBlockSize(mockImage, 10, 20, 1.0);
      const result2 = calculateBlockSize(mockImage, 10, 20, 3.0);
      // Larger ratio should produce smaller blockW
      expect(result2.blockW).toBeLessThanOrEqual(result1.blockW);
    });
  });

  describe('bilinearInterpolate', () => {
    test('interpolates at corner pixel', () => {
      const data = new Uint8Array([100, 150, 200, 250]); // 2x2 image
      const value = bilinearInterpolate(data, 2, 2, 0, 0);
      expect(value).toBe(100);
    });

    test('interpolates at center of 2x2 image', () => {
      const data = new Uint8Array([0, 255, 0, 255]); // 2x2 image
      const value = bilinearInterpolate(data, 2, 2, 0.5, 0.5);
      // Should be average: (0+255+0+255)/4 = 127.5
      expect(value).toBeCloseTo(127.5, 1);
    });

    test('clamps coordinates to valid range', () => {
      const data = new Uint8Array([100, 150, 200, 250]); // 2x2 image
      const value = bilinearInterpolate(data, 2, 2, -1, -1);
      expect(value).toBe(100); // Should clamp to (0,0)
    });

    test('handles edge coordinates', () => {
      const data = new Uint8Array([100, 150, 200, 250]); // 2x2 image
      const value = bilinearInterpolate(data, 2, 2, 1.9, 1.9);
      expect(value).toBeGreaterThan(200); // Close to bottom-right pixel
    });
  });

  describe('generateSamplingArray integration', () => {
    test('generates normalized sampling blocks for a small image', () => {
      const image: ImageData = {
        width: 4,
        height: 4,
        data: new Uint8Array([
          0, 64, 128, 255,
          0, 64, 128, 255,
          255, 128, 64, 0,
          255, 128, 64, 0
        ])
      };

      const samplingArray = generateSamplingArray(image, config({ height: 2, width: 2 }));

      expect(samplingArray).toHaveLength(2);
      expect(samplingArray[0]).toHaveLength(2);
      expect(samplingArray[0][0].matrix).toHaveLength(4);
      for (const row of samplingArray) {
        for (const block of row) {
          for (const value of block.matrix) {
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
          }
        }
      }
    });

    test('pads out-of-bounds pixels with white when output exceeds source', () => {
      const image: ImageData = {
        width: 1,
        height: 1,
        data: new Uint8Array([0])
      };

      const samplingArray = generateSamplingArray(image, config({ height: 2, width: 2 }));

      expect(samplingArray).toHaveLength(1);
      expect(samplingArray[0]).toHaveLength(1);
      expect(Array.from(samplingArray[0][0].matrix)).toEqual([0, 0, 1, 1]);
    });
  });
});
