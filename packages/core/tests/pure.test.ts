import {
  CharType,
  ErrorCode,
  imageDataToArt,
  OutputFormat,
  PresetCharset,
  type CharMatrix,
  type CoreImageData,
  type ImageData
} from '../src/pure';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function makeCharMatrix(char: string, value: number): CharMatrix {
  return {
    char,
    matrix: new Float32Array([value, value, value, value]),
    type: CharType.NORMAL,
    width: 2,
    height: 2
  };
}

describe('pure core entry', () => {
  test('converts CoreImageData with caller-provided character matrices', async () => {
    const imageData: CoreImageData = {
      width: 2,
      height: 2,
      data: new Uint8Array([255, 255, 255, 255])
    };
    const charDataMap = new Map<string, CharMatrix>([
      ['@', makeCharMatrix('@', 0)],
      ['.', makeCharMatrix('.', 1)]
    ]);

    const result = await imageDataToArt(
      imageData,
      {
        height: 1,
        width: 1,
        matrixSize: 2,
        charset: {
          type: PresetCharset.CUSTOM,
          customChars: '@.'
        },
        outputFormat: OutputFormat.PLAIN_TEXT
      },
      {
        charDataMap,
        now: () => 100
      }
    );

    expect(result.content).toBe('..');
    expect(result.rows).toBe(1);
    expect(result.cols).toBe(2);
    expect(result.metadata.sourceWidth).toBe(2);
    expect(result.metadata.sourceHeight).toBe(2);
    expect(result.metadata.charsetSize).toBe(2);
  });

  test('supports ImageData compatibility alias at compile time', () => {
    const imageData: ImageData = {
      width: 1,
      height: 1,
      data: new Uint8Array([0])
    };

    expect(imageData.width).toBe(1);
  });

  test('rejects invalid CoreImageData before conversion', async () => {
    await expect(
      imageDataToArt(
        {
          width: 2,
          height: 2,
          data: new Uint8Array([255])
        },
        { height: 1, matrixSize: 2 },
        {
          charDataMap: new Map<string, CharMatrix>([['.', makeCharMatrix('.', 1)]])
        }
      )
    ).rejects.toMatchObject({
      code: ErrorCode.INVALID_INPUT,
      messageKey: 'input.imageData.lengthMismatch',
      locale: 'zh-CN'
    });
  });

  test('localizes pure validation errors', async () => {
    await expect(
      imageDataToArt(
        {
          width: 0,
          height: 1,
          data: new Uint8Array()
        },
        { height: 1, matrixSize: 2, locale: 'en-US' },
        {
          charDataMap: new Map<string, CharMatrix>([['.', makeCharMatrix('.', 1)]])
        }
      )
    ).rejects.toMatchObject({
      code: ErrorCode.INVALID_INPUT,
      message: 'imageData.width must be a positive integer',
      messageKey: 'input.imageData.widthPositive',
      locale: 'en-US'
    });
  });

  test('pure source entry does not import Node-only or platform rendering modules', () => {
    const root = join(__dirname, '..', 'src');
    const files = [
      join(root, 'pure.ts'),
      join(root, 'pure', 'imageDataToArt.ts')
    ];
    const source = files.map((file) => readFileSync(file, 'utf8')).join('\n');

    expect(source).not.toMatch(/from ['"]\.\/index['"]/);
    expect(source).not.toMatch(/from ['"]\.\.\/index['"]/);
    expect(source).not.toMatch(/from ['"].*preprocessor['"]/);
    expect(source).not.toMatch(/from ['"].*charRenderer['"]/);
    expect(source).not.toMatch(/require\s*\(/);
    expect(source).not.toMatch(/from ['"](?:node:)?(?:fs|path|os|child_process)['"]/);
    expect(source).not.toMatch(/from ['"]sharp['"]/);
    expect(source).not.toMatch(/from ['"]canvas['"]/);
  });
});
