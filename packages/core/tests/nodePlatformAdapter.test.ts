import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodePlatformAdapter } from '../src/platform/node/nodePlatformAdapter';
import { CharType, PresetCharset } from '../src/types/charset';

describe('nodePlatformAdapter', () => {
  test('measures text width through the Node adapter', async () => {
    const width = await nodePlatformAdapter.measureTextWidth('AB', {
      font: 'Noto Sans SC',
      fontSize: 10,
      fontReduce: 1
    });

    expect(width).toBeGreaterThan(0);
  });

  test('renders character matrices through the Node adapter', async () => {
    const matrix = await nodePlatformAdapter.renderCharToMatrix('A', {
      matrixSize: 4,
      font: 'Noto Sans SC',
      fontSize: 4
    });

    expect(matrix).toBeInstanceOf(Float32Array);
    expect(matrix.length).toBe(16);
  });

  test('precomputes character data through the Node adapter', async () => {
    const charData = await nodePlatformAdapter.precomputeCharData({
      charset: {
        type: PresetCharset.CUSTOM,
        customChars: 'A'
      },
      matrixSize: 4,
      font: 'Noto Sans SC',
      fontSize: 4
    });

    expect(charData.get('A')).toMatchObject({
      char: 'A',
      type: CharType.NORMAL,
      width: 4,
      height: 4
    });
  });

  test('rejects non-path image input in the Node adapter', async () => {
    await expect(nodePlatformAdapter.loadImage({})).rejects.toThrow(
      'Node image loading expects a local file path string'
    );
  });

  test('root entry delegates canvas-specific work instead of requiring canvas directly', () => {
    const source = readFileSync(join(__dirname, '..', 'src', 'index.ts'), 'utf8');

    expect(source).not.toMatch(/require\s*\(\s*['"]canvas['"]\s*\)/);
    expect(source).toContain('nodePlatformAdapter');
  });
});
