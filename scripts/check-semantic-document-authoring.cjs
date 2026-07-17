#!/usr/bin/env node

/**
 * 校验 semantic-document 作者路径。
 *
 * 该脚本保护公开作者指南、作者 fixture、DSL 导入示例、Core 渲染和 CLI
 * 渲染入口，确保语义布局文档的作者体验不会从 beta 契约中漂移。
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const coreEntryPath = path.join(repositoryRoot, 'packages', 'core', 'dist', 'index.cjs.js');
const cliEntryPath = path.join(repositoryRoot, 'packages', 'cli', 'src', 'console.js');
const fixtureRoot = path.join(repositoryRoot, 'packages', 'core', 'tests', 'fixtures', 'semantic-uaf-beta');
const authorDocPath = path.join(fixtureRoot, 'author-document.uadoc.json');
const authorDslPath = path.join(fixtureRoot, 'author-dsl.txt');
const expectedAuthorPath = path.join(fixtureRoot, 'expected-author-document.txt');

const requiredFiles = [
  'docs/semantic-document-authoring.md',
  'docs/semantic-uaf-beta.md',
  'docs/creative-ecosystem.md',
  'docs/README.md',
  'docs/development.md',
  'docs/release-gate.md',
  'fixtures/docs-site/developer-docs-architecture.json',
  'packages/web/public/docs/manifest.json',
  'packages/core/tests/fixtures/semantic-uaf-beta/author-document.uadoc.json',
  'packages/core/tests/fixtures/semantic-uaf-beta/author-dsl.txt',
  'packages/core/tests/fixtures/semantic-uaf-beta/expected-author-document.txt',
  '.github/workflows/ci.yml',
  'package.json'
];

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

function projectPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/gu, '\n').trimEnd();
}

function readProjectUtf8(relativePath) {
  return readUtf8(projectPath(relativePath));
}

function readJson(filePath) {
  return JSON.parse(readUtf8(filePath));
}

function readProjectJson(relativePath) {
  return JSON.parse(readProjectUtf8(relativePath));
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} is missing required text: ${expected}`);
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} leaks private or internal fragment: ${fragment}`);
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

function checkDocs() {
  for (const relativePath of requiredFiles) {
    assertCondition(fs.existsSync(projectPath(relativePath)), `Missing semantic authoring file: ${relativePath}`);
    if (relativePath.endsWith('.md') || relativePath.endsWith('.json') || relativePath.endsWith('.yml')) {
      assertNoPrivateFragments(relativePath, readProjectUtf8(relativePath));
    }
  }

  const authoring = readProjectUtf8('docs/semantic-document-authoring.md');
  for (const expected of [
    '# 语义布局作者指南',
    'semantic-document@1',
    'raw-text',
    'art-text',
    'art-font-text',
    'rowSpan',
    'colSpan',
    '受限 DSL',
    'npm run semantic-document-authoring:check'
  ]) {
    requireText(authoring, expected, 'docs/semantic-document-authoring.md');
  }

  requireText(readProjectUtf8('docs/README.md'), 'semantic-document-authoring.md', 'docs/README.md');
  requireText(readProjectUtf8('docs/creative-ecosystem.md'), 'semantic-document-authoring.md', 'docs/creative-ecosystem.md');
  requireText(readProjectUtf8('docs/semantic-uaf-beta.md'), 'semantic-document-authoring.md', 'docs/semantic-uaf-beta.md');
  requireText(readProjectUtf8('docs/development.md'), 'semantic-document-authoring:check', 'docs/development.md');
  requireText(readProjectUtf8('docs/release-gate.md'), 'semantic-document-authoring:check', 'docs/release-gate.md');
  requireText(readProjectUtf8('.github/workflows/ci.yml'), 'Check Semantic Document Authoring', '.github/workflows/ci.yml');

  const packageJson = readProjectJson('package.json');
  assertCondition(
    packageJson.scripts?.['semantic-document-authoring:check'] === 'npm run build:core && node scripts/check-semantic-document-authoring.cjs',
    'package.json must declare semantic-document-authoring:check.'
  );
  requireText(packageJson.scripts?.['release:gate'] || '', 'semantic-document-authoring:check', 'package.json release:gate');

  const architecture = JSON.stringify(readProjectJson('fixtures/docs-site/developer-docs-architecture.json'));
  requireText(architecture, 'docs/semantic-document-authoring.md', 'developer docs architecture fixture');

  const manifest = JSON.stringify(readProjectJson('packages/web/public/docs/manifest.json'));
  requireText(manifest, 'semantic-document-authoring.md', 'public docs manifest');
}

async function checkCoreAuthorFixture(core) {
  const document = core.parseSemanticDocumentJson(readUtf8(authorDocPath), { locale: 'zh-CN' });
  const expected = readUtf8(expectedAuthorPath);
  const rendered = await core.renderSemanticDocumentWithAdapter(document, {
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
    throw new Error('Author JSON fixture should not require art-text rendering.');
  }, { grid: true });

  assertCondition(rendered.content === expected, 'Core semantic author fixture output changed.');
  assertCondition(rendered.rows === 11 && rendered.cols === 22, 'Core semantic author fixture metrics changed.');

  const serialized = JSON.stringify(document);
  for (const expectedToken of [
    '"role":"header"',
    '"role":"footer"',
    '"role":"row-header"',
    '"role":"column-header"',
    '"rowSpan":2',
    '"colSpan":2',
    '"verticalAlign":"middle"',
    '"kind":"art-font-text"',
    '"kind":"raw-text"'
  ]) {
    requireText(serialized, expectedToken, 'author-document.uadoc.json');
  }
}

async function checkDslAuthorFixture(core) {
  const source = readUtf8(authorDslPath);
  const document = core.parseSemanticDsl(source, {
    rowSeparator: 'semantic',
    columnSeparator: '|',
    locale: 'zh-CN'
  });

  assertCondition(document.rows.length === 4, 'Author DSL fixture row count changed.');
  assertCondition(document.rows[0].role === 'header', 'Author DSL fixture lost header role.');
  assertCondition(document.rows[3].role === 'footer', 'Author DSL fixture lost footer role.');
  assertCondition(document.rows[1].cells[0].rowSpan === 2, 'Author DSL fixture lost rowSpan alias.');
  assertCondition(document.rows[3].cells[0].colSpan === 2, 'Author DSL fixture lost colSpan alias.');
  assertCondition(document.rows[1].cells[1].blocks[0].kind === 'art-text', 'Author DSL fixture should keep art-text import.');
  assertCondition(document.rows[2].cells[0].blocks[0].text === 'Raw|Text', 'Author DSL fixture should preserve escaped separator.');

  const rendered = await core.renderSemanticDocumentWithAdapter(document, {
    outputFormat: core.OutputFormat.PLAIN_TEXT,
    box: {
      style: 'ascii',
      renderStage: 'layout',
      mode: 'grid',
      separators: { rows: true, columns: true },
      cell: { padding: { left: 1, right: 1 } }
    },
    locale: 'zh-CN'
  }, async (text) => ({
    content: `[${text}]`,
    rows: 1,
    cols: text.length + 2,
    metadata: {}
  }), { grid: true });

  requireText(rendered.content, '[Alpha]', 'Rendered author DSL fixture');
  requireText(rendered.content, 'Raw|Text', 'Rendered author DSL fixture');
}

function checkCliAuthorFixture() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-semantic-author-'));
  const outputPath = path.join(tempDir, 'author.txt');
  try {
    run(process.execPath, [
      cliEntryPath,
      'document',
      authorDocPath,
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
    assertCondition(readUtf8(outputPath) === readUtf8(expectedAuthorPath), 'CLI semantic author fixture output changed.');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function main() {
  checkDocs();
  assertCondition(fs.existsSync(coreEntryPath), 'Missing built Core entry. Run npm run build:core first.');
  const core = require(coreEntryPath);
  await checkCoreAuthorFixture(core);
  await checkDslAuthorFixture(core);
  checkCliAuthorFixture();
  process.stdout.write('Semantic document authoring checks passed.\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
