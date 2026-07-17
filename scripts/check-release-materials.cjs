#!/usr/bin/env node

/**
 * 校验发布材料模板和发布后核验清单。
 *
 * 该脚本只检查仓库内可静态验证的公开材料，不访问 npm、Marketplace 或
 * GitHub Actions；实时结果仍由发布维护者在发布收尾时确认。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'docs/release-materials.md',
  'docs/release-gate.md',
  'docs/performance-and-release-plan.md',
  'docs/vscode-extension-release-checklist.md',
  'docs/runtime-sbom.md',
  'docs/migration-guide.md',
  'docs/known-limitations.md',
  'docs/README.md',
  'docs/development.md',
  'package.json',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy-web.yml'
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
  assertCondition(content.includes(expected), `${label} 缺少发布材料文本: ${expected}`);
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} 泄露内部片段: ${fragment}`);
  }
}

for (const relativePath of requiredFiles) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `缺少发布材料相关文件: ${relativePath}`);
  assertNoPrivateFragments(relativePath, readUtf8(relativePath));
}

const packageJson = readJson('package.json');
const releaseMaterials = readUtf8('docs/release-materials.md');
const releaseGate = readUtf8('docs/release-gate.md');
const performancePlan = readUtf8('docs/performance-and-release-plan.md');
const vscodeChecklist = readUtf8('docs/vscode-extension-release-checklist.md');
const docsIndex = readUtf8('docs/README.md');
const developmentDoc = readUtf8('docs/development.md');
const ciWorkflow = readUtf8('.github/workflows/ci.yml');
const deployWebWorkflow = readUtf8('.github/workflows/deploy-web.yml');

const requiredReleaseMaterialTexts = [
  'Release Materials',
  'GitHub Release',
  'npm',
  'VS Code Marketplace',
  'GitHub Pages',
  'npm run release:gate',
  'npm run release:verify:publish',
  'npm view unicode-art-js version',
  'npm view unicode-art-cli version',
  'vsce publish',
  'core-v',
  'cli-v',
  'vscode-v',
  'post-release',
  'Known limitations',
  'docs/migration-guide.md',
  'docs/runtime-sbom.md',
  'docs/vscode-extension-release-checklist.md',
  'https://mandolin.github.io/UnicodeArtJs/',
  'https://marketplace.visualstudio.com/items?itemName=mandolin.unicode-art-js-vscode'
];

for (const expected of requiredReleaseMaterialTexts) {
  requireText(releaseMaterials, expected, 'docs/release-materials.md');
}

for (const expected of [
  'release-materials:check',
  'docs/release-materials.md'
]) {
  requireText(releaseGate, expected, 'docs/release-gate.md');
  requireText(performancePlan, expected, 'docs/performance-and-release-plan.md');
  requireText(developmentDoc, expected, 'docs/development.md');
}

requireText(vscodeChecklist, 'docs/release-materials.md', 'docs/vscode-extension-release-checklist.md');
requireText(docsIndex, 'release-materials.md', 'docs/README.md');
requireText(ciWorkflow, 'Check Release Materials', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run release-materials:check', '.github/workflows/ci.yml');
requireText(deployWebWorkflow, 'npm run docs:all:check', '.github/workflows/deploy-web.yml');

assertCondition(
  packageJson.scripts?.['release-materials:check'] === 'node scripts/check-release-materials.cjs',
  'package.json 必须声明 release-materials:check。'
);
requireText(packageJson.scripts?.['docs:all:check'] || '', 'release-materials:check', 'package.json docs:all:check');
requireText(packageJson.scripts?.['release:gate'] || '', 'release-materials:check', 'package.json release:gate');

process.stdout.write('Release materials checks passed.\n');
