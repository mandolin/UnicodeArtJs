import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(packageRoot, 'public', 'docs', 'manifest.json');

test('public docs manifest is available and does not leak internal paths', () => {
  assert.ok(fs.existsSync(manifestPath), 'Run npm run docs:public-site before Web tests.');
  const text = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(text);

  assert.equal(manifest.contract, 'unicodeartjs-public-docs-site-manifest');
  assert.equal(manifest.entries.length, 4);
  assert.equal(manifest.architecture.contract, 'unicodeartjs-developer-docs-architecture');
  assert.equal(manifest.architecture.sections.length, 8);
  assert.equal(manifest.apiReference.contract, 'unicodeartjs-public-api-reference');
  assert.equal(manifest.apiReference.entries.length, 4);
  assert.ok(manifest.apiReference.symbolCount >= 150);
  assert.ok(manifest.apiReference.sourceFileCount >= 40);
  assert.ok(manifest.entries.every((entry) => entry.guideUrl.startsWith('https://github.com/mandolin/UnicodeArtJs/')));
  assert.ok(manifest.architecture.sections.every((section) => section.docs.length > 0));
  assert.ok(
    manifest.architecture.sections
      .flatMap((section) => section.docs)
      .every((doc) => doc.url.startsWith('https://github.com/mandolin/UnicodeArtJs/')),
  );
  assert.ok(
    manifest.apiReference.entries
      .flatMap((entry) => entry.symbols)
      .every((symbol) => symbol.source.url.startsWith('https://github.com/mandolin/UnicodeArtJs/')),
  );
  assert.ok(
    manifest.apiReference.entries
      .find((entry) => entry.entryId === 'core-tsdoc')
      .symbols
      .some((symbol) => symbol.name === 'textToArt'),
  );

  for (const fragment of ['.generated-docs', 'work-zone', 'ai/codex', 'K:\\', 'C:\\']) {
    assert.equal(text.includes(fragment), false, `public docs manifest leaks ${fragment}`);
  }
});
