#!/usr/bin/env node
/**
 * 校验开发者文档站信息架构。
 *
 * 该脚本保护公开文档分区、读者路径和 Web 文档站数据边界，
 * 防止后续文档入口漂移或泄露内部资料。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const fixturePath = path.join(repositoryRoot, 'fixtures', 'docs-site', 'developer-docs-architecture.json');
const docsIndexPath = path.join(repositoryRoot, 'docs', 'README.md');
const developmentDocPath = path.join(repositoryRoot, 'docs', 'development.md');
const pipelineDocPath = path.join(repositoryRoot, 'docs', 'documentation-pipeline.md');
const packagePath = path.join(repositoryRoot, 'package.json');
const ciWorkflowPath = path.join(repositoryRoot, '.github', 'workflows', 'ci.yml');

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

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function projectPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} 缺少必要文本: ${expected}`);
}

function assertNoPrivateFragments(label, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${label} 泄露内部片段: ${fragment}`);
  }
}

const fixture = readJson(fixturePath);
const architectureDoc = readText(projectPath(fixture.architectureDoc));
const docsIndex = readText(docsIndexPath);
const developmentDoc = readText(developmentDocPath);
const pipelineDoc = readText(pipelineDocPath);
const packageJson = readJson(packagePath);
const ciWorkflow = readText(ciWorkflowPath);
const publicManifest = readJson(projectPath(fixture.publicManifest));

assertCondition(fixture.contract === 'unicodeartjs-developer-docs-architecture', '文档站架构 fixture contract 不正确。');
assertCondition(fixture.version === 1, '文档站架构 fixture version 必须为 1。');
assertCondition(Array.isArray(fixture.audiences) && fixture.audiences.length >= 5, '文档站架构必须覆盖主要读者类型。');
assertCondition(Array.isArray(fixture.sections) && fixture.sections.length === 8, '文档站架构必须包含 8 个分区。');
assertCondition(packageJson.scripts?.['docs:architecture:check'] === 'node scripts/check-developer-docs-architecture.cjs', '根脚本 docs:architecture:check 缺失或入口不正确。');
requireText(packageJson.scripts?.['docs:all:check'] || '', 'docs:architecture:check', 'package.json docs:all:check');
requireText(ciWorkflow, 'Check Developer Docs Architecture', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run docs:architecture:check', '.github/workflows/ci.yml');
requireText(docsIndex, 'developer-documentation-architecture.md', 'docs/README.md');
requireText(developmentDoc, 'npm run docs:architecture:check', 'docs/development.md');
requireText(pipelineDoc, 'developer-documentation-architecture.md', 'docs/documentation-pipeline.md');

for (const audience of fixture.audiences) {
  requireText(JSON.stringify(fixture), audience, 'developer-docs-architecture fixture');
}

for (const section of fixture.sections) {
  requireText(architectureDoc, section.title, fixture.architectureDoc);
  assertCondition(Array.isArray(section.requiredDocs) && section.requiredDocs.length > 0, `${section.id} 必须声明 requiredDocs。`);

  for (const relativePath of section.requiredDocs) {
    assertCondition(fs.existsSync(projectPath(relativePath)), `${section.id} 引用了不存在的公开文档: ${relativePath}`);
    requireText(architectureDoc, relativePath, fixture.architectureDoc);
  }
}

assertCondition(publicManifest.contract === 'unicodeartjs-public-docs-site-manifest', 'Web public docs manifest contract 不正确。');
assertCondition(Array.isArray(publicManifest.entries) && publicManifest.entries.length === 4, '当前 Web 文档站 API 入口数量应为 4。');
assertCondition(publicManifest.architecture?.contract === fixture.contract, 'Web public docs manifest 必须包含文档站架构契约。');
assertCondition(publicManifest.architecture?.version === fixture.version, 'Web public docs manifest 的文档站架构版本不一致。');
assertCondition(publicManifest.architecture?.checkCommand === fixture.checkCommand, 'Web public docs manifest 的架构检查命令不一致。');
assertCondition(publicManifest.architecture?.sections?.length === fixture.sections.length, 'Web public docs manifest 的文档分区数量不一致。');

for (const section of publicManifest.architecture.sections) {
  const expected = fixture.sections.find((item) => item.id === section.id);
  assertCondition(expected, `Web public docs manifest 包含未知分区: ${section.id}`);
  assertCondition(section.docCount === expected.requiredDocs.length, `${section.id} 的文档数量不一致。`);
  assertCondition(section.docs?.length === expected.requiredDocs.length, `${section.id} 的 docs 列表长度不一致。`);
  for (const doc of section.docs || []) {
    assertCondition(expected.requiredDocs.includes(doc.path), `${section.id} 引用了未知文档: ${doc.path}`);
    assertCondition(doc.url?.startsWith('https://github.com/mandolin/UnicodeArtJs/'), `${section.id} 文档 URL 必须指向公开仓库。`);
  }
}
for (const entry of publicManifest.entries) {
  assertCondition(entry.guideUrl?.startsWith('https://github.com/mandolin/UnicodeArtJs/'), `文档入口 ${entry.id} guideUrl 必须指向公开仓库。`);
}

assertNoPrivateFragments(fixture.architectureDoc, architectureDoc);
assertNoPrivateFragments('developer-docs-architecture fixture', JSON.stringify(fixture, null, 2));
assertNoPrivateFragments('public docs manifest', JSON.stringify(publicManifest, null, 2));

process.stdout.write('Developer documentation architecture checks passed.\n');
