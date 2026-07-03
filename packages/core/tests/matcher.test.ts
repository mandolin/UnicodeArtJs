import {
  batchMatch,
  batchMatchParallel,
  calculateSAD,
  findBestMatchForBlock
} from '../src/matcher';
import { CharType, type CharMatrix } from '../src/types/charset';
import { Interpolation, type ArtConfig } from '../src/types/config';
import { OutputFormat } from '../src/types/output';
import { PresetCharset } from '../src/types/charset';
import type { SamplingArray, SamplingBlock } from '../src/types/image';

function block(matrix: number[]): SamplingBlock {
  return {
    matrix: new Float32Array(matrix),
    sourceX: 0,
    sourceY: 0
  };
}

function charMatrix(
  char: string,
  matrix: number[],
  type: CharType,
  width: number,
  height: number
): CharMatrix {
  return {
    char,
    matrix: new Float32Array(matrix),
    type,
    width,
    height
  };
}

function config(overrides: Partial<ArtConfig> = {}): ArtConfig {
  return {
    height: 1,
    matrixSize: 2,
    ratio: 2,
    interpolation: Interpolation.BILINEAR,
    charset: { type: PresetCharset.ASCII },
    invert: false,
    outputFormat: OutputFormat.PLAIN_TEXT,
    trimTrailingSpaces: false,
    enableEarlyTermination: true,
    maxParallelTasks: 0,
    ...overrides
  };
}

describe('matcher', () => {
  test('calculateSAD returns the sum of absolute differences', () => {
    const sad = calculateSAD(
      new Float32Array([0, 0.25, 0.5, 1]),
      new Float32Array([1, 0.25, 0, 0.5])
    );

    expect(sad).toBeCloseTo(2);
  });

  test('calculateSAD rejects mismatched matrix sizes', () => {
    expect(() =>
      calculateSAD(new Float32Array([0]), new Float32Array([0, 1]))
    ).toThrow('矩阵尺寸不匹配');
  });

  test('findBestMatchForBlock returns the nearest normal character', () => {
    const chars = new Map<string, CharMatrix>([
      [' ', charMatrix(' ', [1, 1, 1, 1], CharType.NORMAL, 2, 2)],
      ['#', charMatrix('#', [0, 0, 0, 0], CharType.NORMAL, 2, 2)]
    ]);

    const result = findBestMatchForBlock(new Float32Array([0, 0, 0, 0]), chars);

    expect(result.char).toBe('#');
  });

  test('findBestMatchForBlock rejects empty char data', () => {
    expect(() =>
      findBestMatchForBlock(new Float32Array([0, 0, 0, 0]), new Map())
    ).toThrow('未找到任何匹配字符');
  });

  test('batchMatch merges adjacent blocks and skips the next column for wide chars', async () => {
    const samplingArray: SamplingArray = [[
      block([0, 0, 0, 0]),
      block([0, 0, 0, 0])
    ]];

    const chars = new Map<string, CharMatrix>([
      ['.', charMatrix('.', [1, 1, 1, 1], CharType.NORMAL, 2, 2)],
      ['中', charMatrix('中', [0, 0, 0, 0, 0, 0, 0, 0], CharType.WIDE, 4, 2)]
    ]);

    const result = await batchMatch(samplingArray, chars, config());

    expect(result).toEqual([['中', '']]);
  });

  test('batchMatch can be made conservative about wide chars via wideCharRatio', async () => {
    const samplingArray: SamplingArray = [[
      block([0, 0, 0, 0]),
      block([0, 0, 0, 0])
    ]];

    const chars = new Map<string, CharMatrix>([
      ['.', charMatrix('.', [0.2, 0.2, 0.2, 0.2], CharType.NORMAL, 2, 2)],
      ['中', charMatrix('中', [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.3], CharType.WIDE, 4, 2)]
    ]);

    const result = await batchMatch(samplingArray, chars, config({ wideCharRatio: 0.1 }));

    expect(result).toEqual([['.', '.']]);
  });

  test('batchMatch rejects empty sampling arrays', async () => {
    await expect(batchMatch([], new Map(), config())).rejects.toThrow('采样数组为空');
  });

  test('batchMatchParallel reports the reserved implementation status', async () => {
    await expect(
      batchMatchParallel([], new Map(), config())
    ).rejects.toThrow('并行匹配功能尚未实现');
  });
});
