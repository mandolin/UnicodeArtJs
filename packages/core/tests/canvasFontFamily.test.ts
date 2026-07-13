import { formatCanvasFontFamily } from '../src/utils/canvasFontFamily';

describe('formatCanvasFontFamily', () => {
  test('preserves a CSS fallback list instead of quoting it as one family', () => {
    const family = "'Sarasa Mono SC', 'Sarasa Term SC', monospace";

    expect(formatCanvasFontFamily(family)).toBe(family);
  });

  test('trims a single family name and supplies a stable fallback', () => {
    expect(formatCanvasFontFamily('  Noto Sans SC  ')).toBe('Noto Sans SC');
    expect(formatCanvasFontFamily('')).toBe('monospace');
    expect(formatCanvasFontFamily(undefined)).toBe('monospace');
  });
});
