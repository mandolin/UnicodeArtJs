import {
  BOX_STYLES,
  boxText,
  createGlyphWidthCalculatorFromConfig,
  getBoxStyleMetadata,
  getBoxStyleNames,
  getGlyphWidth,
  normalizeBoxOptions,
  normalizeSpacing,
  padToWidth,
  previewBoxStyle,
  repeatToWidth
} from '../src/index';

describe('box feature', () => {
  test('boxText wraps plain content with the default single style', () => {
    expect(boxText('Hi')).toBe([
      '┌─┐',
      '│Hi│',
      '└─┘'
    ].join('\n'));
  });

  test('boxText can be disabled explicitly', () => {
    expect(boxText('A\nB', false)).toBe('A\nB');
    expect(boxText('A\nB', { enabled: false })).toBe('A\nB');
  });

  test('boxText supports built-in styles', () => {
    expect(boxText('A', { style: 'double' })).toBe([
      '╔═╗',
      '║A ║',
      '╚═╝'
    ].join('\n'));

    expect(boxText('A', { style: 'round' })).toBe([
      '╭─╮',
      '│A │',
      '╰─╯'
    ].join('\n'));

    expect(boxText('A', { style: 'bold' })).toBe([
      '┏━┓',
      '┃A ┃',
      '┗━┛'
    ].join('\n'));

    expect(boxText('A', { style: 'ascii' })).toBe([
      '+-+',
      '|A|',
      '+-+'
    ].join('\n'));
  });

  test('boxText supports padding and content alignment', () => {
    expect(boxText('A\nBC', {
      padding: { top: 1, right: 2, bottom: 1, left: 1 },
      align: 'right'
    })).toBe([
      '┌───┐',
      '│      │',
      '│   A  │',
      '│  BC  │',
      '│      │',
      '└───┘'
    ].join('\n'));
  });

  test('boxText supports margin', () => {
    const result = boxText('A', {
      style: 'classic',
      margin: { top: 1, right: 1, bottom: 1, left: 2 }
    });

    expect(result.split('\n')).toEqual([
      '      ',
      '  +-+ ',
      '  |A| ',
      '  +-+ ',
      '      '
    ]);
  });

  test('boxText supports title on the top border', () => {
    expect(boxText('Hello', {
      title: 'Box',
      padding: 1
    })).toBe([
      '┌ Box ─ ┐',
      '│        │',
      '│ Hello  │',
      '│        │',
      '└────┘'
    ].join('\n'));
  });

  test('boxText supports centered bottom title', () => {
    expect(boxText('ABCD', {
      title: { text: 'T', align: 'center', position: 'bottom', padding: 1 },
      padding: { left: 1, right: 1 }
    })).toBe([
      '┌───┐',
      '│ ABCD │',
      '└  T ─┘'
    ].join('\n'));
  });

  test('boxText respects wide glyph display width under glyph-cell assumptions', () => {
    expect(getGlyphWidth('中A')).toBe(3);
    expect(boxText('中A')).toBe([
      '┌──┐',
      '│中A │',
      '└──┘'
    ].join('\n'));
  });

  test('boxText supports custom box characters', () => {
    expect(boxText('A', {
      style: {
        topLeft: '/',
        top: '=',
        topRight: '\\',
        left: '<',
        right: '>',
        bottomLeft: '\\',
        bottom: '=',
        bottomRight: '/'
      }
    })).toBe([
      '/=\\',
      '<A>',
      '\\=/'
    ].join('\n'));
  });

  test('width helpers pad, crop, and repeat by glyph display width', () => {
    expect(padToWidth('中', 4, 'center')).toBe(' 中 ');
    expect(repeatToWidth('─', 3)).toBe('─ ');
    expect(repeatToWidth('中', 3)).toBe('中 ');
  });

  test('unicode box styles keep every framed line at the same display width', () => {
    const result = boxText('as', {
      style: 'double',
      padding: 0
    });
    const widths = result.split('\n').map((line) => getGlyphWidth(line));

    expect(widths).toEqual([6, 6, 6]);
  });

  test('boxText accepts a configured glyph-width calculator from nested glyphFont fields', () => {
    const calculator = createGlyphWidthCalculatorFromConfig({
      glyphFont: { widthProfile: 'sarasa-mono-sc' },
      glyphWidthProfile: 'default'
    });
    const result = boxText('┌', { style: 'round' }, calculator);
    const widths = result.split('\n').map((line) => getGlyphWidth(line, calculator));

    expect(result).toBe(['╭─╮', '│┌│', '╰─╯'].join('\n'));
    expect(widths).toEqual([3, 3, 3]);
  });

  test('normalize helpers reject invalid values', () => {
    expect(() => normalizeSpacing(-1)).toThrow('Invalid box spacing');
    expect(() => boxText('A', { style: 'missing' as never })).toThrow('Unknown box style');
    expect(() => boxText('A', { mode: 'grid' })).toThrow('Unsupported box mode for post renderStage');
    expect(() => boxText('A', { renderStage: 'layout' })).toThrow('Layout box options require');
    expect(() => boxText('A', { separators: { rows: true } })).toThrow('Box separators and cells are reserved');
    expect(() => boxText('A', { shadow: { offsetX: -1 } })).toThrow('Invalid box shadow offsetX');
  });

  test('normalizeBoxOptions exposes defaults and built-in style metadata', () => {
    const normalized = normalizeBoxOptions({ style: 'round', padding: 1 });

    expect(normalized.enabled).toBe(true);
    expect(normalized.mode).toBe('outer');
    expect(normalized.renderStage).toBe('post');
    expect(normalized.styleName).toBe('round');
    expect(normalized.chars.topLeft).toBe(BOX_STYLES.round.topLeft);
    expect(normalized.padding).toEqual({ top: 1, right: 1, bottom: 1, left: 1 });
    expect(normalized.verticalAlign).toBe('top');
    expect(normalized.height).toBe('auto');
    expect(normalized.overflow).toBe('expand');
    expect(normalized.shadow).toBe(false);
  });

  test('boxText supports fixed height and vertical alignment', () => {
    expect(boxText('A', {
      style: 'ascii',
      height: 3,
      verticalAlign: 'middle'
    })).toBe([
      '+-+',
      '| |',
      '|A|',
      '| |',
      '+-+'
    ].join('\n'));

    expect(boxText('A', {
      style: 'ascii',
      height: 3,
      verticalAlign: 'bottom'
    })).toBe([
      '+-+',
      '| |',
      '| |',
      '|A|',
      '+-+'
    ].join('\n'));
  });

  test('boxText truncates overflowing content when requested', () => {
    expect(boxText('ABCDE\nFGHIJ', {
      style: 'ascii',
      width: 3,
      height: 1,
      overflow: 'truncate'
    })).toBe([
      '+---+',
      '|ABC|',
      '+---+'
    ].join('\n'));
  });

  test('boxText wraps overflowing content by glyph width', () => {
    expect(boxText('ABCDE', {
      style: 'ascii',
      width: 2,
      overflow: 'wrap'
    })).toBe([
      '+--+',
      '|AB|',
      '|CD|',
      '|E |',
      '+--+'
    ].join('\n'));
  });

  test('boxText supports shadows', () => {
    expect(boxText('A', {
      style: 'ascii',
      shadow: { style: 'block', offsetX: 1, offsetY: 1 }
    })).toBe([
      '+-+█',
      '|A|█',
      '+-+█',
      ' ███'
    ].join('\n'));
  });

  test('boxText exposes additional built-in styles', () => {
    expect(BOX_STYLES.singleDouble.left).toBe('║');
    expect(BOX_STYLES.doubleSingle.top).toBe('═');
    expect(BOX_STYLES.arrow.top).toBe('→');
    expect(BOX_STYLES.block.left).toBe('█');
    expect(BOX_STYLES.thick.topLeft).toBe('┏');
  });

  test('box style catalog helpers expose metadata and previews', () => {
    expect(getBoxStyleNames()).toContain('ascii');
    expect(getBoxStyleMetadata('ascii')).toMatchObject({
      name: 'ascii',
      asciiOnly: true
    });
    expect(Array.isArray(getBoxStyleMetadata())).toBe(true);
    expect(previewBoxStyle('ascii', 'Hi')).toBe([
      '+----+',
      '| Hi |',
      '+----+'
    ].join('\n'));
  });
});
