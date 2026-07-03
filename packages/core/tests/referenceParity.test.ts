import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { imageToArt, textToArt } from '../src/index';
import { batchMatch } from '../src/matcher';
import { generateSamplingArray } from '../src/sampler';
import { isWideChar } from '../src/utils/wideCharDetector';
import { CharType, type CharMatrix, PresetCharset } from '../src/types/charset';
import { HeightMode, Interpolation, TextAlign, type ArtConfig } from '../src/types/config';
import type { ImageData, SamplingArray, SamplingBlock } from '../src/types/image';
import { OutputFormat } from '../src/types/output';

jest.unmock('canvas');

const referenceRoot = 'K:\\Project\\Github_mandolin\\UnicodeArt\\src';
const referenceFont = 'C:\\Windows\\Fonts\\arial.ttf';
const referenceCjkFont = 'C:\\Windows\\Fonts\\SimSun.ttc';

function runPython(code: string): string {
  const result = spawnSync('python', ['-c', code], {
    encoding: 'utf-8',
    env: {
      ...process.env,
      PYTHONPATH: referenceRoot
    }
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  return result.stdout.trim();
}

function config(overrides: Partial<ArtConfig> = {}): ArtConfig {
  return {
    height: 2,
    matrixSize: 3,
    ratio: 2,
    interpolation: Interpolation.BILINEAR,
    charset: { type: PresetCharset.ASCII },
    invert: false,
    outputFormat: OutputFormat.PLAIN_TEXT,
    trimTrailingSpaces: false,
    wideCharRatio: 2,
    enableEarlyTermination: true,
    maxParallelTasks: 0,
    ...overrides
  };
}

function block(values: number[]): SamplingBlock {
  return {
    matrix: new Float32Array(values),
    sourceX: 0,
    sourceY: 0
  };
}

function charMatrix(char: string, values: number[], type: CharType, width: number, height: number): CharMatrix {
  return {
    char,
    matrix: new Float32Array(values),
    type,
    width,
    height
  };
}

function matrixRowsToString(rows: string[][]): string {
  return rows.map((row) => row.join('')).join('\n');
}

async function expectTextMatchesPython(
  text: string,
  options: {
    height: number;
    matrixSize: number;
    align?: 'left' | 'center' | 'right';
    lineSpacing?: number;
    heightMode?: 'line' | 'total';
    fontReduce?: number;
    chars?: string;
  }
): Promise<void> {
  const chars = options.chars ?? ' @';
  const align = options.align ?? 'left';
  const lineSpacing = options.lineSpacing ?? 0;
  const heightMode = options.heightMode ?? 'line';
  const fontReduce = options.fontReduce ?? 0;
  const escapedText = JSON.stringify(text);

  const jsResult = await textToArt(text, {
    height: options.height,
    matrixSize: options.matrixSize,
    ratio: 2,
    interpolation: Interpolation.BILINEAR,
    charset: { type: PresetCharset.CUSTOM, customChars: chars },
    font: referenceFont,
    outputFormat: OutputFormat.PLAIN_TEXT,
    textAlign: align as TextAlign,
    lineSpacing,
    heightMode: heightMode === 'total' ? HeightMode.TOTAL : HeightMode.LINE,
    fontReduce
  });
  const pyOut = runPython(`
import json
from unicodeart import unicodeart_util as u
font = r'''${referenceFont}'''
text = json.loads(r'''${escapedText}''')
base = u.get_baseimg(text, font, ${options.height}, ${options.matrixSize}, '${align}', ${lineSpacing}, '${heightMode}', ${fontReduce})
if '${heightMode}' == 'total':
    sampling_height = ${options.height}
else:
    lines_count = len(u.preprocess_text_input(text))
    sampling_height = ${options.height} * lines_count + ${lineSpacing} * max(0, lines_count - 1)
sampling = u.get_sampling_array(base, sampling_height, None, 2.0, ${options.matrixSize}, 'bilinear')
char_data, wide_char_data = u.get_char_data(${JSON.stringify(chars)}, font, ${options.matrixSize}, 2.0, 'bilinear')
print(json.dumps(u.get_final_output(sampling, char_data, wide_char_data, None, 2.0), ensure_ascii=False))
`);

  expect(jsResult.content).toBe(JSON.parse(pyOut));
}

describe('reference project parity', () => {
  test('wide character detection matches Python reference pattern', () => {
    const chars = ['A', '中', '！', '①', '☀', '🌀', '😀', 'ﬀ', '𠀋'];
    const pyOut = runPython(`
import json
import re
from unicodeart.config.constants import WIDE_CHAR_PATTERN
chars = ${JSON.stringify(['A', '中', '！', '①', '☀', '🌀', '😀', 'ﬀ', '𠀋'])}
print(json.dumps([WIDE_CHAR_PATTERN.search(char) is not None for char in chars]))
`);
    const expected = JSON.parse(pyOut) as boolean[];
    expect(chars.map((char) => isWideChar(char))).toEqual(expected);
  });

  test('sampling array matches Python get_sampling_array for bilinear resize', () => {
    const image: ImageData = {
      width: 5,
      height: 5,
      data: new Uint8Array([
        0, 32, 64, 96, 128,
        16, 48, 80, 112, 144,
        32, 64, 96, 128, 160,
        48, 80, 112, 144, 176,
        64, 96, 128, 160, 192
      ])
    };

    const jsSampling = generateSamplingArray(image, config({ height: 2, matrixSize: 3, ratio: 2 }));
    const pyOut = runPython(`
import json
import numpy as np
from unicodeart import unicodeart_util as u
base = np.array([
  [0,32,64,96,128],
  [16,48,80,112,144],
  [32,64,96,128,160],
  [48,80,112,144,176],
  [64,96,128,160,192]
], dtype=np.uint8)
arr = u.get_sampling_array(base, 2, None, 2.0, 3, 'bilinear')
print(json.dumps({'shape': arr.shape, 'values': arr.flatten().tolist()}))
`);
    const pySampling = JSON.parse(pyOut) as { shape: number[]; values: number[] };
    const jsValues = jsSampling.flatMap((row) => row.flatMap((item) => Array.from(item.matrix)));

    expect([jsSampling.length, jsSampling[0].length, 3, 3]).toEqual(pySampling.shape);
    expect(jsValues).toHaveLength(pySampling.values.length);
    for (let i = 0; i < jsValues.length; i++) {
      expect(jsValues[i]).toBeCloseTo(pySampling.values[i], 5);
    }
  });

  test.each([
    ['nearest', Interpolation.NEAREST],
    ['bilinear', Interpolation.BILINEAR],
    ['bicubic', Interpolation.BICUBIC],
    ['lanczos', Interpolation.LANCZOS]
  ])('sampling array matches Python get_sampling_array for %s resize', (pythonInterpolation, jsInterpolation) => {
    const image: ImageData = {
      width: 4,
      height: 4,
      data: new Uint8Array([
        0, 40, 80, 120,
        20, 60, 100, 140,
        40, 80, 120, 160,
        60, 100, 140, 180
      ])
    };

    const jsSampling = generateSamplingArray(image, config({
      height: 3,
      matrixSize: 4,
      ratio: 2,
      interpolation: jsInterpolation
    }));
    const pyOut = runPython(`
import json
import numpy as np
from unicodeart import unicodeart_util as u
base = np.array([
  [0,40,80,120],
  [20,60,100,140],
  [40,80,120,160],
  [60,100,140,180]
], dtype=np.uint8)
arr = u.get_sampling_array(base, 3, None, 2.0, 4, '${pythonInterpolation}')
print(json.dumps({'shape': arr.shape, 'values': arr.flatten().tolist()}))
`);
    const pySampling = JSON.parse(pyOut) as { shape: number[]; values: number[] };
    const jsValues = jsSampling.flatMap((row) => row.flatMap((item) => Array.from(item.matrix)));

    expect([jsSampling.length, jsSampling[0].length, 4, 4]).toEqual(pySampling.shape);
    expect(jsValues).toHaveLength(pySampling.values.length);
    for (let i = 0; i < jsValues.length; i++) {
      expect(jsValues[i]).toBeCloseTo(pySampling.values[i], 4);
    }
  });

  test('sampling array matches Python for Qoder zhong image case', async () => {
    const imagePath = join(__dirname, 'test-image-zhong.png');
    const { loadImage } = await import('../src/preprocessor');
    const imageData = await loadImage(imagePath);
    const jsSampling = generateSamplingArray(imageData, config({
      height: 5,
      matrixSize: 6,
      ratio: 2,
      interpolation: Interpolation.BILINEAR
    }));
    const pyOut = runPython(`
import cv2
import json
from unicodeart import unicodeart_util as u
img = cv2.imread(r'''${imagePath}''', 0)
arr = u.get_sampling_array(img, 5, None, 2.0, 6, 'bilinear')
print(json.dumps({'shape': arr.shape, 'values': arr.flatten().tolist()}))
`);
    const pySampling = JSON.parse(pyOut) as { shape: number[]; values: number[] };
    const jsValues = jsSampling.flatMap((row) => row.flatMap((item) => Array.from(item.matrix)));

    expect([jsSampling.length, jsSampling[0].length, 6, 6]).toEqual(pySampling.shape);
    expect(jsValues).toHaveLength(pySampling.values.length);
    for (let i = 0; i < jsValues.length; i++) {
      expect(jsValues[i]).toBeCloseTo(pySampling.values[i], 5);
    }
  });

  test.each([
    ['ASCII95', { type: PresetCharset.ASCII }, ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\\\]^_`abcdefghijklmnopqrstuvwxyz{|}~'],
    ['small custom charset', { type: PresetCharset.CUSTOM, customChars: ' .#@' }, ' .#@']
  ])('imageToArt matches Python for Qoder zhong image with %s', async (_name, jsCharset, pythonChars) => {
    const imagePath = join(__dirname, 'test-image-zhong.png');
    const jsResult = await imageToArt(imagePath, {
      height: 5,
      matrixSize: 6,
      ratio: 2,
      interpolation: Interpolation.BILINEAR,
      charset: jsCharset,
      font: referenceCjkFont,
      fontReduce: 0,
      outputFormat: OutputFormat.PLAIN_TEXT,
      trimTrailingSpaces: false,
      invert: false,
      wideCharRatio: 2
    });
    const pyOut = runPython(`
import cv2
import json
from unicodeart import unicodeart_util as u
img = cv2.imread(r'''${imagePath}''', 0)
sampling = u.get_sampling_array(img, 5, None, 2.0, 6, 'bilinear')
char_data, wide_char_data = u.get_char_data(${JSON.stringify(pythonChars)}, r'''${referenceCjkFont}''', 6, 2.0, 'bilinear')
print(json.dumps(u.get_final_output(sampling, char_data, wide_char_data, None, 2.0), ensure_ascii=False))
`);

    expect(jsResult.content).toBe(JSON.parse(pyOut));
  });

  test('imageToArt matches Python pipeline when ratio is not default', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'unicode-art-core-ratio-parity-'));

    try {
      const imagePath = join(tempDir, 'ratio-sample.png');
      const pixels = Buffer.from([
        0, 32, 64, 96, 128, 160,
        16, 48, 80, 112, 144, 176,
        32, 64, 96, 128, 160, 192,
        48, 80, 112, 144, 176, 208,
        64, 96, 128, 160, 192, 224,
        80, 112, 144, 176, 208, 240
      ]);
      await sharp(pixels, { raw: { width: 6, height: 6, channels: 1 } }).png().toFile(imagePath);

      const chars = ' .#@';
      const jsResult = await imageToArt(imagePath, {
        height: 2,
        matrixSize: 4,
        ratio: 1.5,
        interpolation: Interpolation.BILINEAR,
        charset: { type: PresetCharset.CUSTOM, customChars: chars },
        font: referenceFont,
        outputFormat: OutputFormat.PLAIN_TEXT
      });

      const pyOut = runPython(`
import cv2
import json
from unicodeart import unicodeart_util as u
img = cv2.imread(r'''${imagePath}''', 0)
sampling = u.get_sampling_array(img, 2, None, 1.5, 4, 'bilinear')
char_data, wide_char_data = u.get_char_data(${JSON.stringify(chars)}, r'''${referenceFont}''', 4, 1.5, 'bilinear')
print(json.dumps(u.get_final_output(sampling, char_data, wide_char_data, None, 2.0), ensure_ascii=False))
`);

      expect(jsResult.content).toBe(JSON.parse(pyOut));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('matcher output matches Python get_final_output for synthetic normal and wide matrices', async () => {
    const sampling: SamplingArray = [[
      block([0, 0, 0, 0]),
      block([1, 1, 1, 1]),
      block([0.5, 0.5, 0.5, 0.5])
    ]];
    const chars = new Map<string, CharMatrix>([
      ['A', charMatrix('A', [0, 0, 0, 0], CharType.NORMAL, 2, 2)],
      ['B', charMatrix('B', [1, 1, 1, 1], CharType.NORMAL, 2, 2)],
      ['中', charMatrix('中', [0, 0, 1, 1, 0, 0, 1, 1], CharType.WIDE, 4, 2)]
    ]);

    const jsOutput = matrixRowsToString(await batchMatch(sampling, chars, config({ matrixSize: 2 })));
    const pyOut = runPython(`
import json
import numpy as np
from unicodeart import unicodeart_util as u
sampling = np.array([[
  [[0,0],[0,0]],
  [[1,1],[1,1]],
  [[0.5,0.5],[0.5,0.5]]
]], dtype=float)
char_data = [
  {'character': 'A', 'matrix': np.array([[0,0],[0,0]], dtype=float)},
  {'character': 'B', 'matrix': np.array([[1,1],[1,1]], dtype=float)}
]
wide_char_data = [
  {'character': '中', 'matrix': np.array([[0,0,1,1],[0,0,1,1]], dtype=float)}
]
print(u.get_final_output(sampling, char_data, wide_char_data, None, 2.0))
`);

    expect(jsOutput).toBe(pyOut);
  });

  test('matcher handles wide-only charset at row end like Python', async () => {
    const sampling: SamplingArray = [[
      block([0, 0, 0, 0]),
      block([1, 1, 1, 1]),
      block([0.5, 0.5, 0.5, 0.5])
    ]];
    const chars = new Map<string, CharMatrix>([
      ['W', charMatrix('W', [0, 0, 1, 1, 0, 0, 1, 1], CharType.WIDE, 4, 2)]
    ]);

    const jsOutput = matrixRowsToString(await batchMatch(sampling, chars, config({ matrixSize: 2 })));
    const pyOut = runPython(`
import numpy as np
from unicodeart import unicodeart_util as u
sampling = np.array([[
  [[0,0],[0,0]],
  [[1,1],[1,1]],
  [[0.5,0.5],[0.5,0.5]]
]], dtype=float)
char_data = []
wide_char_data = [
  {'character': 'W', 'matrix': np.array([[0,0,1,1],[0,0,1,1]], dtype=float)}
]
print(u.get_final_output(sampling, char_data, wide_char_data, None, 2.0))
`);

    expect(jsOutput).toBe(pyOut);
  });

  test('imageToArt matches Python pipeline for a high-contrast image sample', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'unicode-art-core-parity-'));

    try {
      const imagePath = join(tempDir, 'sample.png');
      const pixels = Buffer.from([
        0, 0, 0, 255, 255, 255,
        0, 0, 0, 255, 255, 255,
        0, 0, 0, 255, 255, 255,
        255, 255, 255, 0, 0, 0,
        255, 255, 255, 0, 0, 0,
        255, 255, 255, 0, 0, 0
      ]);
      await sharp(pixels, { raw: { width: 6, height: 6, channels: 1 } }).png().toFile(imagePath);

      const chars = ' @';
      const jsResult = await imageToArt(imagePath, {
        height: 2,
        matrixSize: 3,
        ratio: 2,
        interpolation: Interpolation.BILINEAR,
        charset: { type: PresetCharset.CUSTOM, customChars: chars },
        font: referenceFont,
        outputFormat: OutputFormat.PLAIN_TEXT
      });

      const pyScript = join(tempDir, 'parity.py');
      writeFileSync(pyScript, `
import cv2
import json
from unicodeart import unicodeart_util as u
img = cv2.imread(r'''${imagePath}''', 0)
sampling = u.get_sampling_array(img, 2, None, 2.0, 3, 'bilinear')
char_data, wide_char_data = u.get_char_data(' @', r'''${referenceFont}''', 3, 2.0, 'bilinear')
print(json.dumps(u.get_final_output(sampling, char_data, wide_char_data, None, 2.0), ensure_ascii=False))
`, 'utf-8');
      const pyResult = spawnSync('python', [pyScript], {
        encoding: 'utf-8',
        env: {
          ...process.env,
          PYTHONPATH: referenceRoot
        }
      });
      if (pyResult.status !== 0) {
        throw new Error(pyResult.stderr || pyResult.stdout);
      }

      expect(jsResult.content).toBe(JSON.parse(pyResult.stdout.trim()));
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('textToArt matches Python pipeline for an ASCII text sample', async () => {
    await expectTextMatchesPython('Hi', { height: 3, matrixSize: 3 });
  });

  test('textToArt matches Python pipeline for a small ASCII text sample', async () => {
    await expectTextMatchesPython('Hi', { height: 2, matrixSize: 3 });
  });

  test('textToArt matches Python for multiline center alignment with spacing', async () => {
    await expectTextMatchesPython('Hi\nA', {
      height: 3,
      matrixSize: 3,
      align: 'center',
      lineSpacing: 1
    });
  });

  test('textToArt matches Python for total height mode and right alignment', async () => {
    await expectTextMatchesPython('Hi\nA', {
      height: 6,
      matrixSize: 3,
      align: 'right',
      heightMode: 'total'
    });
  });
});
