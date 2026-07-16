#!/usr/bin/env node

/**
 * 检查统一配置模型的公开文档和跨入口字段。
 *
 * 这个脚本不访问网络，也不尝试证明所有配置行为都已完全稳定；它只保护
 * 当前已经公开的命名契约，避免 Core、CLI、Web 和 VS Code Extension
 * 对同一个概念使用不同字段或遗漏迁移说明。
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
  'C:\\Users\\'
];

function projectPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function readUtf8(relativePath) {
  return fs.readFileSync(projectPath(relativePath), 'utf8');
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertExists(relativePath) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `Missing file: ${relativePath}`);
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} leaks private or internal fragment: ${fragment}`);
  }
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} is missing: ${expected}`);
}

function requireRegex(content, pattern, label) {
  assertCondition(pattern.test(content), `${label} does not match ${pattern}`);
}

function requireTexts(content, expectedTexts, label) {
  for (const expected of expectedTexts) {
    requireText(content, expected, label);
  }
}

assertExists('docs/config-model-vnext.md');

const configDoc = readUtf8('docs/config-model-vnext.md');
assertNoPrivateFragments('docs/config-model-vnext.md', configDoc);
requireTexts(configDoc, [
  'visualFont',
  'glyphFont',
  'glyphWidthProfile',
  'wideCharRegex',
  'outputTarget',
  'locale',
  'font',
  'fontStyle',
  'fontReduce',
  'glyphFontFamily',
  '--visual-font',
  '--glyph-font',
  '--glyph-width-profile',
  '--wide-char-regex',
  '--output-target',
  '--lang',
  'experimental-stability.md',
  'font-behavior.md',
  'host-integration.md',
  'web-integration.md',
  'vscode-extension-integration.md'
], 'docs/config-model-vnext.md');

const docsIndex = readUtf8('docs/README.md');
requireText(docsIndex, 'config-model-vnext.md', 'docs/README.md');

const coreConfig = readUtf8('packages/core/src/types/config.ts');
requireTexts(coreConfig, [
  'export interface VisualFontConfig',
  'export interface GlyphFontConfig',
  'export type OutputTarget',
  'visualFont?: VisualFontConfig',
  'glyphFont?: GlyphFontConfig',
  'glyphFontFamily?: string',
  'glyphWidthProfile?: string',
  'wideCharRegex?: string',
  'outputTarget?: OutputTarget',
  'locale?: SupportedLocale',
  'normalizeArtConfigAliases',
  'normalizeVisualFontConfig',
  'normalizeGlyphFontConfig'
], 'packages/core/src/types/config.ts');
requireRegex(coreConfig, /font:\s*visualFont\.family/u, 'Core alias normalization for font');
requireRegex(coreConfig, /glyphWidthProfile:\s*glyphFont\.widthProfile/u, 'Core alias normalization for glyphWidthProfile');
requireRegex(coreConfig, /wideCharRegex:\s*glyphFont\.wideCharRegex/u, 'Core alias normalization for wideCharRegex');

const cliEntry = readUtf8('packages/cli/src/console.js');
requireTexts(cliEntry, [
  '--visual-font <name>',
  '--glyph-font <name>',
  '--glyph-width-profile <name>',
  '--wide-char-regex <regex>',
  '--output-target <target>',
  '--font-reduce <number>',
  '--lang <locale>',
  'fullConfig.locale = lang',
  'normalized.visualFont',
  'normalized.glyphFont'
], 'packages/cli/src/console.js');

const webMain = readUtf8('packages/web/src/main.js');
requireTexts(webMain, [
  'glyphFont:',
  'glyphWidthProfile:',
  'wideCharRegex:',
  'locale:',
  'visualFont: {',
  'glyphFont: {',
  "outputTarget: 'web'",
  'handleGlyphFontChange',
  'handleVisualFontChange'
], 'packages/web/src/main.js');

const vscodePackage = readUtf8('packages/vscode-extension/package.json');
requireTexts(vscodePackage, [
  'unicodeArtJs.font',
  'unicodeArtJs.visualFont',
  'unicodeArtJs.glyphFont',
  'unicodeArtJs.glyphWidthProfile',
  'unicodeArtJs.wideCharRegex',
  'unicodeArtJs.fontReduce'
], 'packages/vscode-extension/package.json');

const vscodeConfig = readUtf8('packages/vscode-extension/src/config/configResolver.ts');
requireTexts(vscodeConfig, [
  "config.get<string>('visualFont'",
  "config.get<string>('glyphFont'",
  "config.get<string>('glyphWidthProfile'",
  "config.get<string>('wideCharRegex'",
  "outputTarget: 'vscode'"
], 'packages/vscode-extension/src/config/configResolver.ts');

const packageJson = JSON.parse(readUtf8('package.json'));
assertCondition(
  packageJson.scripts?.['config-model:check'] === 'node scripts/check-config-model.cjs',
  'package.json must expose config-model:check.'
);
assertCondition(
  packageJson.scripts?.['release:gate']?.includes('npm run config-model:check'),
  'release:gate must include config-model:check.'
);

process.stdout.write('Config model checks passed.\n');
