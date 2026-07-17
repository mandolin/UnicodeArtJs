#!/usr/bin/env node
/**
 * 检查兼容性与迁移文档的公开入口。
 *
 * 该脚本只验证 P7.5 文档的结构、互链和隐私边界，不替代真实升级测试。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

const forbiddenFragments = [
  'work-zone',
  'ai/codex',
  'ai\\codex',
  'W-art-',
  'T-apple',
  'T-tea',
  'K:\\',
  'C:\\Users\\',
];

const publicDocs = [
  'docs/migration-guide.md',
  'docs/ecosystem-compatibility.md',
  'docs/known-limitations.md',
  'docs/config-model-vnext.md',
  'docs/font-behavior.md',
  'docs/optional-input-adapters.md',
  'docs/host-integration.md',
  'docs/developer-documentation-architecture.md',
  'docs/development.md',
  'docs/README.md',
  'fixtures/docs-site/developer-docs-architecture.json',
];

function projectPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function readText(relativePath) {
  return fs.readFileSync(projectPath(relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
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
    assertCondition(!content.includes(fragment), `${relativePath} leaks private/internal fragment: ${fragment}`);
  }
}

for (const relativePath of publicDocs) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `Missing compatibility public doc: ${relativePath}`);
  assertNoPrivateFragments(relativePath, readText(relativePath));
}

const migration = readText('docs/migration-guide.md');
for (const expected of [
  '## 先判断你属于哪种迁移',
  '## 当前版本基线',
  '## Core 迁移清单',
  '## CLI 迁移清单',
  '## Web 与浏览器迁移清单',
  '## VS Code Extension 迁移清单',
  '## 回退策略',
  'ecosystem-compatibility.md',
  'config-model-vnext.md',
  'font-behavior.md',
  'optional-input-adapters.md',
  'experimental-stability.md',
]) {
  requireText(migration, expected, 'docs/migration-guide.md');
}

const ecosystem = readText('docs/ecosystem-compatibility.md');
for (const expected of [
  'migration-guide.md',
  '当前兼容基线',
  '升级与回退',
  'Chrome 120+',
  'unicode-art-js@1.2',
]) {
  requireText(ecosystem, expected, 'docs/ecosystem-compatibility.md');
}

const limitations = readText('docs/known-limitations.md');
for (const expected of [
  '按现象定位',
  'migration-guide.md',
  'font-behavior.md',
  'optional-input-adapters.md',
  'getCoreCapabilities()',
]) {
  requireText(limitations, expected, 'docs/known-limitations.md');
}

const docsIndex = readText('docs/README.md');
for (const expected of [
  'migration-guide.md',
  'ecosystem-compatibility.md',
  'known-limitations.md',
]) {
  requireText(docsIndex, expected, 'docs/README.md');
}

const development = readText('docs/development.md');
requireText(development, 'npm run compatibility-docs:check', 'docs/development.md');

const architecture = readJson('fixtures/docs-site/developer-docs-architecture.json');
const compatibility = architecture.sections.find((section) => section.id === 'compatibility');
assertCondition(Boolean(compatibility), 'developer docs architecture must include compatibility section.');
for (const expected of [
  'docs/migration-guide.md',
  'docs/known-limitations.md',
  'docs/optional-input-adapters.md',
  'docs/ecosystem-compatibility.md',
]) {
  assertCondition(
    compatibility.requiredDocs.includes(expected),
    `compatibility section is missing ${expected}`
  );
}

const packageJson = readJson('package.json');
assertCondition(
  packageJson.scripts?.['compatibility-docs:check'] === 'node scripts/check-compatibility-docs.cjs',
  'package.json must define compatibility-docs:check.'
);
assertCondition(
  packageJson.scripts?.['docs:all:check']?.includes('compatibility-docs:check'),
  'docs:all:check must include compatibility-docs:check.'
);

const ciWorkflow = readText('.github/workflows/ci.yml');
requireText(ciWorkflow, 'Check Compatibility Docs', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run compatibility-docs:check', '.github/workflows/ci.yml');

process.stdout.write('Compatibility and migration documentation checks passed.\n');
