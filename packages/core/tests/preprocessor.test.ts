import { mkdtempSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  invertPixels,
  loadImage,
  normalizePixels,
  resizeImage,
  rgbToGrayscale,
  rgbaToGrayscale
} from '../src/preprocessor';

let tempDir: string;

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'unicode-art-preprocessor-'));
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('preprocessor', () => {
  describe('rgbToGrayscale', () => {
    test('converts RGB values to grayscale using ITU-R BT.601', () => {
      // R=255, G=0, B=0 → Gray = 0.299*255 + 0.587*0 + 0.114*0 ≈ 76
      const gray = rgbToGrayscale(255, 0, 0);
      expect(gray).toBeCloseTo(76, 0);
    });

    test('handles white color correctly', () => {
      // R=255, G=255, B=255 → Gray = 255
      const gray = rgbToGrayscale(255, 255, 255);
      expect(gray).toBe(255);
    });

    test('handles black color correctly', () => {
      // R=0, G=0, B=0 → Gray = 0
      const gray = rgbToGrayscale(0, 0, 0);
      expect(gray).toBe(0);
    });
  });

  describe('rgbaToGrayscale', () => {
    test('converts RGBA array to grayscale', () => {
      const rgba = new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255]); // 2 pixels: RGBA RGBA
      const gray = rgbaToGrayscale(rgba, 2, 1); // width=2, height=1

      expect(gray.length).toBe(2);
      expect(gray[0]).toBeCloseTo(76, -1); // Red pixel (0.299*255 ≈ 76)
      expect(gray[1]).toBeGreaterThan(140); // Green pixel (0.587*255 ≈ 150)
      expect(gray[1]).toBeLessThan(160);
    });

    test('handles empty array', () => {
      const rgba = new Uint8Array([]);
      const gray = rgbaToGrayscale(rgba, 0, 0);
      expect(gray.length).toBe(0);
    });
  });

  describe('normalizePixels', () => {
    test('normalizes [0, 255] range to [0, 1]', () => {
      const pixels = new Uint8Array([0, 128, 255]);
      const normalized = normalizePixels(pixels);

      expect(normalized[0]).toBeCloseTo(0, 5);
      expect(normalized[1]).toBeCloseTo(0.502, 3);
      expect(normalized[2]).toBeCloseTo(1, 5);
    });

    test('preserves array length', () => {
      const pixels = new Uint8Array([0, 128, 255]);
      const normalized = normalizePixels(pixels);
      expect(normalized.length).toBe(3);
    });
  });

  describe('invertPixels', () => {
    test('inverts pixel values', () => {
      const pixels = new Uint8Array([0, 128, 255]);
      const inverted = invertPixels(pixels);

      expect(inverted[0]).toBe(255); // 0 → 255
      expect(inverted[1]).toBe(127); // 128 → 127
      expect(inverted[2]).toBe(0);   // 255 → 0
    });

    test('preserves array length', () => {
      const pixels = new Uint8Array([0, 128, 255]);
      const inverted = invertPixels(pixels);
      expect(inverted.length).toBe(3);
    });
  });

  describe('loadImage', () => {
    test('loads a generated image as grayscale data', async () => {
      const imagePath = join(tempDir, 'load-image.png');
      await writeFile(imagePath, await createTinyPngFixture());

      const image = await loadImage(imagePath);

      expect(image.width).toBe(2);
      expect(image.height).toBe(2);
      expect(image.data).toHaveLength(4);
    });

    test('wraps image load failures in UnicodeArtError', async () => {
      await expect(loadImage(join(tempDir, 'missing.png'))).rejects.toThrow('加载图像失败');
    });
  });

  describe('resizeImage', () => {
    test('resizes grayscale image data with the default Node backend', async () => {
      const resized = await resizeImage(
        { width: 2, height: 2, data: new Uint8Array([0, 64, 128, 255]) },
        1,
        1,
        'nearest'
      );

      expect(resized.width).toBe(1);
      expect(resized.height).toBe(1);
      expect(resized.data).toHaveLength(1);
    });
  });
});

async function createTinyPngFixture(): Promise<Buffer> {
  const { Transformer } = await import('@napi-rs/image');
  const rgba = new Uint8Array([
    255, 0, 0, 255,
    255, 0, 0, 255,
    255, 0, 0, 255,
    255, 0, 0, 255
  ]);

  return Transformer.fromRgbaPixels(rgba, 2, 2).png();
}
