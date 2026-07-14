import {
  parseSemanticDocumentJson,
  parseSemanticDsl,
  validateSemanticDocument
} from '../src';
import { ErrorCode, UnicodeArtError } from '../src/types/output';

describe('semantic document parsing', () => {
  test('validates the canonical V1 JSON AST', () => {
    const document = validateSemanticDocument({
      version: 1,
      rows: [
        {
          role: 'header',
          cells: [{ role: 'column-header', blocks: [{ kind: 'raw-text', text: '名称' }] }]
        },
        {
          cells: [{ blocks: [{ kind: 'art-text', text: 'UnicodeArt' }], colSpan: 2 }]
        }
      ],
      options: { glyphWidthProfile: 'sarasa-mono-sc' }
    });

    expect(document.version).toBe(1);
    expect(document.rows[0].role).toBe('header');
    expect(document.rows[1].cells[0].colSpan).toBe(2);
  });

  test('parses roles, recommended span tags, legacy aliases and raw blocks from DSL', () => {
    const document = parseSemanticDsl(
      '{h}标题 1|标题 2{n}{rowspan:2}字符画 {t:原字\\|输出}|{colspan:2}内容{n}{c:2}兼容跨行|{r:2}兼容跨列',
      { rowSeparator: 'semantic' }
    );

    expect(document.rows).toHaveLength(3);
    expect(document.rows[0].role).toBe('header');
    expect(document.rows[1].cells[0]).toMatchObject({ rowSpan: 2 });
    expect(document.rows[1].cells[0].blocks).toEqual([
      { kind: 'art-text', text: '字符画 ' },
      { kind: 'raw-text', text: '原字|输出' }
    ]);
    expect(document.rows[1].cells[1].colSpan).toBe(2);
    expect(document.rows[2].cells[0].rowSpan).toBe(2);
    expect(document.rows[2].cells[1].colSpan).toBe(2);
  });

  test('supports line-break and paired line-boundary modes', () => {
    expect(parseSemanticDsl('A|B\n{f}C|D').rows[1].role).toBe('footer');
    expect(parseSemanticDsl('A|B{n}\nC|D', { rowSeparator: 'both' }).rows).toHaveLength(2);
    expectUnicodeArtError(
      () => parseSemanticDsl('A|B{n}C|D', { rowSeparator: 'both' }),
      ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED
    );
  });

  test('parses canonical JSON strings and rejects unknown fields', () => {
    expect(parseSemanticDocumentJson('{"version":1,"rows":[{"cells":[{"blocks":[{"kind":"raw-text","text":"ok"}]}]}]}').rows)
      .toHaveLength(1);

    expectUnicodeArtError(
      () => validateSemanticDocument({ version: 1, rows: [], typo: true }),
      ErrorCode.SEMANTIC_DOCUMENT_INVALID
    );
  });

  test('validates an embedded UAF font block and rejects missing font data', () => {
    const document = validateSemanticDocument({
      version: 1,
      rows: [{
        cells: [{
          blocks: [{ kind: 'art-font-text', text: 'A', font: createReferenceFont() }]
        }]
      }]
    });

    expect(document.rows[0].cells[0].blocks[0]).toMatchObject({
      kind: 'art-font-text',
      text: 'A',
      font: { format: 'unicode-art-font', version: 1 }
    });
    expectUnicodeArtError(
      () => validateSemanticDocument({
        version: 1,
        rows: [{ cells: [{ blocks: [{ kind: 'art-font-text', text: 'A' }] }] }]
      }),
      ErrorCode.SEMANTIC_DOCUMENT_INVALID
    );
  });

  test('reports syntax problems as UnicodeArtError with a machine-readable code', () => {
    try {
      parseSemanticDsl('A|{t:broken', { rowSeparator: 'semantic' });
      throw new Error('Expected parser to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(UnicodeArtError);
      expect((error as UnicodeArtError).code).toBe(ErrorCode.SEMANTIC_DOCUMENT_PARSE_FAILED);
    }
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

function createReferenceFont(): Record<string, unknown> {
  return {
    format: 'unicode-art-font',
    version: 1,
    meta: {
      id: 'org.unicodeartjs.semantic-reference',
      name: 'Semantic Reference',
      authors: ['UnicodeArtJs'],
      license: { expression: 'MIT', origin: 'original' }
    },
    metrics: { height: 2, defaultAdvance: 2 },
    glyphs: { A: { lines: ['/\\', '||'] } }
  };
}
