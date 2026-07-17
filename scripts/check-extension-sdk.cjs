#!/usr/bin/env node

/**
 * 校验声明式扩展 SDK 与官方示例包。
 *
 * 该脚本保护 UAEM v1 文档、官方 Line Banner 示例、Core 解析结果、CLI
 * 本地侧载预检和 Web 只读清单测试入口。它不会安装扩展，也不会执行扩展代码。
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const coreEntryPath = path.join(repositoryRoot, 'packages', 'core', 'dist', 'index.cjs.js');
const cliEntryPath = path.join(repositoryRoot, 'packages', 'cli', 'src', 'console.js');
const extensionRoot = path.join(repositoryRoot, 'packages', 'extension-line-banner');
const manifestPath = path.join(extensionRoot, 'unicode-art-extension.json');
const sdkDocPath = path.join(repositoryRoot, 'docs', 'extension-sdk.md');
const manifestDocPath = path.join(repositoryRoot, 'docs', 'extension-manifest.md');
const authoringDocPath = path.join(repositoryRoot, 'docs', 'extension-authoring.md');
const docsIndexPath = path.join(repositoryRoot, 'docs', 'README.md');
const developmentDocPath = path.join(repositoryRoot, 'docs', 'development.md');
const releaseGatePath = path.join(repositoryRoot, 'docs', 'release-gate.md');
const stabilityDocPath = path.join(repositoryRoot, 'docs', 'experimental-stability.md');
const extensionReadmePath = path.join(extensionRoot, 'README.md');
const webTestPath = path.join(repositoryRoot, 'packages', 'web', 'tests', 'e2e-smoke.mjs');
const coreTestPath = path.join(repositoryRoot, 'packages', 'core', 'tests', 'extensionManifest.test.ts');

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
  return fs.readFileSync(filePath, 'utf8');
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

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false
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

function assertSafeRelativeResourcePath(relativePath, suffix) {
  const segments = relativePath.split('/');
  assertCondition(!relativePath.startsWith('/'), `Resource path must be relative: ${relativePath}`);
  assertCondition(!relativePath.includes('\\'), `Resource path must use POSIX separators: ${relativePath}`);
  assertCondition(!relativePath.includes('//'), `Resource path must not contain empty segments: ${relativePath}`);
  assertCondition(segments.every((segment) => segment !== '.' && segment !== '..' && segment.length > 0), `Resource path must not escape root: ${relativePath}`);
  assertCondition(relativePath.endsWith(suffix), `Resource path must end with ${suffix}: ${relativePath}`);
  const resolvedRoot = fs.realpathSync(extensionRoot);
  const resolvedResource = fs.realpathSync(path.join(extensionRoot, relativePath));
  assertCondition(
    resolvedResource === resolvedRoot || resolvedResource.startsWith(resolvedRoot + path.sep),
    `Resource realpath escapes extension root: ${relativePath}`
  );
}

function checkDocs() {
  for (const filePath of [
    sdkDocPath,
    manifestDocPath,
    authoringDocPath,
    docsIndexPath,
    developmentDocPath,
    releaseGatePath,
    stabilityDocPath,
    extensionReadmePath
  ]) {
    assertCondition(fs.existsSync(filePath), `Missing extension SDK document: ${path.relative(repositoryRoot, filePath)}`);
    assertNoPrivateFragments(filePath, readUtf8(filePath));
  }

  const sdkDoc = readUtf8(sdkDocPath);
  for (const expected of [
    '# 声明式扩展 SDK',
    '不是运行时代码插件系统',
    '宿主能力矩阵',
    '权限模型',
    '官方扩展包要求',
    'npm run extension-sdk:check',
    'ANSI / BBS',
    '不会在 v1 中静默扩大能力'
  ]) {
    requireText(sdkDoc, expected, 'docs/extension-sdk.md');
  }

  requireText(readUtf8(docsIndexPath), 'extension-sdk.md', 'docs/README.md');
  requireText(readUtf8(developmentDocPath), 'extension-sdk:check', 'docs/development.md');
  requireText(readUtf8(releaseGatePath), 'extension-sdk:check', 'docs/release-gate.md');
  requireText(readUtf8(manifestDocPath), 'extension-sdk.md', 'docs/extension-manifest.md');
  requireText(readUtf8(authoringDocPath), 'extension-sdk.md', 'docs/extension-authoring.md');
  requireText(readUtf8(extensionReadmePath), 'extension-sdk.md', 'packages/extension-line-banner/README.md');

  const stabilityDoc = readUtf8(stabilityDocPath);
  requireText(stabilityDoc, '`extension.manifest`', 'docs/experimental-stability.md');
  requireText(stabilityDoc, '`extension.declarativeResources`', 'docs/experimental-stability.md');
  requireText(stabilityDoc, 'extension-sdk.md', 'docs/experimental-stability.md');
}

function checkOfficialPackage() {
  const packageJson = readJson(path.join(extensionRoot, 'package.json'));
  assertCondition(packageJson.name === '@unicode-art/extension-line-banner', 'Official extension package name changed.');
  assertCondition(packageJson.private === true, 'Official extension sample must remain private for now.');
  assertCondition(packageJson.license === 'MIT', 'Official extension sample must remain MIT.');
  for (const expectedFile of ['unicode-art-extension.json', 'assets/', 'README.md', 'TEMPLATE.md', 'LICENSE']) {
    assertCondition(packageJson.files.includes(expectedFile), `Official extension package files must include ${expectedFile}.`);
  }

  const manifest = readJson(manifestPath);
  assertCondition(manifest.format === 'unicode-art-extension', 'Official extension manifest format changed.');
  assertCondition(manifest.version === 1, 'Official extension manifest version changed.');
  assertCondition(manifest.meta.id === 'org.unicodeartjs.line-banner', 'Official extension id changed.');
  assertCondition(manifest.meta.license.expression === 'MIT', 'Official extension license changed.');
  assertCondition(manifest.meta.license.origin === 'original', 'Official extension provenance changed.');
  assertCondition(manifest.compatibility.minCoreVersion === '1.2.1', 'Official extension minCoreVersion changed unexpectedly.');
  assertCondition(manifest.compatibility.maxCoreVersionExclusive === '2.0.0', 'Official extension maxCoreVersionExclusive changed unexpectedly.');
  for (const target of ['cli', 'web', 'vscode', 'desktop']) {
    assertCondition(manifest.compatibility.targets.includes(target), `Official extension target missing: ${target}`);
  }
  for (const capability of ['unicode-art-font', 'semantic-document']) {
    assertCondition(manifest.capabilities.includes(capability), `Official extension capability missing: ${capability}`);
  }
  assertCondition(manifest.resources.length === 2, 'Official extension must keep two baseline resources.');

  const resources = new Map(manifest.resources.map((resource) => [resource.id, resource]));
  assertCondition(resources.get('line-font')?.kind === 'unicode-art-font', 'Official line-font resource changed.');
  assertCondition(resources.get('banner-template')?.kind === 'semantic-document', 'Official banner-template resource changed.');
  assertSafeRelativeResourcePath(resources.get('line-font').path, '.uafont.json');
  assertSafeRelativeResourcePath(resources.get('banner-template').path, '.uadoc.json');
}

function checkCoreAndCli() {
  assertCondition(fs.existsSync(coreEntryPath), 'Missing built Core entry. Run npm run build:core first.');
  const core = require(coreEntryPath);
  const manifest = core.parseUnicodeArtExtensionManifestJson(readUtf8(manifestPath), { locale: 'zh-CN' });
  assertCondition(manifest.meta.id === 'org.unicodeartjs.line-banner', 'Core parsed the wrong extension id.');
  assertCondition(core.isPermissiveUnicodeArtExtensionLicense(manifest.meta.license.expression), 'Official extension license must remain permissive.');
  const compatibility = core.evaluateUnicodeArtExtensionCompatibility(manifest, {
    target: 'cli',
    coreVersion: core.VERSION,
    capabilities: ['unicode-art-font', 'semantic-document']
  });
  assertCondition(compatibility.compatible === true, 'Official extension must remain compatible with CLI host.');

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
  assertCondition(summary.id === 'org.unicodeartjs.line-banner', 'CLI extension inspect returned wrong id.');
  assertCondition(summary.compatibility.compatible === true, 'CLI extension inspect must remain compatible.');
  assertCondition(summary.resources.length === 2, 'CLI extension inspect must include both resources.');
  const resourceKinds = new Set(summary.resources.map((resource) => resource.kind));
  assertCondition(resourceKinds.has('unicode-art-font'), 'CLI extension inspect missing UAF resource.');
  assertCondition(resourceKinds.has('semantic-document'), 'CLI extension inspect missing semantic resource.');
}

function checkTestCoverage() {
  const webTest = readUtf8(webTestPath);
  requireText(webTest, 'inspects a declaration-only extension manifest without loading resources', 'Web E2E extension test');
  requireText(webTest, 'editorExtensionFile', 'Web E2E extension test');

  const coreTest = readUtf8(coreTestPath);
  for (const expected of [
    'official Line Banner manifest',
    'targetUnsupported',
    'coreVersionTooOld',
    'coreVersionTooNew',
    'line\\nfont.uafont.json'
  ]) {
    requireText(coreTest, expected, 'Core extension manifest tests');
  }
}

function main() {
  checkDocs();
  checkOfficialPackage();
  checkCoreAndCli();
  checkTestCoverage();
  process.stdout.write('Extension SDK checks passed.\n');
}

main();
