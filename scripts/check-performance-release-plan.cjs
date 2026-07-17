#!/usr/bin/env node
/**
 * 检查性能基线与发布计划是否仍和仓库脚本、CI、公开文档保持一致。
 *
 * 这里不执行耗时 benchmark，也不判断具体毫秒阈值。性能数字会受硬件和
 * 系统负载影响，脚本只保护“如何跑、何时跑、发布面如何决策”的公开契约。
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const paths = {
  rootPackage: path.join(repoRoot, 'package.json'),
  corePackage: path.join(repoRoot, 'packages', 'core', 'package.json'),
  planFixture: path.join(repoRoot, 'fixtures', 'performance-release', 'performance-release-plan.json'),
  planDoc: path.join(repoRoot, 'docs', 'performance-and-release-plan.md'),
  docsIndex: path.join(repoRoot, 'docs', 'README.md'),
  developmentDoc: path.join(repoRoot, 'docs', 'development.md'),
  releaseGateDoc: path.join(repoRoot, 'docs', 'release-gate.md'),
  releaseMaterialsDoc: path.join(repoRoot, 'docs', 'release-materials.md'),
  roadmapDoc: path.join(repoRoot, 'docs', 'roadmap.md'),
  releaseGateScript: path.join(repoRoot, 'scripts', 'release-gate.cjs'),
  publicEntrypointsScript: path.join(repoRoot, 'scripts', 'check-public-entrypoints.cjs'),
  ciWorkflow: path.join(repoRoot, '.github', 'workflows', 'ci.yml')
};

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

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} 缺少必要内容: ${expected}`);
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} 泄露内部片段: ${fragment}`);
  }
}

const rootPackage = readJson(paths.rootPackage);
const corePackage = readJson(paths.corePackage);
const fixture = readJson(paths.planFixture);
const planDoc = readText(paths.planDoc);
const docsIndex = readText(paths.docsIndex);
const developmentDoc = readText(paths.developmentDoc);
const releaseGateDoc = readText(paths.releaseGateDoc);
const releaseMaterialsDoc = readText(paths.releaseMaterialsDoc);
const roadmapDoc = readText(paths.roadmapDoc);
const releaseGateScript = readText(paths.releaseGateScript);
const publicEntrypointsScript = readText(paths.publicEntrypointsScript);
const ciWorkflow = readText(paths.ciWorkflow);

assertCondition(fixture.contract === 'unicodeartjs-performance-release-plan', '性能发布计划 fixture contract 不正确。');
assertCondition(fixture.version === 1, '性能发布计划 fixture version 必须为 1。');
assertCondition(fixture.nodeBaseline?.node === '22.x', '性能发布计划必须声明 Node 22.x 基线。');
assertCondition(fixture.nodeBaseline?.npm === '10.x', '性能发布计划必须声明 npm 10.x 基线。');
assertCondition(fixture.nodeBaseline?.coreTextRenderer === '@napi-rs/canvas@1.0.2', '性能发布计划必须声明 @napi-rs/canvas@1.0.2。');
assertCondition(fixture.nodeBaseline?.coreImageBackend === '@napi-rs/image@1.14.0', '性能发布计划必须声明 @napi-rs/image@1.14.0。');
assertCondition(corePackage.dependencies?.['@napi-rs/canvas'] === '1.0.2', 'Core package 中 @napi-rs/canvas 版本与性能计划不一致。');
assertCondition(corePackage.dependencies?.['@napi-rs/image'] === '1.14.0', 'Core package 中 @napi-rs/image 版本与性能计划不一致。');
assertCondition(corePackage.scripts?.benchmark === 'node tools/benchmark.mjs', 'Core benchmark 脚本入口必须保持稳定。');

for (const command of fixture.benchmarkCommands || []) {
  requireText(planDoc, command, 'docs/performance-and-release-plan.md');
}

for (const command of fixture.requiredLocalChecks || []) {
  const scriptName = command.replace(/^npm run\s+/, '');
  if (scriptName.includes(' ')) {
    continue;
  }
  assertCondition(
    rootPackage.scripts?.[scriptName],
    `根 package.json 缺少性能发布计划要求的脚本: ${scriptName}`
  );
}

for (const surface of fixture.releaseSurfaces || []) {
  requireText(planDoc, surface, 'docs/performance-and-release-plan.md');
}

for (const required of [
  'performance-release:check',
  'release-materials:check',
  'benchmark:core',
  'release:gate'
]) {
  assertCondition(rootPackage.scripts?.[required], `根 package.json 缺少脚本: ${required}`);
}

requireText(rootPackage.scripts['release:gate'], 'performance-release:check', 'package.json release:gate');
requireText(rootPackage.scripts['release:gate'], 'release-materials:check', 'package.json release:gate');
requireText(ciWorkflow, 'Check Performance Release Plan', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run performance-release:check', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'Check Release Materials', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run release-materials:check', '.github/workflows/ci.yml');
requireText(docsIndex, 'performance-and-release-plan.md', 'docs/README.md');
requireText(docsIndex, 'release-materials.md', 'docs/README.md');
requireText(developmentDoc, 'npm run benchmark:core', 'docs/development.md');
requireText(developmentDoc, 'npm run performance-release:check', 'docs/development.md');
requireText(developmentDoc, 'npm run release-materials:check', 'docs/development.md');
requireText(releaseGateDoc, 'performance-release:check', 'docs/release-gate.md');
requireText(releaseGateDoc, 'release-materials:check', 'docs/release-gate.md');
requireText(releaseGateDoc, 'benchmark:core', 'docs/release-gate.md');
requireText(releaseMaterialsDoc, 'GitHub Release', 'docs/release-materials.md');
requireText(releaseMaterialsDoc, 'post-release', 'docs/release-materials.md');
requireText(roadmapDoc, '性能基线与发布计划', 'docs/roadmap.md');
requireText(releaseGateScript, 'performanceReleaseDoc', 'scripts/release-gate.cjs');
requireText(releaseGateScript, 'performanceReleasePlan', 'scripts/release-gate.cjs');
requireText(releaseGateScript, 'releaseMaterialsDoc', 'scripts/release-gate.cjs');
requireText(publicEntrypointsScript, 'docs/performance-and-release-plan.md', 'scripts/check-public-entrypoints.cjs');
requireText(publicEntrypointsScript, 'docs/release-materials.md', 'scripts/check-public-entrypoints.cjs');

for (const [relativePath, content] of Object.entries({
  'docs/performance-and-release-plan.md': planDoc,
  'fixtures/performance-release/performance-release-plan.json': JSON.stringify(fixture, null, 2),
  'docs/release-materials.md': releaseMaterialsDoc
})) {
  assertNoPrivateFragments(relativePath, content);
}

process.stdout.write('Performance and release plan checks passed.\n');
