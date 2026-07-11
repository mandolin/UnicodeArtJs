import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { imageToArt, textToArt } from '../src/index';
import { PresetCharset } from '../src/types/charset';
import { OutputFormat } from '../src/types/output';

describe('integration smoke tests', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'unicode-art-js-'));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('textToArt', () => {
    test('converts simple ASCII text to plain art', async () => {
      const result = await textToArt('Hi', {
        height: 5,
        charset: { type: PresetCharset.ASCII },
        outputFormat: OutputFormat.PLAIN_TEXT
      });

      expect(result.content.length).toBeGreaterThan(0);
      expect(result.rows).toBe(5);
      expect(result.format).toBe(OutputFormat.PLAIN_TEXT);
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    test('converts Chinese text with a wide-character charset', async () => {
      const result = await textToArt('中文', {
        height: 5,
        charset: { type: PresetCharset.CHINESE_SIMPLE },
        outputFormat: OutputFormat.PLAIN_TEXT
      });

      expect(result.content.length).toBeGreaterThan(0);
      expect(result.rows).toBe(5);
      expect(result.metadata.charset).toBe(PresetCharset.CHINESE_SIMPLE);
      expect(result.metadata.charsetSize).toBeGreaterThan(0);
    });

    test('generates HTML output format', async () => {
      const result = await textToArt('Test', {
        height: 3,
        outputFormat: OutputFormat.HTML
      });

      expect(result.format).toBe(OutputFormat.HTML);
      expect(result.content).toContain('<!DOCTYPE html>');
      expect(result.content).toContain('<pre>');
    });

    test('respects invert configuration', async () => {
      const result = await textToArt('A', {
        height: 3,
        invert: true,
        outputFormat: OutputFormat.HTML
      });

      expect(result.content).toContain('background-color: #000000');
      expect(result.content).toContain('color: #FFFFFF');
    });

    test('handles empty text gracefully', async () => {
      await expect(textToArt('', { height: 5 })).rejects.toThrow('文本不能为空');
    });
    test('renders layout-stage line boxes', async () => {
      const result = await textToArt('A\nB', {
        height: 2,
        charset: { type: PresetCharset.ASCII },
        outputFormat: OutputFormat.PLAIN_TEXT,
        box: {
          renderStage: 'layout',
          mode: 'lines',
          style: 'ascii',
          separators: { rows: true }
        }
      });

      expect(result.content).toContain('+');
      expect(result.content).toContain('-');
      expect(result.rows).toBeGreaterThan(4);
    });

    test('renders layout-stage cells with column separators', async () => {
      const result = await textToArt('AB', {
        height: 2,
        charset: { type: PresetCharset.ASCII },
        outputFormat: OutputFormat.PLAIN_TEXT,
        box: {
          renderStage: 'layout',
          mode: 'cells',
          style: 'ascii',
          separators: { columns: true },
          cell: { minWidth: 2 }
        }
      });

      expect(result.content).toContain('|');
      expect(result.content).toContain('+');
      expect(result.cols).toBeGreaterThan(4);
    });

    test('renders layout-stage grid with row and column separators', async () => {
      const result = await textToArt('AB\nCD', {
        height: 1,
        charset: { type: PresetCharset.ASCII },
        outputFormat: OutputFormat.PLAIN_TEXT,
        box: {
          renderStage: 'layout',
          mode: 'grid',
          style: 'ascii',
          separators: { rows: true, columns: true },
          cell: { minWidth: 1, minHeight: 1 }
        }
      });

      expect(result.content).toContain('|');
      expect(result.content).toContain('-');
      expect(result.rows).toBeGreaterThan(4);
    });
  });

  describe('configuration validation in integration', () => {
    test('uses default config when partial config is provided', async () => {
      const result = await textToArt('X', {
        height: 2
      });

      // 🔹 line模式下，height表示单行文本的字符画高度。
      expect(result.rows).toBe(2);
      expect(result.content.length).toBeGreaterThan(0);
    });

    test('applies custom matrixSize', async () => {
      const result = await textToArt('Y', {
        height: 2,
        matrixSize: 4
      });

      // 🔹 line模式下，height表示单行文本的字符画高度。
      expect(result.rows).toBe(2);
      expect(result.metadata.matrixSize).toBe(4);
      expect(result.content.length).toBeGreaterThan(0);
    });
  });

  describe('imageToArt', () => {
    test('converts a generated PNG image to art', async () => {
      const imagePath = join(tempDir, 'fixture.png');
      await sharp({
        create: {
          width: 4,
          height: 4,
          channels: 3,
          background: { r: 128, g: 128, b: 128 }
        }
      }).png().toFile(imagePath);

      const result = await imageToArt(imagePath, {
        height: 2,
        charset: { type: PresetCharset.ASCII },
        outputFormat: OutputFormat.PLAIN_TEXT
      });

      expect(result.content.length).toBeGreaterThan(0);
      expect(result.rows).toBe(2);
      expect(result.metadata.sourceWidth).toBe(4);
      expect(result.metadata.sourceHeight).toBe(4);
    });
  });
});
