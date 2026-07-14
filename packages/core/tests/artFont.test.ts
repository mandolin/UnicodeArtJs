import {
  getUnicodeArtFontGlyphDisplayWidth,
  isPermissiveUnicodeArtFontLicense,
  isSpdxExpressionSyntax,
  measureUnicodeArtFontText,
  parseUnicodeArtFontJson,
  resolveUnicodeArtFontGlyph,
  validateUnicodeArtFont
} from '../src';
import { ErrorCode, UnicodeArtError } from '../src/types/output';

describe('Unicode art font documents', () => {
  test('normalizes a versioned original font and resolves its fallback glyph', () => {
    const font = validateUnicodeArtFont(createReferenceFont());

    expect(font).toMatchObject({
      format: 'unicode-art-font',
      version: 1,
      metrics: { height: 2, defaultAdvance: 2, letterSpacing: 0, direction: 'ltr' }
    });
    expect(resolveUnicodeArtFontGlyph(font, 'A')).toMatchObject({
      key: 'A', missing: false, usedFallback: false, advance: 2
    });
    expect(resolveUnicodeArtFontGlyph(font, 'Ω')).toMatchObject({
      key: '?', missing: true, usedFallback: true, advance: 2
    });
  });

  test('parses JSON and measures fallback, spacing and multiline text deterministically', () => {
    const source = JSON.stringify(createReferenceFont({
      metrics: {
        height: 2,
        defaultAdvance: 2,
        letterSpacing: 1,
        fallbackGlyph: '?'
      }
    }));
    const font = parseUnicodeArtFontJson(source);
    const measurement = measureUnicodeArtFontText(font, 'AΩ\nA');

    expect(measurement).toEqual({
      rows: 4,
      cols: 5,
      lines: [
        { text: 'AΩ', cols: 5, glyphCount: 2 },
        { text: 'A', cols: 2, glyphCount: 1 }
      ],
      missingGlyphs: ['Ω']
    });
  });

  test('uses the active width profile for artwork measurement', () => {
    const font = validateUnicodeArtFont({
      format: 'unicode-art-font',
      version: 1,
      meta: {
        id: 'org.unicodeartjs.box-demo',
        name: 'Box Demo',
        authors: ['UnicodeArtJs'],
        license: { expression: 'MIT', origin: 'original' }
      },
      metrics: {
        height: 1,
        defaultAdvance: 3,
        glyphWidthProfile: 'sarasa-mono-sc'
      },
      glyphs: {
        A: { lines: ['┌─┐'] }
      }
    });

    expect(getUnicodeArtFontGlyphDisplayWidth(font, 'A')).toBe(3);
    expect(measureUnicodeArtFontText(font, 'A').cols).toBe(3);
    expect(measureUnicodeArtFontText(font, 'A', { glyphWidthProfile: 'default' }).cols).toBe(6);
  });

  test('rejects unknown fields, dangling fallback and lossy trailing whitespace', () => {
    expectUnicodeArtError(
      () => validateUnicodeArtFont({ ...createReferenceFont(), typo: true }),
      ErrorCode.ART_FONT_INVALID
    );
    expectUnicodeArtError(
      () => validateUnicodeArtFont(createReferenceFont({
        metrics: { height: 2, defaultAdvance: 2, fallbackGlyph: 'Z' }
      })),
      ErrorCode.ART_FONT_INVALID
    );
    expectUnicodeArtError(
      () => validateUnicodeArtFont(createReferenceFont({
        glyphs: { A: { lines: ['A ', 'A'] }, '?': { lines: ['??', '??'] } }
      })),
      ErrorCode.ART_FONT_INVALID
    );
  });

  test('requires provenance for imported content and keeps license policy separate from syntax', () => {
    expectUnicodeArtError(
      () => validateUnicodeArtFont(createReferenceFont({
        meta: {
          id: 'org.unicodeartjs.imported-demo',
          name: 'Imported Demo',
          authors: ['UnicodeArtJs'],
          license: { expression: 'BSD-3-Clause', origin: 'imported' }
        }
      })),
      ErrorCode.ART_FONT_LICENSE_INVALID
    );

    expect(isSpdxExpressionSyntax('MIT OR Apache-2.0')).toBe(true);
    expect(isSpdxExpressionSyntax('MIT OR')).toBe(false);
    expect(isPermissiveUnicodeArtFontLicense('MIT OR Apache-2.0')).toBe(true);
    expect(isPermissiveUnicodeArtFontLicense('GPL-3.0-only')).toBe(false);
    expect(isPermissiveUnicodeArtFontLicense('MIT WITH LLVM-exception')).toBe(false);
  });
});

function createReferenceFont(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const base = {
    format: 'unicode-art-font',
    version: 1,
    meta: {
      id: 'org.unicodeartjs.reference-line',
      name: 'Reference Line',
      authors: ['UnicodeArtJs'],
      license: { expression: 'MIT', origin: 'original' },
      creation: { method: 'human', tool: 'test-fixture' }
    },
    metrics: {
      height: 2,
      defaultAdvance: 2,
      fallbackGlyph: '?'
    },
    glyphs: {
      A: { lines: ['/\\', '||'] },
      '?': { lines: ['??', '??'] }
    }
  };
  return { ...base, ...overrides };
}

function expectUnicodeArtError(action: () => unknown, code: ErrorCode): void {
  try {
    action();
    throw new Error('Expected UnicodeArtError');
  } catch (error) {
    expect(error).toBeInstanceOf(UnicodeArtError);
    expect((error as UnicodeArtError).code).toBe(code);
  }
}
