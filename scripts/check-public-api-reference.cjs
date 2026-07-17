#!/usr/bin/env node
/**
 * 校验 Web 文档站公开 API Reference 索引。
 *
 * 该脚本只检查可发布的白名单字段：符号名、类型、签名、摘要和公开源码链接。
 * 它不允许 `.generated-docs`、WorkZone、本机绝对路径或源文内容进入 Pages manifest。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const publicManifestPath = path.join(repositoryRoot, 'packages', 'web', 'public', 'docs', 'manifest.json');
const repositoryPrefix = 'https://github.com/mandolin/UnicodeArtJs/blob/main/';
const forbiddenFragments = [
  '.generated-docs',
  'work-zone',
  'ai/codex',
  'ai\\codex',
  'primaryBlock',
  'K:\\',
  'C:\\',
];

const minimumSymbols = {
  'core-tsdoc': 80,
  'cli-jsdoc': 20,
  'web-jsdoc': 5,
  'vscode-tsdoc': 20,
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoPrivateFragments(label, serialized) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!serialized.includes(fragment), `${label} 泄露非公开片段: ${fragment}`);
  }
}

function textValues(value) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).filter((item) => typeof item === 'string');
}

function hasForbiddenKey(value, key) {
  if (Array.isArray(value)) return value.some((item) => hasForbiddenKey(item, key));
  if (!value || typeof value !== 'object') return false;
  return Object.prototype.hasOwnProperty.call(value, key)
    || Object.values(value).some((item) => hasForbiddenKey(item, key));
}

assertCondition(fs.existsSync(publicManifestPath), '缺少 Web public docs manifest，请先运行 npm run docs:public-site。');

const manifestText = fs.readFileSync(publicManifestPath, 'utf8');
assertNoPrivateFragments('public docs manifest', manifestText);

const manifest = JSON.parse(manifestText);
const apiReference = manifest.apiReference;

assertCondition(manifest.contract === 'unicodeartjs-public-docs-site-manifest', 'public docs manifest contract 不正确。');
assertCondition(apiReference?.contract === 'unicodeartjs-public-api-reference', '缺少公开 API Reference 契约。');
assertCondition(apiReference.version === 1, '公开 API Reference version 必须为 1。');
assertCondition(apiReference.generatedFrom?.sourceContract === manifest.sourceManifest?.contract, 'API Reference 来源契约不一致。');
assertCondition(Array.isArray(apiReference.entries), 'API Reference entries 必须是数组。');
assertCondition(apiReference.entries.length === manifest.entries.length, 'API Reference entry 数量必须匹配文档入口数量。');

const manifestEntryIds = new Set(manifest.entries.map((entry) => entry.id));
const allSourceFiles = new Set();
let totalSymbols = 0;

for (const entry of apiReference.entries) {
  assertCondition(manifestEntryIds.has(entry.entryId), `API Reference 包含未知入口: ${entry.entryId}`);
  assertCondition(Array.isArray(entry.symbols), `${entry.entryId} symbols 必须是数组。`);
  assertCondition(entry.symbols.length === entry.symbolCount, `${entry.entryId} symbolCount 不一致。`);
  assertCondition(entry.symbolCount >= minimumSymbols[entry.entryId], `${entry.entryId} 符号数量过少: ${entry.symbolCount}。`);

  const seenIds = new Set();
  const sourceFiles = new Set();
  for (const symbol of entry.symbols) {
    assertCondition(symbol.id && !seenIds.has(symbol.id), `${entry.entryId} 符号 id 缺失或重复: ${symbol.id}`);
    seenIds.add(symbol.id);
    assertCondition(symbol.name, `${entry.entryId} 存在缺少 name 的符号。`);
    assertCondition(symbol.kind, `${symbol.id} 缺少 kind。`);
    assertCondition(symbol.signature, `${symbol.id} 缺少 signature。`);
    assertCondition(symbol.source?.path, `${symbol.id} 缺少 source.path。`);
    assertCondition(Number.isInteger(symbol.source?.line) && symbol.source.line > 0, `${symbol.id} 缺少有效 source.line。`);
    assertCondition(symbol.source?.url?.startsWith(repositoryPrefix), `${symbol.id} source.url 必须指向公开仓库。`);
    assertCondition(!symbol.source.url.includes('.generated-docs'), `${symbol.id} source.url 不得指向生成目录。`);

    for (const text of textValues(symbol.summary)) {
      assertCondition(text.length <= 280, `${symbol.id} summary 过长。`);
    }
    assertCondition(String(symbol.signature).length <= 200, `${symbol.id} signature 过长。`);

    sourceFiles.add(symbol.source.path);
    allSourceFiles.add(symbol.source.path);
  }

  assertCondition(sourceFiles.size === entry.sourceFileCount, `${entry.entryId} sourceFileCount 不一致。`);
  totalSymbols += entry.symbols.length;
}

assertCondition(apiReference.symbolCount === totalSymbols, 'API Reference 总 symbolCount 不一致。');
assertCondition(apiReference.sourceFileCount === allSourceFiles.size, 'API Reference 总 sourceFileCount 不一致。');

// 确认 JSON 反序列化后仍没有隐藏的大字段。
assertNoPrivateFragments('public api reference', JSON.stringify(apiReference, null, 2));
assertCondition(!hasForbiddenKey(apiReference, 'sourcesContent'), 'API Reference 不得包含 sourcesContent 字段。');

process.stdout.write('Public API Reference checks passed.\n');
