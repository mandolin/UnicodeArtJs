/**
 * Systematic golden tests against the Python reference implementation.
 *
 * These cases intentionally avoid near-tie full-ASCII synthetic images where
 * tiny Pillow/node-canvas glyph rasterization differences can flip equivalent
 * candidates. Full ASCII is covered by referenceParity.test.ts with real images.
 */

import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';
import {
  CHINESE_SIMPLE_CHARS,
  imageToArt,
  Interpolation,
  OutputFormat,
  PresetCharset
} from '../src/index';

jest.unmock('canvas');

const PYTHON_PROJECT = 'K:/Project/Github_mandolin/UnicodeArt';
const HELPER_SCRIPT = `${PYTHON_PROJECT}/test_golden_helper.py`;
const SIMSUN_FONT = 'C:/Windows/Fonts/SimSun.ttc';
const ARIAL_FONT = 'C:/Windows/Fonts/arial.ttf';
const BASIC_CHARS = ' @';
const SMALL_CHARS = ' .#@';

type ImageKind = 'square' | 'checker' | 'gradient' | 'diagonal' | 'stripes' | 'border' | 'single-dot';

interface GoldenCase {
  name: string;
  kind: ImageKind;
  width: number;
  height: number;
  artHeight?: number;
  artWidth?: number;
  ratio?: number;
  matrixSize?: number;
  interpolation?: Interpolation;
  font?: string;
  chars?: string;
  fontReduce?: number;
  wideCharRatio?: number;
  invert?: boolean;
}

function runPython(
  imagePath: string,
  height: number | null,
  width: number | null,
  ratio: number,
  matrixSize: number,
  interpolation: string,
  fontPath: string,
  chars: string,
  fontReduce: number | null = null,
  wideCharRatio: number = 2.0
): string {
  const result = spawnSync('python', [
    HELPER_SCRIPT,
    imagePath,
    height?.toString() || 'None',
    width?.toString() || 'None',
    ratio.toString(),
    matrixSize.toString(),
    interpolation,
    fontPath,
    chars,
    fontReduce?.toString() || 'None',
    wideCharRatio.toString()
  ], {
    encoding: 'utf-8',
    maxBuffer: 20 * 1024 * 1024
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  const lastLine = result.stdout.trim().split(/\r?\n/).pop();
  if (!lastLine) {
    throw new Error('Python golden helper returned empty output');
  }

  return JSON.parse(lastLine);
}

function makePixels(kind: ImageKind, width: number, height: number): Buffer {
  const pixels = Buffer.alloc(width * height, 255);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;

      switch (kind) {
        case 'square':
          pixels[index] = x >= width * 0.3 && x < width * 0.7 && y >= height * 0.3 && y < height * 0.7 ? 0 : 255;
          break;
        case 'checker':
          pixels[index] = (x + y) % 2 === 0 ? 0 : 255;
          break;
        case 'gradient':
          pixels[index] = Math.round((x / Math.max(1, width - 1)) * 255);
          break;
        case 'diagonal':
          pixels[index] = Math.abs(x - y) <= 1 ? 0 : 255;
          break;
        case 'stripes':
          pixels[index] = x % 3 === 0 ? 0 : 255;
          break;
        case 'border':
          pixels[index] = x === 0 || y === 0 || x === width - 1 || y === height - 1 ? 0 : 255;
          break;
        case 'single-dot':
          pixels[index] = x === Math.floor(width / 2) && y === Math.floor(height / 2) ? 0 : 255;
          break;
      }
    }
  }

  return pixels;
}

function invertPixels(pixels: Buffer): Buffer {
  return Buffer.from(pixels.map((value) => 255 - value));
}

async function writeGrayPng(path: string, pixels: Buffer, width: number, height: number): Promise<void> {
  await sharp(pixels, { raw: { width, height, channels: 1 } }).png().toFile(path);
}

