#!/usr/bin/env node

/**
 * 校验 Web 实验性资源发现入口。
 *
 * 该脚本保护浏览器页面的只读资源发现路径，确保页面只展示随站发布的
 * 同源 gallery manifest 与 hash 校验状态，不退化为自动安装或任意 URL 读取。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'packages/web/src/resource-discovery.js',
  'packages/web/src/main.js',
  'packages/web/index.html',
  'packages/web/tests/resource-discovery.test.mjs',
  'packages/web/tests/e2e-smoke.mjs',
  'packages/web/public/gallery/resource-lock.json',
  'packages/web/public/gallery/resource-revocations.json',
  'packages/web/public/gallery/resource-signature.json',
  'scripts/check-resource-trust.cjs',
  'docs/resource-discovery-experimental.md',
  'docs/gallery.md',
  'docs/development.md',
  'docs/release-gate.md',
  'package.json',
  '.github/workflows/ci.yml',
];

const forbiddenPublicFragments = [
  'work-zone',
  'ai/codex',
  'ai\\codex',
  'W-art-',
  'T-apple',
  'T-tea',
  'K:\\',
  'C:\\Users\\',
];

function projectPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function readUtf8(relativePath) {
  return fs.readFileSync(projectPath(relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readUtf8(relativePath));
}

function assertCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} 缺少 Web 资源发现文本: ${expected}`);
}

function assertPublicTextClean(relativePath, content) {
  for (const fragment of forbiddenPublicFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} 泄露内部片段: ${fragment}`);
  }
}

for (const relativePath of requiredFiles) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `缺少 Web 资源发现相关文件: ${relativePath}`);
  if (relativePath.endsWith('.md') || relativePath.endsWith('.json') || relativePath.endsWith('.yml')) {
    assertPublicTextClean(relativePath, readUtf8(relativePath));
  }
}

const packageJson = readJson('package.json');
const ciWorkflow = readUtf8('.github/workflows/ci.yml');
const resourceModule = readUtf8('packages/web/src/resource-discovery.js');
const webMain = readUtf8('packages/web/src/main.js');
const webHtml = readUtf8('packages/web/index.html');
const unitTest = readUtf8('packages/web/tests/resource-discovery.test.mjs');
const e2eTest = readUtf8('packages/web/tests/e2e-smoke.mjs');
const resourceDoc = readUtf8('docs/resource-discovery-experimental.md');
const galleryDoc = readUtf8('docs/gallery.md');
const developmentDoc = readUtf8('docs/development.md');
const releaseGateDoc = readUtf8('docs/release-gate.md');

assertCondition(
  packageJson.scripts?.['web-resource-discovery:check'] === 'node scripts/check-web-resource-discovery.cjs',
  'package.json 必须声明 web-resource-discovery:check。',
);
requireText(packageJson.scripts?.['release:gate'] || '', 'web-resource-discovery:check', 'package.json release:gate');
requireText(packageJson.scripts?.['release:gate'] || '', 'resource-trust:check', 'package.json release:gate');
requireText(ciWorkflow, 'Check Web Resource Discovery', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run web-resource-discovery:check', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'Check Resource Trust Chain', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run resource-trust:check', '.github/workflows/ci.yml');

for (const expected of [
  'UNICODE_ART_RESOURCE_MANIFEST_FORMAT',
  'parseUnicodeArtResourceManifest',
  'matchResourceManifestWithGallery',
  'resolveUnicodeArtResourceDiscoveryUrl',
  'verifyUnicodeArtResourceBytes',
  'sha256HexFromArrayBuffer',
  'automaticInstall',
  'network',
  '不安装、不执行资源',
]) {
  requireText(resourceModule, expected, 'packages/web/src/resource-discovery.js');
}

for (const expected of [
  'ResourceDiscoveryController',
  'resource-manifest.json',
  'verifyUnicodeArtResourceBytes',
  'resource.status.loaded',
  'resource.boundaryText',
  'resources',
]) {
  requireText(webMain, expected, 'packages/web/src/main.js');
}

for (const expected of [
  'data-mode="resources"',
  'id="resourceWorkbench"',
  'id="resourceGrid"',
  'id="resourceOpenGallery"',
  '不会安装、启用或执行资源',
]) {
  requireText(webHtml, expected, 'packages/web/index.html');
}

for (const expected of [
  'parses the same-origin resource manifest',
  'verifies real resource bytes',
  'automatic install',
]) {
  requireText(unitTest, expected, 'packages/web/tests/resource-discovery.test.mjs');
}

for (const expected of [
  'loads read-only resource discovery manifest',
  '#resourceStatus',
  'resourceOpenGallery',
  'Resource discovery did not verify all static resources',
]) {
  requireText(e2eTest, expected, 'packages/web/tests/e2e-smoke.mjs');
}

for (const expected of [
  '资源发现',
  'resource-manifest.json',
  'resource-lock.json',
  'resource-revocations.json',
  'resource-signature.json',
  '在线工具',
  '只读',
  '不会安装',
  'npm run resource-trust:check',
  'npm run web-resource-discovery:check',
]) {
  requireText(resourceDoc, expected, 'docs/resource-discovery-experimental.md');
}

requireText(galleryDoc, '资源发现', 'docs/gallery.md');
requireText(developmentDoc, 'npm run web-resource-discovery:check', 'docs/development.md');
requireText(releaseGateDoc, 'web-resource-discovery:check', 'docs/release-gate.md');

process.stdout.write('Web resource discovery checks passed.\n');
