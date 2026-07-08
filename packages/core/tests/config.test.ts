import {
  calcDisplayWidth,
  getPresetChars,
  isWideChar,
  validateConfig,
  VERSION
} from '../src';
import { DEFAULT_ASCII_CHARS, EXTENDED_CHARS } from '../src/constants';
import { PresetCharset } from '../src/types/charset';
import { OutputFormat } from '../src/types/output';
import { FontStyle, normalizeArtConfigAliases } from '../src/types/config';

describe('public configuration helpers', () => {
  test('validateConfig preserves outputFormat and wideCharRatio', () => {
    const config = validateConfig({
      height: 10,
      outputFormat: OutputFormat.HTML,
      wideCharRatio: 2.25
    });

    expect(config.outputFormat).toBe(OutputFormat.HTML);
    expect(config.wideCharRatio).toBe(2.25);
  });

  test('validateConfig defaults box to disabled', () => {
    const config = validateConfig({ height: 10 });

    expect(config.box).toBe(false);
  });

  test('validateConfig preserves valid box options', () => {
    const config = validateConfig({
      height: 10,
      box: {
        style: 'double',
        padding: 1,
        title: { text: 'Demo', align: 'center' }
      }
    });

    expect(config.box).toEqual({
      style: 'double',
      padding: 1,
      title: { text: 'Demo', align: 'center' }
    });
  });

  test('validateConfig accepts phase-4 box options', () => {
    const config = validateConfig({
      height: 10,
      box: {
        style: 'ascii',
        width: 8,
        height: 3,
        verticalAlign: 'middle',
        overflow: 'wrap',
        shadow: { style: 'block', offsetX: 1, offsetY: 1 }
      }
    });

    expect(config.box).toEqual({
      style: 'ascii',
      width: 8,
      height: 3,
      verticalAlign: 'middle',
      overflow: 'wrap',
      shadow: { style: 'block', offsetX: 1, offsetY: 1 }
    });
  });

  test('validateConfig accepts phase-5 layout box options', () => {
    const config = validateConfig({
      height: 4,
      box: {
        renderStage: 'layout',
        mode: 'grid',
        style: 'ascii',
        separators: { rows: true, columns: true },
        cell: { padding: 1, minWidth: 2, minHeight: 2 }
      }
    });

    expect(config.box).toEqual({
      renderStage: 'layout',
      mode: 'grid',
      style: 'ascii',
      separators: { rows: true, columns: true },
      cell: { padding: 1, minWidth: 2, minHeight: 2 }
    });
  });

  test('validateConfig rejects unsupported box options', () => {
    expect(() => validateConfig({ height: 10, box: { mode: 'grid' } })).toThrow(/box/);
    expect(() => validateConfig({ height: 10, box: { style: 'missing' as never } })).toThrow(/box/);
    expect(() => validateConfig({ height: 10, box: { overflow: 'clip' as never } })).toThrow(/box/);
    expect(() => validateConfig({ height: 10, box: { verticalAlign: 'center' as never } })).toThrow(/box/);
    expect(() => validateConfig({ height: 10, box: { shadow: { offsetY: -1 } } })).toThrow(/box/);
  });

  test('validateConfig rejects invalid wideCharRatio', () => {
    expect(() => validateConfig({ height: 10, wideCharRatio: 0 })).toThrow(
      'wideCharRatio必须在0-10之间'
    );
  });

  test('getPresetChars returns configured presets', () => {
    expect(getPresetChars(PresetCharset.ASCII)).toBe(DEFAULT_ASCII_CHARS);
    expect(getPresetChars(PresetCharset.EXTENDED)).toBe(EXTENDED_CHARS);
  });

  test('getPresetChars rejects unsupported presets', () => {
    expect(() => getPresetChars('UNKNOWN' as PresetCharset)).toThrow('不支持的字符集类型');
  });

  test('validateConfig rejects invalid dimensions and ratios', () => {
    expect(() => validateConfig({ matrixSize: 1, height: 10 })).toThrow(
      'matrixSize必须在2-20之间'
    );
    expect(() => validateConfig({ ratio: 4, height: 10 })).toThrow('ratio必须在1.0-3.0之间');
    expect(() => validateConfig({ height: 0 })).toThrow('必须指定height或width至少一个');
    expect(() => validateConfig({ width: -1 })).toThrow('width必须大于0');
  });

  test('validateConfig localizes public config errors', () => {
    expect(() => validateConfig({ matrixSize: 1, height: 10, locale: 'en-US' })).toThrow(
      'matrixSize must be between 2 and 20'
    );
  });

  test('validateConfig normalizes unified visual and glyph font config', () => {
    const config = validateConfig({
      height: 10,
      font: 'LegacyFont',
      fontStyle: FontStyle.BOLD,
      fontReduce: 2,
      visualFont: {
        family: 'VisualFont',
      },
      glyphFont: {
        family: 'GlyphFont',
        widthProfile: 'nsimsun',
        wideCharRegex: '[A-Z]'
      },
      outputFormat: OutputFormat.HTML
    });

    expect(config.font).toBe('VisualFont');
    expect(config.fontStyle).toBe(FontStyle.BOLD);
    expect(config.fontReduce).toBe(2);
    expect(config.visualFont).toEqual({
      family: 'VisualFont',
      style: FontStyle.BOLD,
      reduce: 2
    });
    expect(config.glyphFontFamily).toBe('GlyphFont');
    expect(config.glyphWidthProfile).toBe('nsimsun');
    expect(config.wideCharRegex).toBe('[A-Z]');
    expect(config.outputTarget).toBe('html');
  });

  test('normalizeArtConfigAliases keeps legacy fields as aliases', () => {
    const config = normalizeArtConfigAliases({
      font: 'Noto Sans SC',
      fontReduce: 1,
      glyphFontFamily: 'Sarasa Mono SC',
      glyphWidthProfile: 'default'
    });

    expect(config.visualFont?.family).toBe('Noto Sans SC');
    expect(config.visualFont?.reduce).toBe(1);
    expect(config.glyphFont?.family).toBe('Sarasa Mono SC');
    expect(config.glyphFont?.widthProfile).toBe('default');
  });

  test('getPresetChars localizes unsupported preset errors', () => {
    expect(() => getPresetChars('UNKNOWN' as PresetCharset, 'en-US')).toThrow(
      'Unsupported charset type'
    );
  });

  test('public utility exports are available', () => {
    expect(isWideChar('中')).toBe(true);
    expect(calcDisplayWidth('A中')).toBe(3);
    expect(VERSION).toBe('1.0.0');
  });
});