describe('systematic golden tests', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'unicode-art-golden-test-'));
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  const cases: GoldenCase[] = [
    { name: 'realistic square, SimSun', kind: 'square', width: 10, height: 10, artHeight: 5, font: SIMSUN_FONT },
    { name: 'gradient, Arial', kind: 'gradient', width: 12, height: 8, artHeight: 4, font: ARIAL_FONT },
    { name: 'width-only mode', kind: 'checker', width: 10, height: 10, artWidth: 20, font: SIMSUN_FONT },
    { name: 'height and width mode', kind: 'diagonal', width: 12, height: 12, artHeight: 6, artWidth: 12, font: SIMSUN_FONT },
    { name: 'fontReduce is ignored for image char templates', kind: 'stripes', width: 9, height: 6, artHeight: 3, font: SIMSUN_FONT, fontReduce: 2 },
    { name: 'wideCharRatio custom value', kind: 'border', width: 10, height: 10, artHeight: 5, font: SIMSUN_FONT, wideCharRatio: 1.5 },
    { name: 'nearest interpolation', kind: 'checker', width: 8, height: 8, artHeight: 4, font: SIMSUN_FONT, interpolation: Interpolation.NEAREST },
    { name: 'bicubic interpolation', kind: 'gradient', width: 8, height: 8, artHeight: 4, font: ARIAL_FONT, interpolation: Interpolation.BICUBIC },
    { name: 'lanczos interpolation', kind: 'gradient', width: 8, height: 8, artHeight: 4, font: ARIAL_FONT, interpolation: Interpolation.LANCZOS },
    { name: 'ratio 1.5', kind: 'square', width: 12, height: 8, artHeight: 4, font: SIMSUN_FONT, ratio: 1.5 },
    { name: 'matrix size 4', kind: 'diagonal', width: 8, height: 8, artHeight: 4, font: SIMSUN_FONT, matrixSize: 4 },
    { name: 'small charset', kind: 'stripes', width: 10, height: 10, artHeight: 5, font: SIMSUN_FONT, chars: SMALL_CHARS },
    { name: 'pure Chinese charset', kind: 'gradient', width: 10, height: 10, artHeight: 5, font: SIMSUN_FONT, chars: CHINESE_SIMPLE_CHARS.slice(0, 4) },
    { name: 'single dot edge case', kind: 'single-dot', width: 7, height: 7, artHeight: 4, font: SIMSUN_FONT },
    { name: 'invert option', kind: 'square', width: 10, height: 10, artHeight: 5, font: SIMSUN_FONT, invert: true }
  ];

  test.each(cases)('$name matches Python reference', async (goldenCase) => {
    const ratio = goldenCase.ratio ?? 2.0;
    const matrixSize = goldenCase.matrixSize ?? 6;
    const interpolation = goldenCase.interpolation ?? Interpolation.BILINEAR;
    const font = goldenCase.font ?? SIMSUN_FONT;
    const chars = goldenCase.chars ?? BASIC_CHARS;
    const fontReduce = goldenCase.fontReduce ?? 0;
    const wideCharRatio = goldenCase.wideCharRatio ?? 2.0;
    const basePixels = makePixels(goldenCase.kind, goldenCase.width, goldenCase.height);
    const jsImagePath = join(tempDir, `${goldenCase.name.replace(/[^a-z0-9]+/gi, '-')}-js.png`);
    const pyImagePath = join(tempDir, `${goldenCase.name.replace(/[^a-z0-9]+/gi, '-')}-py.png`);

    await writeGrayPng(jsImagePath, basePixels, goldenCase.width, goldenCase.height);
    await writeGrayPng(
      pyImagePath,
      goldenCase.invert ? invertPixels(basePixels) : basePixels,
      goldenCase.width,
      goldenCase.height
    );

    const jsResult = await imageToArt(jsImagePath, {
      height: goldenCase.artHeight,
      width: goldenCase.artWidth,
      matrixSize,
      ratio,
      interpolation,
      charset: { type: PresetCharset.CUSTOM, customChars: chars },
      font,
      fontReduce,
      wideCharRatio,
      invert: goldenCase.invert ?? false,
      outputFormat: OutputFormat.PLAIN_TEXT,
      trimTrailingSpaces: false
    });

    const pyResult = runPython(
      pyImagePath,
      goldenCase.artHeight ?? null,
      goldenCase.artWidth ?? null,
      ratio,
      matrixSize,
      interpolation,
      font,
      chars,
      fontReduce,
      wideCharRatio
    );

    expect(jsResult.content).toBe(pyResult);
  });
});
