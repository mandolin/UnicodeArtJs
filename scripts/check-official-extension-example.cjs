#!/usr/bin/env node

/**
 * 校验官方 UAEM 示例包。
 *
 * 该脚本聚焦 `packages/extension-line-banner` 是否仍是可复制、可验证、可侧载的
 * 声明式资源包模板；它不会安装扩展、注册扩展或执行扩展代码。
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const coreEntryPath = path.join(repositoryRoot, 'packages', 'core', 'dist', 'index.cjs.js');
const cliEntryPath = path.join(repositoryRoot, 'packages', 'cli', 'src', 'console.js');
const extensionRoot = path.join(repositoryRoot, 'packages', 'extension-line-banner');
const manifestPath = path.join(extensionRoot, 'unicode-art-extension.json');
const fontPath = path.join(extensionRoot, 'assets', 'line-font.uafont.json');
const documentPath = path.join(extensionRoot, 'assets', 'banner-template.uadoc.json');
const posterFontPath = path.join(extensionRoot, 'assets', 'block-poster-font.uafont.json');
const posterDocumentPath = path.join(extensionRoot, 'assets', 'poster-template.uadoc.json');

const requiredFiles = [
  'packages/extension-line-banner/unicode-art-extension.json',
  'packages/extension-line-banner/assets/line-font.uafont.json',
  'packages/extension-line-banner/assets/banner-template.uadoc.json',
  'packages/extension-line-banner/assets/block-poster-font.uafont.json',
  'packages/extension-line-banner/assets/poster-template.uadoc.json',
  'packages/extension-line-banner/README.md',
  'packages/extension-line-banner/TEMPLATE.md',
  'packages/extension-line-banner/LICENSE',
  'packages/extension-line-banner/package.json',
  'docs/extension-authoring.md',
  'docs/extension-sdk.md',
  'docs/extension-manifest.md',
  'docs/development.md',
  'docs/release-gate.md',
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

function checkDocsAndPackageShape() {
  for (const relativePath of requiredFiles) {
    assertCondition(fs.existsSync(projectPath(relativePath)), `Missing official extension example file: ${relativePath}`);
    if (relativePath.endsWith('.md') || relativePath.endsWith('.json') || relativePath.endsWith('.yml')) {
      assertNoPrivateFragments(relativePath, readProjectUtf8(relativePath));
    }
  }

  const readme = readProjectUtf8('packages/extension-line-banner/README.md');
  for (const expected of [
    'TEMPLATE.md',
    'LICENSE',
    'extension-example:check',
    'line-font.uafont.json',
    'banner-template.uadoc.json',
    'block-poster-font.uafont.json',
    'poster-template.uadoc.json',
    '不安装、注册或执行扩展'
  ]) {
    requireText(readme, expected, 'packages/extension-line-banner/README.md');
  }

  const template = readProjectUtf8('packages/extension-line-banner/TEMPLATE.md');
  for (const expected of [
    'UAEM 资源包复制模板',
    'unicode-art-extension.json',
    'my-font.uafont.json',
    'my-template.uadoc.json',
    'extension validate',
    'extension inspect'
  ]) {
    requireText(template, expected, 'packages/extension-line-banner/TEMPLATE.md');
  }

  const packageJson = readProjectJson('packages/extension-line-banner/package.json');
  for (const expectedFile of ['unicode-art-extension.json', 'assets/', 'README.md', 'TEMPLATE.md', 'LICENSE']) {
    assertCondition(packageJson.files.includes(expectedFile), `Official extension package files must include ${expectedFile}.`);
  }

  const rootPackage = readProjectJson('package.json');
  assertCondition(
    rootPackage.scripts?.['extension-example:check'] === 'npm run build:core && node scripts/check-official-extension-example.cjs',
    'package.json must declare extension-example:check.'
  );
  requireText(rootPackage.scripts?.['release:gate'] || '', 'extension-example:check', 'package.json release:gate');
  requireText(readProjectUtf8('.github/workflows/ci.yml'), 'Check Official Extension Example', '.github/workflows/ci.yml');
  requireText(readProjectUtf8('docs/development.md'), 'extension-example:check', 'docs/development.md');
  requireText(readProjectUtf8('docs/release-gate.md'), 'extension-example:check', 'docs/release-gate.md');
  requireText(readProjectUtf8('docs/extension-authoring.md'), 'TEMPLATE.md', 'docs/extension-authoring.md');
  requireText(readProjectUtf8('docs/extension-sdk.md'), 'extension-example:check', 'docs/extension-sdk.md');
  requireText(readProjectUtf8('docs/extension-manifest.md'), 'TEMPLATE.md', 'docs/extension-manifest.md');
}

async function checkCoreResources() {
  assertCondition(fs.existsSync(coreEntryPath), 'Missing built Core entry. Run npm run build:core first.');
  const core = require(coreEntryPath);
  const manifest = core.parseUnicodeArtExtensionManifestJson(readUtf8(manifestPath), { locale: 'zh-CN' });
  const font = core.parseUnicodeArtFontJson(readUtf8(fontPath), { locale: 'zh-CN' });
  const document = core.parseSemanticDocumentJson(readUtf8(documentPath), { locale: 'zh-CN' });
  const posterFont = core.parseUnicodeArtFontJson(readUtf8(posterFontPath), { locale: 'zh-CN' });
  const posterDocument = core.parseSemanticDocumentJson(readUtf8(posterDocumentPath), { locale: 'zh-CN' });

  assertCondition(manifest.meta.id === 'org.unicodeartjs.line-banner', 'Official extension id changed.');
  assertCondition(manifest.resources.length === 4, 'Official extension resource count changed.');
  const manifestResourceIds = new Set(manifest.resources.map((resource) => resource.id));
  for (const expectedResourceId of ['line-font', 'banner-template', 'block-poster-font', 'poster-template']) {
    assertCondition(manifestResourceIds.has(expectedResourceId), `Official extension is missing resource ${expectedResourceId}.`);
  }
  assertCondition(font.meta.id === 'org.unicodeartjs.line-banner-font', 'Official UAF font id changed.');
  assertCondition(document.rows.length === 1, 'Official semantic template row count changed.');
  assertCondition(
    posterFont.meta.id === 'org.unicodeartjs.line-banner.block-poster-font',
    'Official poster UAF font id changed.'
  );
  assertCondition(posterDocument.rows.length === 3, 'Official poster semantic template row count changed.');

  const renderedFont = core.renderUnicodeArtFontText(font, 'UAJ', { locale: 'zh-CN' });
  assertCondition(renderedFont.content === '|| /\\ _|\n\\/ || \\/', 'Official UAF font rendering changed.');
  assertCondition(renderedFont.rows === 2 && renderedFont.cols === 8, 'Official UAF font metrics changed.');

  const renderedPosterFont = core.renderUnicodeArtFontText(posterFont, 'UAF JS', { locale: 'zh-CN' });
  assertCondition(renderedPosterFont.missingGlyphs.length === 0, 'Official poster font should cover UAF JS.');
  assertCondition(renderedPosterFont.rows === 6 && renderedPosterFont.cols > 30, 'Official poster font metrics changed.');

  const renderedDocument = await core.renderSemanticDocumentWithAdapter(document, {
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
    throw new Error('Official extension template should not require art-text rendering.');
  }, { grid: true });
  requireText(renderedDocument.content, 'Extension', 'Official semantic template rendering');
  requireText(renderedDocument.content, '|| /\\ _|', 'Official semantic template rendering');

  const renderedPosterDocument = await core.renderSemanticDocumentWithAdapter(posterDocument, {
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
    throw new Error('Official poster template should not require art-text rendering.');
  }, { grid: true });
  requireText(renderedPosterDocument.content, 'Poster Template', 'Official poster semantic template rendering');
  requireText(renderedPosterDocument.content, '######', 'Official poster semantic template rendering');
}

function checkCliAndCopyablePackage() {
  const validation = run(process.execPath, [
    cliEntryPath,
    'extension',
    'validate',
    manifestPath,
    '--lang',
    'en-US'
  ]);
  requireText(validation.stdout, 'passed validation', 'CLI extension validate output');

  const inspection = run(process.execPath, [
    cliEntryPath,
    'extension',
    'inspect',
    manifestPath,
    '--json',
    '--lang',
    'en-US'
  ]);
  const summary = JSON.parse(inspection.stdout);
  assertCondition(summary.id === 'org.unicodeartjs.line-banner', 'CLI inspect returned wrong extension id.');
  assertCondition(summary.resources.length === 4, 'CLI inspect resource count changed.');

  run(process.execPath, [cliEntryPath, 'font', 'validate', fontPath, '--lang', 'en-US']);
  run(process.execPath, [cliEntryPath, 'font', 'validate', posterFontPath, '--lang', 'en-US']);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-extension-example-'));
  try {
    const copiedRoot = path.join(tempDir, 'line-banner-copy');
    fs.cpSync(extensionRoot, copiedRoot, { recursive: true });
    const copiedManifest = path.join(copiedRoot, 'unicode-art-extension.json');
    run(process.execPath, [cliEntryPath, 'extension', 'validate', copiedManifest, '--lang', 'en-US']);

    const outputPath = path.join(tempDir, 'banner-template.txt');
    run(process.execPath, [
      cliEntryPath,
      'document',
      path.join(copiedRoot, 'assets', 'banner-template.uadoc.json'),
      '--height',
      '4',
      '--output',
      outputPath,
      '--no-config',
      '--lang',
      'en-US'
    ]);
    const rendered = readUtf8(outputPath);
    requireText(rendered, 'Extension', 'CLI copied semantic template output');
    requireText(rendered, '|| /\\ _|', 'CLI copied semantic template output');

    const posterOutputPath = path.join(tempDir, 'poster-template.txt');
    run(process.execPath, [
      cliEntryPath,
      'document',
      path.join(copiedRoot, 'assets', 'poster-template.uadoc.json'),
      '--height',
      '8',
      '--output',
      posterOutputPath,
      '--no-config',
      '--lang',
      'en-US'
    ]);
    const renderedPoster = readUtf8(posterOutputPath);
    requireText(renderedPoster, 'Poster Template', 'CLI copied poster template output');
    requireText(renderedPoster, '######', 'CLI copied poster template output');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function checkNoExecutablePayload() {
  const forbiddenExtensions = new Set(['.js', '.mjs', '.cjs', '.wasm', '.exe', '.bat', '.cmd', '.ps1', '.sh']);
  const stack = [extensionRoot];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }
      const relative = path.relative(extensionRoot, fullPath).replace(/\\/gu, '/');
      assertCondition(!forbiddenExtensions.has(path.extname(entry.name).toLowerCase()), `Official extension must not contain executable payload: ${relative}`);
    }
  }
}

async function main() {
  checkDocsAndPackageShape();
  await checkCoreResources();
  checkCliAndCopyablePackage();
  checkNoExecutablePayload();
  process.stdout.write('Official extension example checks passed.\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
