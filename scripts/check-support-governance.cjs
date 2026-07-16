#!/usr/bin/env node

/**
 * 检查支持与反馈治理入口是否齐全。
 *
 * 该脚本只验证公开入口、模板和标签目录的基础契约，不替代人工判断
 * Issue 模板文案是否足够友好。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'docs/support.md',
  'docs/known-limitations.md',
  'docs/README.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/ISSUE_TEMPLATE/feature_request.yml',
  '.github/ISSUE_TEMPLATE/gallery_artwork.yml',
  '.github/labels.yml'
];

const removedLegacyTemplates = [
  '.github/ISSUE_TEMPLATE/bug_report.md',
  '.github/ISSUE_TEMPLATE/feature_request.md'
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

function readUtf8(relativePath) {
  return fs.readFileSync(path.join(repositoryRoot, relativePath), 'utf8');
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} is missing required text: ${expected}`);
}

function assertNoForbiddenFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} leaks private or internal fragment: ${fragment}`);
  }
}

for (const relativePath of requiredFiles) {
  assertCondition(fs.existsSync(path.join(repositoryRoot, relativePath)), `Missing required support governance file: ${relativePath}`);
  assertNoForbiddenFragments(relativePath, readUtf8(relativePath));
}

for (const relativePath of removedLegacyTemplates) {
  assertCondition(!fs.existsSync(path.join(repositoryRoot, relativePath)), `Legacy issue template should be replaced by Issue Form: ${relativePath}`);
}

const docsIndex = readUtf8('docs/README.md');
for (const requiredLink of ['support.md', 'known-limitations.md', 'gallery-submission.md']) {
  requireText(docsIndex, requiredLink, 'docs/README.md');
}

const supportGuide = readUtf8('docs/support.md');
for (const expected of [
  'known-limitations.md',
  'gallery-submission.md',
  'https://github.com/mandolin/tauri-uniart/issues',
  'https://github.com/mandolin/electron-uniart/issues',
  '.github/labels.yml',
  'area:core',
  'area:web',
  'area:vscode',
  'needs:repro'
]) {
  requireText(supportGuide, expected, 'docs/support.md');
}

const limitations = readUtf8('docs/known-limitations.md');
for (const expected of [
  'font-behavior.md',
  'Chrome 120+',
  'PNG / JPEG / WebP / BMP',
  'getCoreCapabilities()',
  'gallery-submission.md'
]) {
  requireText(limitations, expected, 'docs/known-limitations.md');
}

const issueConfig = readUtf8('.github/ISSUE_TEMPLATE/config.yml');
for (const expected of [
  'blank_issues_enabled: false',
  'docs/support.md',
  'docs/known-limitations.md',
  'tauri-uniart/issues',
  'electron-uniart/issues'
]) {
  requireText(issueConfig, expected, '.github/ISSUE_TEMPLATE/config.yml');
}

const bugTemplate = readUtf8('.github/ISSUE_TEMPLATE/bug_report.yml');
for (const expected of [
  'Component',
  'Version',
  'Environment',
  'Minimal input and config',
  'I checked the known limitations page.'
]) {
  requireText(bugTemplate, expected, '.github/ISSUE_TEMPLATE/bug_report.yml');
}

const featureTemplate = readUtf8('.github/ISSUE_TEMPLATE/feature_request.yml');
for (const expected of [
  'Target',
  'Expected stability',
  'Problem',
  'Proposal',
  'standalone desktop repository'
]) {
  requireText(featureTemplate, expected, '.github/ISSUE_TEMPLATE/feature_request.yml');
}

const labels = readUtf8('.github/labels.yml');
for (const expected of [
  'area:core',
  'area:cli',
  'area:web',
  'area:vscode',
  'area:fonts',
  'area:semantic',
  'stability:experimental',
  'needs:decision'
]) {
  requireText(labels, expected, '.github/labels.yml');
}

process.stdout.write('Support governance checks passed.\n');
