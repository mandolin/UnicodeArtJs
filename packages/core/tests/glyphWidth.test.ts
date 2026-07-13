import {
  createGlyphWidthCalculator,
  getGlyphWidthProfiles,
  validateConfig
} from '../src';
import { ErrorCode, UnicodeArtError } from '../src/types/output';

describe('glyph width calculator', () => {
  test('keeps the historical reference width as the default', () => {
    const calculator = createGlyphWidthCalculator();

    expect(calculator.getTextWidth('A中┌')).toBe(5);
    expect(calculator.getGlyphWidth('A')).toBe(1);
    expect(calculator.getGlyphWidth('中')).toBe(2);
    expect(calculator.getGlyphWidth('┌')).toBe(2);
  });

  test('uses experimental mixed-monospace profiles for box drawing glyphs', () => {
    const calculator = createGlyphWidthCalculator({ profile: 'sarasa-mono-sc' });

    expect(calculator.getTextWidth('A中┌')).toBe(4);
    expect(calculator.getGlyphWidth('┌')).toBe(1);
    expect(calculator.getGlyphWidth('中')).toBe(2);
  });

  test('uses a custom character class as the complete wide-glyph rule', () => {
    const calculator = createGlyphWidthCalculator({ wideCharRegex: '[A-Z]' });

    expect(calculator.getTextWidth('A中B')).toBe(5);
    expect(calculator.getGlyphWidth('中')).toBe(1);
  });

  test('rejects unknown profiles and unsafe regex forms with structured errors', () => {
    expect(() => createGlyphWidthCalculator({ profile: 'future-font' })).toThrow(UnicodeArtError);
    expect(() => createGlyphWidthCalculator({ wideCharRegex: '.*' })).toThrow(UnicodeArtError);

    try {
      createGlyphWidthCalculator({ wideCharRegex: '.*' });
    } catch (error) {
      expect((error as UnicodeArtError).code).toBe(ErrorCode.GLYPH_WIDTH_REGEX_INVALID);
    }
  });

  test('validates glyph-width config before conversion starts', () => {
    expectUnicodeArtError(
      () => validateConfig({ height: 4, glyphWidthProfile: 'unknown' }),
      ErrorCode.GLYPH_WIDTH_PROFILE_INVALID
    );
  });

  test('exposes profile metadata without sharing mutable definitions', () => {
    const profiles = getGlyphWidthProfiles();
    profiles[0].label = 'changed';

    expect(getGlyphWidthProfiles()[0].label).toBe('Unicode 参考宽度');
  });
});

function expectUnicodeArtError(action: () => unknown, code: ErrorCode): void {
  try {
    action();
    throw new Error('Expected UnicodeArtError');
  } catch (error) {
    expect(error).toBeInstanceOf(UnicodeArtError);
    expect((error as UnicodeArtError).code).toBe(code);
  }
}
