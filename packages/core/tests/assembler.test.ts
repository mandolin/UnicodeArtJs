import {
  assembleANSI,
  assembleHTML,
  assembleOutput,
  assemblePlainText,
  trimTrailingSpaces
} from '../src/assembler';
import { Interpolation, type ArtConfig } from '../src/types/config';
import { PresetCharset } from '../src/types/charset';
import { OutputFormat } from '../src/types/output';

function config(overrides: Partial<ArtConfig> = {}): ArtConfig {
  return {
    height: 2,
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

describe('assembler', () => {
  test('trimTrailingSpaces removes only trailing whitespace', () => {
    expect(trimTrailingSpaces('  A  ')).toBe('  A');
  });

  test('assemblePlainText respects trimTrailingSpaces', () => {
    const text = assemblePlainText(
      [['A', ' ', ' '], ['B', ' ', 'C']],
      config({ trimTrailingSpaces: true })
    );

    expect(text).toBe('A\nB C');
  });

  test('assemblePlainText applies outer box when enabled', () => {
    const text = assemblePlainText(
      [['A', 'B'], ['中']],
      config({ box: { style: 'single' } })
    );

    expect(text).toBe('┌─┐\n│AB│\n│中│\n└─┘');
  });

  test('assemblePlainText keeps legacy output when box is disabled by object', () => {
    const text = assemblePlainText(
      [['A', 'B'], ['C', 'D']],
      config({ box: { enabled: false, style: 'double' } })
    );

    expect(text).toBe('AB\nCD');
  });

  test('assembleHTML escapes content and applies inverted colors', () => {
    const html = assembleHTML(
      [['<', '&', '>']],
      config({ invert: true }),
      { sourceWidth: 3, sourceHeight: 1, charset: 'test', matrixSize: 2 }
    );

    expect(html).toContain('&lt;&amp;&gt;');
    expect(html).toContain('background-color: #000000');
    expect(html).toContain('color: #FFFFFF');
  });

  test('assembleHTML includes escaped boxed content', () => {
    const html = assembleHTML(
      [['<', '>']],
      config({ box: { style: 'ascii' } })
    );

    expect(html).toContain('+--+');
    expect(html).toContain('|&lt;&gt;|');
  });

  test('assembleOutput returns requested format and metadata duration', () => {
    const result = assembleOutput(
      [['A']],
      config(),
      OutputFormat.HTML,
      { sourceWidth: 1, sourceHeight: 1, charset: 'test', matrixSize: 2, duration: 42 }
    );

    expect(result.format).toBe(OutputFormat.HTML);
    expect(result.duration).toBe(42);
    expect(result.content).toContain('<!DOCTYPE html>');
  });

  test('assembleANSI emits terminal color codes', () => {
    const ansi = assembleANSI([['A']], config({ invert: true }));

    expect(ansi).toContain('\x1b[38;2;255;255;255m');
    expect(ansi).toContain('\x1b[0m');
  });

  test('assembleANSI colors boxed lines', () => {
    const ansi = assembleANSI([['A']], config({ box: { style: 'round' } }));

    expect(ansi).toContain('╭─╮');
    expect(ansi).toContain('│A │');
  });

  test('assembleOutput reports boxed rows and glyph columns', () => {
    const result = assembleOutput(
      [['A', 'B'], ['中']],
      config({ box: { style: 'single', padding: { left: 1, right: 1 } } }),
      OutputFormat.PLAIN_TEXT,
      { sourceWidth: 2, sourceHeight: 2, charset: 'test', matrixSize: 2 }
    );

    expect(result.content).toBe('┌──┐\n│ AB │\n│ 中 │\n└──┘');
    expect(result.rows).toBe(4);
    expect(result.cols).toBe(8);
  });

  test('assembleOutput rejects unsupported formats', () => {
    expect(() =>
      assembleOutput(
        [['A']],
        config(),
        'markdown' as OutputFormat,
        { sourceWidth: 1, sourceHeight: 1, charset: 'test', matrixSize: 2 }
      )
    ).toThrow('不支持的输出格式');
  });
});
