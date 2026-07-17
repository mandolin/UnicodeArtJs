#!/usr/bin/env node

/**
 * 校验创作生态公开入口。
 *
 * 该脚本保护 UAF、语义布局、UAEM、官方扩展示例和静态画廊之间的
 * 最小文档链路，避免后续格式推进时各入口漂移。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'docs/creative-ecosystem.md',
  'docs/semantic-uaf-beta.md',
  'docs/extension-manifest.md',
  'docs/extension-authoring.md',
  'docs/extension-sdk.md',
  'docs/gallery.md',
  'docs/gallery-submission.md',
  'docs/recipes.md',
  'docs/README.md',
  'docs/development.md',
  'docs/release-gate.md',
  'packages/extension-line-banner/README.md',
  'packages/extension-line-banner/unicode-art-extension.json',
  'packages/web/public/gallery/index.json',
  'package.json',
  '.github/workflows/ci.yml'
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

function readUtf8(relativePath) {
  return fs.readFileSync(projectPath(relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readUtf8(relativePath));
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} 缺少创作生态文本: ${expected}`);
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} 泄露内部片段: ${fragment}`);
  }
}

for (const relativePath of requiredFiles) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `缺少创作生态相关文件: ${relativePath}`);
  if (relativePath.endsWith('.md') || relativePath.endsWith('.json') || relativePath.endsWith('.yml')) {
    assertNoPrivateFragments(relativePath, readUtf8(relativePath));
  }
}

const packageJson = readJson('package.json');
const ciWorkflow = readUtf8('.github/workflows/ci.yml');
const docsIndex = readUtf8('docs/README.md');
const developmentDoc = readUtf8('docs/development.md');
const releaseGate = readUtf8('docs/release-gate.md');
const overview = readUtf8('docs/creative-ecosystem.md');
const semanticDoc = readUtf8('docs/semantic-uaf-beta.md');
const extensionSdk = readUtf8('docs/extension-sdk.md');
const galleryDoc = readUtf8('docs/gallery.md');
const extensionReadme = readUtf8('packages/extension-line-banner/README.md');
const extensionManifest = readJson('packages/extension-line-banner/unicode-art-extension.json');
const galleryIndex = readJson('packages/web/public/gallery/index.json');

assertCondition(
  packageJson.scripts?.['creative-ecosystem:check'] === 'node scripts/check-creative-ecosystem.cjs',
  'package.json 必须声明 creative-ecosystem:check。'
);
requireText(packageJson.scripts?.['release:gate'] || '', 'creative-ecosystem:check', 'package.json release:gate');
requireText(ciWorkflow, 'Check Creative Ecosystem', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run creative-ecosystem:check', '.github/workflows/ci.yml');
requireText(docsIndex, 'creative-ecosystem.md', 'docs/README.md');
requireText(developmentDoc, 'npm run creative-ecosystem:check', 'docs/development.md');
requireText(releaseGate, 'creative-ecosystem:check', 'docs/release-gate.md');

for (const expected of [
  'unicode-art-font@1',
  'semantic-document@1',
  'unicode-art-extension@1',
  'unicode-art-gallery-index@1',
  'semantic-uaf-beta.md',
  'extension-authoring.md',
  'gallery-submission.md',
  'packages/extension-line-banner/assets/line-font.uafont.json',
  'npm run creative-ecosystem:check',
  'npm run release:gate'
]) {
  requireText(overview, expected, 'docs/creative-ecosystem.md');
}

for (const expected of [
  'unicode-art-font',
  'semantic-document',
  'npm run semantic-uaf-beta:check'
]) {
  requireText(semanticDoc, expected, 'docs/semantic-uaf-beta.md');
}

for (const expected of [
  'UAEM v1',
  'packages/extension-line-banner',
  'npm run extension-sdk:check'
]) {
  requireText(extensionSdk, expected, 'docs/extension-sdk.md');
}

for (const expected of [
  'unicode-art-gallery-index',
  'gallery-submission.md',
  'npm run gallery:check'
]) {
  requireText(galleryDoc, expected, 'docs/gallery.md');
}

assertCondition(extensionManifest.format === 'unicode-art-extension', '官方扩展示例必须保持 UAEM 格式。');
assertCondition(extensionManifest.version === 1, '官方扩展示例必须保持 UAEM v1。');
const resourceKinds = new Set(extensionManifest.resources?.map((resource) => resource.kind));
assertCondition(resourceKinds.has('unicode-art-font'), '官方扩展示例必须包含 UAF 字体资源。');
assertCondition(resourceKinds.has('semantic-document'), '官方扩展示例必须包含语义文档资源。');
requireText(extensionReadme, 'extension-sdk.md', 'packages/extension-line-banner/README.md');

assertCondition(galleryIndex.format === 'unicode-art-gallery-index', '画廊索引格式不正确。');
assertCondition(galleryIndex.version === 1, '画廊索引版本必须为 1。');
const galleryKinds = new Set(galleryIndex.artworks?.map((artwork) => artwork.kind));
assertCondition(galleryKinds.has('unicode-art-font'), '静态画廊必须包含至少一个 UAF 作品。');
assertCondition(galleryKinds.has('semantic-document'), '静态画廊必须包含至少一个语义文档作品。');
assertCondition((galleryIndex.artworks || []).length >= 4, '静态画廊至少保留 4 个审核示例。');

process.stdout.write('Creative ecosystem checks passed.\n');
