#!/usr/bin/env node

/**
 * 检查字素宽度与布局一致性契约。
 *
 * 该脚本只做仓库内静态校验：确认公开文档、统一 helper、关键调用点和
 * 回归测试仍然存在。行为正确性由 Core 单元测试和 release gate 继续覆盖。
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

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} is missing: ${expected}`);
}

function requireTexts(content, expectedTexts, label) {
  for (const expected of expectedTexts) {
    requireText(content, expected, label);
  }
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} leaks private or internal fragment: ${fragment}`);
  }
}

const doc = readUtf8('docs/glyph-width-layout.md');
assertNoPrivateFragments('docs/glyph-width-layout.md', doc);
requireTexts(doc, [
  'glyphWidthProfile',
  'wideCharRegex',
  'createGlyphWidthCalculatorFromConfig()',
  'post-stage Box',
  'layout-stage Box',
  '语义文档布局',
  'UAF 艺术字',
  '输出指标',
  'pure/browser 数据路径',
  'config-model-vnext.md',
  'experimental-stability.md'
], 'docs/glyph-width-layout.md');

const docsIndex = readUtf8('docs/README.md');
requireText(docsIndex, 'glyph-width-layout.md', 'docs/README.md');

const glyphWidthSource = readUtf8('packages/core/src/glyph/width.ts');
requireTexts(glyphWidthSource, [
  'export interface GlyphWidthConfigInput',
  'export function createGlyphWidthCalculatorFromConfig',
  'glyphFont?.widthProfile ?? config.glyphWidthProfile',
  'glyphFont?.wideCharRegex ?? config.wideCharRegex'
], 'packages/core/src/glyph/width.ts');

for (const [relativePath, expectedTexts] of Object.entries({
  'packages/core/src/assembler.ts': ['createGlyphWidthCalculatorFromConfig(config)'],
  'packages/core/src/index.ts': ['createGlyphWidthCalculatorFromConfig(config)', 'createGlyphWidthCalculatorFromConfig(fullConfig)'],
  'packages/core/src/semantic/render.ts': ['createGlyphWidthCalculatorFromConfig(documentConfig)'],
  'packages/core/src/pure/imageDataToArt.ts': ['createGlyphWidthCalculatorFromConfig(fullConfig)'],
  'packages/core/src/pure.ts': ['createGlyphWidthCalculatorFromConfig'],
  'packages/core/tests/glyphWidth.test.ts': ['createGlyphWidthCalculatorFromConfig', 'object fields first'],
  'packages/core/tests/box.test.ts': ['nested glyphFont fields'],
  'packages/core/tests/semanticRender.test.ts': ['nested glyphFont width profile'],
  'packages/core/tests/pure.test.ts': ['invalid glyph-width config']
})) {
  requireTexts(readUtf8(relativePath), expectedTexts, relativePath);
}

const packageJson = JSON.parse(readUtf8('package.json'));
assertCondition(
  packageJson.scripts?.['glyph-width:check'] === 'node scripts/check-glyph-width-layout.cjs',
  'package.json must expose glyph-width:check.'
);
assertCondition(
  packageJson.scripts?.['release:gate']?.includes('npm run glyph-width:check'),
  'release:gate must include glyph-width:check.'
);

process.stdout.write('Glyph width layout checks passed.\n');
