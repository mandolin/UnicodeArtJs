import fs from 'node:fs';
import path from 'node:path';

import {
  OutputFormat,
  parseSemanticDocumentJson,
  parseUnicodeArtFontJson,
  renderUnicodeArtFontText,
  semanticDocumentToArt,
  validateConfig
} from '../src';

const fixtureRoot = path.join(__dirname, 'fixtures', 'semantic-uaf-beta');

const betaRenderConfig = validateConfig({
  height: 4,
  outputFormat: OutputFormat.PLAIN_TEXT,
  box: {
    style: 'ascii',
    renderStage: 'layout',
    mode: 'grid',
    separators: { rows: true, columns: true },
    cell: { padding: { left: 1, right: 1 } }
  },
  locale: 'zh-CN'
});

describe('semantic document and UAF beta fixtures', () => {
  test('renders the canonical UAF font fixture exactly', () => {
    const font = parseUnicodeArtFontJson(readFixture('beta-font.uafont.json'), { locale: 'zh-CN' });
    const expected = readFixture('expected-font.txt');
    const result = renderUnicodeArtFontText(font, 'UAJ', { locale: 'zh-CN' });

    expect(result.content).toBe(expected);
    expect(result.rows).toBe(2);
    expect(result.cols).toBe(8);
    expect(result.missingGlyphs).toEqual([]);
  });

  test('renders the canonical semantic document fixture exactly', async () => {
    const document = parseSemanticDocumentJson(readFixture('beta-document.uadoc.json'), { locale: 'zh-CN' });
    const expected = readFixture('expected-document.txt');
    const result = await semanticDocumentToArt(document, betaRenderConfig, { grid: true });

    expect(result.content).toBe(expected);
    expect(result.rows).toBe(8);
    expect(result.cols).toBe(19);
    expect(result.metadata.semanticDocumentVersion).toBe(1);
    expect(result.metadata.semanticRows).toBe(3);
    expect(result.metadata.semanticColumns).toBe(2);
  });
});

function readFixture(name: string): string {
  return fs.readFileSync(path.join(fixtureRoot, name), 'utf8').replace(/\r\n/gu, '\n').trimEnd();
}
