#!/usr/bin/env node

/**
 * 校验 UAF 与语义布局 beta 契约。
 *
 * 该脚本保护公开文档、canonical fixtures、Core API、CLI 子命令和 Web
 * 测试入口，确保这些入口围绕同一份 JSON 契约演进。
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const coreEntryPath = path.join(repositoryRoot, 'packages', 'core', 'dist', 'index.cjs.js');
const cliEntryPath = path.join(repositoryRoot, 'packages', 'cli', 'src', 'console.js');
const fixtureRoot = path.join(repositoryRoot, 'packages', 'core', 'tests', 'fixtures', 'semantic-uaf-beta');
const docPath = path.join(repositoryRoot, 'docs', 'semantic-uaf-beta.md');
const docsIndexPath = path.join(repositoryRoot, 'docs', 'README.md');
const releaseGatePath = path.join(repositoryRoot, 'docs', 'release-gate.md');
const webTestPath = path.join(repositoryRoot, 'packages', 'web', 'tests', 'semantic-uaf-beta.test.mjs');
const webPackagePath = path.join(repositoryRoot, 'packages', 'web', 'package.json');

const forbiddenFragments = [
  'work-zone',
  'ai/codex',
  'ai\\codex',
  'W-art-',
  'T-apple',
  'T-tea',
  'K:\\',
  'C:\\Users\\'
];

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/gu, '\n').trimEnd();
}

function readJson(filePath) {
  return JSON.parse(readUtf8(filePath));
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} is missing required text: ${expected}`);
}

function assertNoPrivateFragments(filePath, content) {
  const label = path.relative(repositoryRoot, filePath);
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${label} leaks private or internal fragment: ${fragment}`);
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
    ...options
  });
  if (result.status !== 0) {
    throw new Error([
      `Command failed: ${command} ${args.join(' ')}`,
      result.stderr,
      result.stdout
    ].filter(Boolean).join('\n'));
  }
  return result;
}

async function checkCoreGolden() {
  assertCondition(fs.existsSync(coreEntryPath), 'Missing built Core entry. Run npm run build:core first.');
  const core = require(coreEntryPath);
  const font = core.parseUnicodeArtFontJson(readUtf8(path.join(fixtureRoot, 'beta-font.uafont.json')), { locale: 'zh-CN' });
  const document = core.parseSemanticDocumentJson(readUtf8(path.join(fixtureRoot, 'beta-document.uadoc.json')), { locale: 'zh-CN' });
  const expectedFont = readUtf8(path.join(fixtureRoot, 'expected-font.txt'));
  const expectedDocument = readUtf8(path.join(fixtureRoot, 'expected-document.txt'));
  const authorDocument = core.parseSemanticDocumentJson(readUtf8(path.join(fixtureRoot, 'author-document.uadoc.json')), { locale: 'zh-CN' });
  const expectedAuthorDocument = readUtf8(path.join(fixtureRoot, 'expected-author-document.txt'));

  const renderedFont = core.renderUnicodeArtFontText(font, 'UAJ', { locale: 'zh-CN' });
  assertCondition(renderedFont.content === expectedFont, 'Core UAF beta fixture output changed.');
  assertCondition(renderedFont.rows === 2 && renderedFont.cols === 8, 'Core UAF beta fixture metrics changed.');

  const renderedDocument = await core.semanticDocumentToArt(document, {
    height: 4,
    outputFormat: core.OutputFormat.PLAIN_TEXT,
    box: {
      style: 'ascii',
      renderStage: 'layout',
      mode: 'grid',
      separators: { rows: true, columns: true },
      cell: { padding: { left: 1, right: 1 } }
    },
    locale: 'zh-CN'
  }, { grid: true });

  assertCondition(renderedDocument.content === expectedDocument, 'Core semantic beta fixture output changed.');
  assertCondition(renderedDocument.rows === 8 && renderedDocument.cols === 19, 'Core semantic beta fixture metrics changed.');

  const renderedAuthorDocument = await core.renderSemanticDocumentWithAdapter(authorDocument, {
    height: 4,
    outputFormat: core.OutputFormat.PLAIN_TEXT,
    box: {
      style: 'ascii',
      renderStage: 'layout',
      mode: 'grid',
      separators: { rows: true, columns: true },
      cell: { padding: { left: 1, right: 1 } }
    },
    locale: 'zh-CN'
  }, async () => {
    throw new Error('Semantic author beta fixture should not require art-text rendering.');
  }, { grid: true });

  assertCondition(renderedAuthorDocument.content === expectedAuthorDocument, 'Core semantic author beta fixture output changed.');
  assertCondition(renderedAuthorDocument.rows === 11 && renderedAuthorDocument.cols === 22, 'Core semantic author beta fixture metrics changed.');

  const dslDocument = core.parseSemanticDsl(readUtf8(path.join(fixtureRoot, 'author-dsl.txt')), {
    rowSeparator: 'semantic',
    columnSeparator: '|',
    locale: 'zh-CN'
  });
  assertCondition(dslDocument.rows.length === 4, 'Semantic author DSL fixture row count changed.');
  assertCondition(dslDocument.rows[1].cells[0].rowSpan === 2, 'Semantic author DSL fixture rowSpan changed.');
  assertCondition(dslDocument.rows[3].cells[0].colSpan === 2, 'Semantic author DSL fixture colSpan changed.');
}

function checkCliGolden() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-beta-'));
  const outputPath = path.join(tempDir, 'semantic.txt');
  try {
    const fontPath = path.join(fixtureRoot, 'beta-font.uafont.json');
    const documentPath = path.join(fixtureRoot, 'beta-document.uadoc.json');
    const expectedDocument = readUtf8(path.join(fixtureRoot, 'expected-document.txt'));

    const fontValidation = run(process.execPath, [cliEntryPath, 'font', 'validate', fontPath, '--lang', 'en-US']);
    assertCondition(fontValidation.stdout.includes('validation passed'), 'CLI font validate did not report success.');

    const fontInspect = run(process.execPath, [cliEntryPath, 'font', 'inspect', fontPath, '--json', '--lang', 'en-US']);
    const summary = JSON.parse(fontInspect.stdout);
    assertCondition(summary.id === 'org.unicodeartjs.beta-fixture', 'CLI font inspect returned the wrong font id.');
    assertCondition(summary.permissiveForOfficialBundle === true, 'CLI font inspect did not preserve permissive license summary.');

    run(process.execPath, [
      cliEntryPath,
      'document',
      documentPath,
      '--height',
      '4',
      '--box',
      '{"style":"ascii","renderStage":"layout","mode":"grid","separators":{"rows":true,"columns":true},"cell":{"padding":{"left":1,"right":1}}}',
      '--output',
      outputPath,
      '--no-config',
      '--lang',
      'en-US'
    ]);
    assertCondition(readUtf8(outputPath) === expectedDocument, 'CLI semantic document beta fixture output changed.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function checkDocsAndFixtures() {
  for (const filePath of [
    docPath,
    path.join(fixtureRoot, 'beta-font.uafont.json'),
    path.join(fixtureRoot, 'beta-document.uadoc.json'),
    path.join(fixtureRoot, 'author-document.uadoc.json'),
    path.join(fixtureRoot, 'author-dsl.txt'),
    path.join(fixtureRoot, 'expected-font.txt'),
    path.join(fixtureRoot, 'expected-document.txt'),
    path.join(fixtureRoot, 'expected-author-document.txt'),
    webTestPath
  ]) {
    assertCondition(fs.existsSync(filePath), `Missing semantic/UAF beta file: ${path.relative(repositoryRoot, filePath)}`);
  }

  const doc = readUtf8(docPath);
  assertNoPrivateFragments(docPath, doc);
  for (const expected of [
    '# UAF 与语义布局 Beta 契约',
    'unicode-art-font',
    'semantic-document',
    'raw-text',
    'art-text',
    'art-font-text',
    'packages/core/tests/fixtures/semantic-uaf-beta',
    'author-document.uadoc.json',
    'author-dsl.txt',
    'npm run semantic-uaf-beta:check'
  ]) {
    requireText(doc, expected, 'docs/semantic-uaf-beta.md');
  }

  const docsIndex = readUtf8(docsIndexPath);
  requireText(docsIndex, 'semantic-uaf-beta.md', 'docs/README.md');
  requireText(readUtf8(releaseGatePath), 'semantic-uaf-beta:check', 'docs/release-gate.md');

  const font = readJson(path.join(fixtureRoot, 'beta-font.uafont.json'));
  assertCondition(font.format === 'unicode-art-font' && font.version === 1, 'Beta UAF fixture must remain UAF v1.');
  assertCondition(font.meta.license.expression === 'MIT' && font.meta.license.origin === 'original', 'Beta UAF fixture must remain original MIT.');
  assertCondition(font.metrics.fallbackGlyph === '?', 'Beta UAF fixture must keep fallbackGlyph coverage.');

  const document = readJson(path.join(fixtureRoot, 'beta-document.uadoc.json'));
  assertCondition(document.version === 1 && document.rows.length === 3, 'Beta semantic fixture shape changed unexpectedly.');
  const serializedDocument = JSON.stringify(document);
  for (const expected of ['"role":"header"', '"role":"footer"', '"role":"row-header"', '"kind":"raw-text"', '"kind":"art-font-text"']) {
    requireText(serializedDocument, expected, 'beta-document.uadoc.json');
  }

  const authorDocument = readJson(path.join(fixtureRoot, 'author-document.uadoc.json'));
  assertCondition(authorDocument.version === 1 && authorDocument.rows.length === 4, 'Author semantic fixture shape changed unexpectedly.');
  const serializedAuthorDocument = JSON.stringify(authorDocument);
  for (const expected of [
    '"rowSpan":2',
    '"colSpan":2',
    '"align":"center"',
    '"verticalAlign":"middle"',
    '"kind":"art-font-text"',
    '"kind":"raw-text"'
  ]) {
    requireText(serializedAuthorDocument, expected, 'author-document.uadoc.json');
  }
  requireText(readUtf8(path.join(fixtureRoot, 'author-dsl.txt')), '{c:2}', 'author-dsl.txt');
  requireText(readUtf8(path.join(fixtureRoot, 'author-dsl.txt')), '{r:2}', 'author-dsl.txt');

  const webPackage = readJson(webPackagePath);
  requireText(webPackage.scripts.test, 'semantic-uaf-beta.test.mjs', 'packages/web/package.json test script');
  requireText(readUtf8(webTestPath), 'semantic-uaf-beta', 'packages/web/tests/semantic-uaf-beta.test.mjs');
}

async function main() {
  checkDocsAndFixtures();
  await checkCoreGolden();
  checkCliGolden();
  process.stdout.write('Semantic UAF beta checks passed.\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
