import { batchMatch } from '../src/matcher';
import { CharType, type CharMatrix, PresetCharset } from '../src/types/charset';
import { Interpolation, type ArtConfig } from '../src/types/config';
import type { SamplingArray, SamplingBlock } from '../src/types/image';
import { OutputFormat } from '../src/types/output';

function block(value: number, matrixSize = 2): SamplingBlock {
  return {
    matrix: new Float32Array(matrixSize * matrixSize).fill(value),
    sourceX: 0,
    sourceY: 0
  };
}

function charMatrix(
  char: string,
  value: number,
  type: CharType,
  width: number,
  height: number
): CharMatrix {
  return {
    char,
    matrix: new Float32Array(width * height).fill(value),
    type,
    width,
    height
  };
}

function config(overrides: Partial<ArtConfig> = {}): ArtConfig {
  return {
    height: 2,
    width: 4,
    matrixSize: 2,
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

function samplingArray(rows = 2, cols = 4): SamplingArray {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => block(0.5))
  );
}

describe('Python reference parity cases', () => {
  test('does not output placeholders when only wide charset is available', async () => {
    const chars = new Map<string, CharMatrix>([
      ['士', charMatrix('士', 0.5, CharType.WIDE, 4, 2)]
    ]);

    const output = await batchMatch(samplingArray(), chars, config());

    expect(output.flat().join('')).not.toContain('?');
    expect(output.flat().join('')).toContain('士');
  });

  test('does not output placeholders for mixed normal and wide charsets', async () => {
    const chars = new Map<string, CharMatrix>([
      ['a', charMatrix('a', 0.5, CharType.NORMAL, 2, 2)],
      ['士', charMatrix('士', 0.5, CharType.WIDE, 4, 2)]
    ]);

    const output = await batchMatch(samplingArray(), chars, config({ wideCharRatio: 0.1 }));

    expect(output.flat().join('')).not.toContain('?');
  });

  test('uses question mark placeholders when both charsets are empty', async () => {
    const output = await batchMatch(samplingArray(1, 2), new Map(), config());

    expect(output).toEqual([['?', '?']]);
  });
});
