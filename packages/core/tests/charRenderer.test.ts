import {
  loadFont,
  precomputeCharData,
  renderCharToMatrix
} from '../src/charRenderer';
import { CharType, PresetCharset } from '../src/types/charset';

describe('charRenderer', () => {
  test('renders a normal character to a square matrix', async () => {
    const matrix = await renderCharToMatrix('A', 4, 'Noto Sans SC', 16, 0);

    expect(matrix).toBeInstanceOf(Float32Array);
    expect(matrix).toHaveLength(16);
    expect(Math.min(...matrix)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...matrix)).toBeLessThanOrEqual(1);
  });

  test('renders a wide character to a double-width matrix', async () => {
    const matrix = await renderCharToMatrix('中', 4, 'Noto Sans SC', 16, 0);

    expect(matrix).toHaveLength(32);
  });

  test('precomputes preset character data and classifies widths', async () => {
    const data = await precomputeCharData(
      { type: PresetCharset.CUSTOM, customChars: 'A中' },
      4,
      'Noto Sans SC',
      16,
      0
    );

    expect(data.get('A')?.type).toBe(CharType.NORMAL);
    expect(data.get('A')?.width).toBe(4);
    expect(data.get('中')?.type).toBe(CharType.WIDE);
    expect(data.get('中')?.width).toBe(8);
  });

  test('loadFont returns system font names without registration', async () => {
    await expect(loadFont('Noto Sans SC')).resolves.toBe('Noto Sans SC');
  });
});
