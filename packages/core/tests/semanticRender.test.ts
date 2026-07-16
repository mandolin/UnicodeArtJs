import {
  renderSemanticDocumentWithAdapter,
  validateConfig,
  type ArtConfig,
  type UnicodeArtFont,
  type SemanticDocumentV1
} from '../src';
import { ErrorCode, OutputFormat, type ArtResult } from '../src/types/output';

const config = (overrides: Partial<ArtConfig> = {}): ArtConfig => validateConfig({
  height: 4,
  box: {
    style: 'ascii',
    renderStage: 'layout',
    mode: 'grid',
    separators: { rows: true, columns: true }
  },
  ...overrides
});

const renderArtText = async (text: string): Promise<ArtResult> => ({
  content: text === 'art' ? '##\n##' : text,
  format: OutputFormat.PLAIN_TEXT,
  rows: text === 'art' ? 2 : 1,
  cols: text === 'art' ? 2 : text.length,
  duration: 0,
  metadata: { sourceWidth: 0, sourceHeight: 0, charset: 'test', matrixSize: 1 }
});

describe('semantic document layout renderer', () => {
  test('renders headers, raw blocks, art blocks and a grid from one AST', async () => {
    const document: SemanticDocumentV1 = {
      version: 1,
      rows: [
        {
          role: 'header',
          cells: [
            { blocks: [{ kind: 'raw-text', text: 'Name' }] },
            { blocks: [{ kind: 'raw-text', text: 'Value' }] }
          ]
        },
        {
          cells: [
            { blocks: [{ kind: 'raw-text', text: 'raw' }] },
            { blocks: [{ kind: 'art-text', text: 'art' }] }
          ]
        }
      ]
    };

    const result = await renderSemanticDocumentWithAdapter(document, config(), renderArtText);

    expect(result.content).toBe([
      '+----------+',
      '|Name|Value|',
      '|----+-----|',
      '|raw |##   |',
      '|    |##   |',
      '+----------+'
    ].join('\n'));
    expect(result.rows).toBe(6);
    expect(result.cols).toBe(12);
    expect(result.metadata.semanticDocumentVersion).toBe(1);
    expect(result.metadata.semanticColumns).toBe(2);
  });

  test('removes internal borders for colSpan and keeps the table width stable', async () => {
    const document: SemanticDocumentV1 = {
      version: 1,
      rows: [
        { cells: [{ colSpan: 2, blocks: [{ kind: 'raw-text', text: 'wide' }] }] },
        {
          cells: [
            { blocks: [{ kind: 'raw-text', text: 'A' }] },
            { blocks: [{ kind: 'raw-text', text: 'B' }] }
          ]
        }
      ]
    };

    const result = await renderSemanticDocumentWithAdapter(document, config(), renderArtText);

    expect(result.content).toBe([
      '+----+',
      '|wide|',
      '|--+-|',
      '|A |B|',
      '+----+'
    ].join('\n'));
  });

  test('allows rowSpan cells to continue through an inner row boundary', async () => {
    const document: SemanticDocumentV1 = {
      version: 1,
      rows: [
        {
          cells: [
            { rowSpan: 2, blocks: [{ kind: 'raw-text', text: 'A' }] },
            { blocks: [{ kind: 'raw-text', text: 'B1' }] }
          ]
        },
        { cells: [{ blocks: [{ kind: 'raw-text', text: 'B2' }] }] }
      ]
    };

    const result = await renderSemanticDocumentWithAdapter(document, config(), renderArtText);
    const widths = result.content.split('\n').map((line) => line.length);

    expect(result.content).toContain('|A|B1|');
    expect(result.content).toContain('| +--|');
    expect(result.content).toContain('| |B2|');
    expect(new Set(widths).size).toBe(1);
  });

  test('uses document-level glyph width options for output columns', async () => {
    const document: SemanticDocumentV1 = {
      version: 1,
      options: { glyphWidthProfile: 'sarasa-mono-sc' },
      rows: [{ cells: [{ blocks: [{ kind: 'raw-text', text: '┌' }] }] }]
    };

    const result = await renderSemanticDocumentWithAdapter(
      document,
      config({ box: false }),
      renderArtText,
      { grid: false }
    );

    expect(result.content).toBe('┌');
    expect(result.cols).toBe(1);
  });

  test('uses nested glyphFont width profile for semantic table and outer Box layout', async () => {
    const document: SemanticDocumentV1 = {
      version: 1,
      rows: [{ cells: [{ blocks: [{ kind: 'raw-text', text: '┌' }] }] }]
    };
    const result = await renderSemanticDocumentWithAdapter(
      document,
      config({
        box: {
          style: 'round',
          renderStage: 'layout',
          mode: 'grid',
          separators: { rows: true, columns: true }
        },
        glyphFont: { widthProfile: 'sarasa-mono-sc' },
        glyphWidthProfile: 'default'
      }),
      renderArtText
    );

    expect(result.content).toBe(['╭─╮', '│┌│', '╰─╯'].join('\n'));
    expect(result.cols).toBe(3);
  });

  test('mixes embedded art-font and raw blocks through the shared table and Box layout', async () => {
    const document: SemanticDocumentV1 = {
      version: 1,
      rows: [{
        cells: [{
          blocks: [
            { kind: 'raw-text', text: '>' },
            { kind: 'art-font-text', text: 'A', font: createReferenceFont() }
          ]
        }]
      }]
    };
    const failIfCalled = async (): Promise<ArtResult> => {
      throw new Error('art-font-text must not invoke the regular text renderer');
    };

    const result = await renderSemanticDocumentWithAdapter(document, config(), failIfCalled);

    expect(result.content).toBe(['+---+', '|>/\\|', '| |||', '+---+'].join('\n'));
    expect(result.rows).toBe(4);
    expect(result.cols).toBe(5);
  });

  test('reports span bounds with a machine-readable semantic error code', async () => {
    const document: SemanticDocumentV1 = {
      version: 1,
      rows: [{ cells: [{ rowSpan: 2, blocks: [{ kind: 'raw-text', text: 'A' }] }] }]
    };

    await expect(renderSemanticDocumentWithAdapter(document, config(), renderArtText)).rejects.toMatchObject({
      code: ErrorCode.SEMANTIC_DOCUMENT_INVALID
    });
  });
});

function createReferenceFont(): UnicodeArtFont {
  return {
    format: 'unicode-art-font',
    version: 1,
    meta: {
      id: 'org.unicodeartjs.semantic-render-reference',
      name: 'Semantic Render Reference',
      authors: ['UnicodeArtJs'],
      license: { expression: 'MIT', origin: 'original' }
    },
    metrics: { height: 2, defaultAdvance: 2 },
    glyphs: { A: { lines: ['/\\', '||'] } }
  };
}
