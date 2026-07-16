/**
 * Web 工作区对 UAF / 语义布局 beta fixture 的消费测试。
 *
 * 这里不启动浏览器；目标是确认 Web 包在普通 Node 测试中能复用 Core 的同一份
 * canonical JSON 与 golden 输出，避免 Web 侧维护另一套格式解释。
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(testDirectory, '..', '..', 'core', 'tests', 'fixtures', 'semantic-uaf-beta');
const require = createRequire(import.meta.url);
const {
  OutputFormat,
  parseSemanticDocumentJson,
  parseUnicodeArtFontJson,
  renderUnicodeArtFontText,
  semanticDocumentToArt,
} = require('../../core/dist/index.cjs.js');

test('web package consumes the canonical UAF beta fixture', async () => {
  const font = parseUnicodeArtFontJson(await readFixture('beta-font.uafont.json'), { locale: 'zh-CN' });
  const rendered = renderUnicodeArtFontText(font, 'UAJ', { locale: 'zh-CN' });

  assert.equal(rendered.content, await readFixture('expected-font.txt'));
  assert.equal(rendered.rows, 2);
  assert.equal(rendered.cols, 8);
});

test('web package consumes the canonical semantic layout beta fixture', async () => {
  const document = parseSemanticDocumentJson(await readFixture('beta-document.uadoc.json'), { locale: 'zh-CN' });
  const result = await semanticDocumentToArt(document, {
    height: 4,
    outputFormat: OutputFormat.PLAIN_TEXT,
    box: {
      style: 'ascii',
      renderStage: 'layout',
      mode: 'grid',
      separators: { rows: true, columns: true },
      cell: { padding: { left: 1, right: 1 } },
    },
    locale: 'zh-CN',
  }, { grid: true });

  assert.equal(result.content, await readFixture('expected-document.txt'));
  assert.equal(result.rows, 8);
  assert.equal(result.cols, 19);
});

async function readFixture(name) {
  const text = await readFile(path.join(fixtureRoot, name), 'utf8');
  return text.replace(/\r\n/gu, '\n').trimEnd();
}
