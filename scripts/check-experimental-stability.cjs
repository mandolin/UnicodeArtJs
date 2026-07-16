#!/usr/bin/env node

/**
 * 检查实验能力稳定性矩阵。
 *
 * 该脚本从构建后的 Core `getCoreCapabilities()` 读取事实来源，确保公开
 * 稳定性矩阵没有遗漏 experimental / reserved / legacy 能力 ID。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const docPath = path.join(repositoryRoot, 'docs', 'experimental-stability.md');
const coreEntryPath = path.join(repositoryRoot, 'packages', 'core', 'dist', 'index.cjs.js');
const galleryCapabilityId = 'web.gallery.staticIndex';

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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} is missing required text: ${expected}`);
}

function requireCapabilityRow(content, id, allowedDecisions) {
  requireText(content, `\`${id}\``, 'docs/experimental-stability.md');
  const decisionPattern = allowedDecisions.map(escapeRegExp).join('|');
  const rowPattern = new RegExp(`\\|\\s*\`${escapeRegExp(id)}\`\\s*\\|[^\\n]*\\|\\s*(?:${decisionPattern})\\s*\\|`, 'u');
  assertCondition(rowPattern.test(content), `docs/experimental-stability.md must give ${id} one of: ${allowedDecisions.join(', ')}`);
}

assertCondition(fs.existsSync(coreEntryPath), 'Missing built Core entry. Run npm run build:core before stability:check.');
assertCondition(fs.existsSync(docPath), 'Missing docs/experimental-stability.md.');

const doc = fs.readFileSync(docPath, 'utf8');
const core = require(coreEntryPath);
const capabilities = core.getCoreCapabilities();

for (const fragment of forbiddenFragments) {
  assertCondition(!doc.includes(fragment), `docs/experimental-stability.md leaks private or internal fragment: ${fragment}`);
}

for (const heading of [
  '# 实验能力稳定性矩阵',
  '## Experimental 能力矩阵',
  '## Web 层公开试点',
  '## Reserved 与 Legacy 边界',
  '## 使用建议'
]) {
  requireText(doc, heading, 'docs/experimental-stability.md');
}

for (const feature of capabilities.experimentalFeatures) {
  requireCapabilityRow(doc, feature.id, ['Beta 候选', '继续 experimental', 'Stable 候选']);
}

for (const feature of capabilities.reservedConfig) {
  requireCapabilityRow(doc, feature.id, ['保留 reserved']);
}

for (const feature of capabilities.legacyAliases) {
  requireCapabilityRow(doc, feature.id, ['保留 legacy']);
}

requireCapabilityRow(doc, galleryCapabilityId, ['Stable 候选', 'Beta 候选', '继续 experimental']);

for (const requiredLink of [
  'known-limitations.md',
  'host-integration.md',
  'extension-manifest.md'
]) {
  requireText(doc, requiredLink, 'docs/experimental-stability.md');
}

process.stdout.write('Experimental stability matrix checks passed.\n');
