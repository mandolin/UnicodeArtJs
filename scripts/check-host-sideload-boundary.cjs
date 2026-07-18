#!/usr/bin/env node

/**
 * 校验宿主侧载与资源读取边界。
 *
 * 该脚本保护 UAEM v1 在 Core、CLI、Web、VS Code、Desktop 和 Compatible
 * 宿主中的共同读取契约，避免后续文档把声明式资源包误写成代码插件或远程市场。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

const docs = {
  boundary: 'docs/host-sideload-boundary.md',
  index: 'docs/README.md',
  host: 'docs/host-integration.md',
  extensionSdk: 'docs/extension-sdk.md',
  extensionManifest: 'docs/extension-manifest.md',
  web: 'docs/web-integration.md',
  vscode: 'docs/vscode-extension-integration.md',
  desktop: 'docs/desktop-host-baseline.md',
  compatible: 'docs/compatible-project-guide.md',
  resourceDiscovery: 'docs/resource-discovery-experimental.md',
  creative: 'docs/creative-ecosystem.md',
  development: 'docs/development.md',
  releaseGate: 'docs/release-gate.md',
  architecture: 'docs/developer-documentation-architecture.md'
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
  assertCondition(content.includes(expected), `${label} is missing required text: ${expected}`);
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} leaks private or internal fragment: ${fragment}`);
  }
}

function assertExists(relativePath) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `Missing file: ${relativePath}`);
}

function checkDocsExistAndArePublic() {
  for (const relativePath of Object.values(docs)) {
    assertExists(relativePath);
    assertNoPrivateFragments(relativePath, readUtf8(relativePath));
  }
}

function checkBoundaryDoc() {
  const boundary = readUtf8(docs.boundary);
  for (const expected of [
    '# 宿主侧载与资源读取边界',
    '基本原则',
    '宿主读取矩阵',
    'UAEM v1 侧载流程',
    '静态画廊边界',
    '资源发现导入确认矩阵',
    '签名、撤回与缓存状态',
    '错误、缓存与回退',
    '未来扩展',
    'Core',
    'CLI',
    'Web',
    'VS Code Extension',
    'Desktop',
    'Compatible 应用',
    '只读取用户显式选择的清单',
    '只读取 `resources[]` 中声明的文件',
    '真实路径',
    '不扫描目录',
    '不执行扩展代码',
    '不自动联网',
    '信任状态',
    '撤回状态',
    '缓存目标',
    'unsigned-draft',
    'maintainer-signed',
    'invalid-signature',
    'expired',
    'revoked-key',
    'revoked-resource',
    'hash-mismatch',
    'cache-hit',
    'stale-cache',
    '缓存不能提升信任等级',
    '撤回和失败状态优先于缓存命中',
    '用户取消',
    'hash lock',
    'unicode-art-gallery-index@1',
    'host-integration.md',
    'extension-sdk.md',
    'desktop-host-baseline.md',
    'gallery-submission.md',
    'gallery-review.md'
  ]) {
    requireText(boundary, expected, docs.boundary);
  }
}

function checkCrossLinks() {
  const requiredLinks = {
    [docs.index]: ['host-sideload-boundary.md'],
    [docs.host]: ['host-sideload-boundary.md', 'unicode-art-extension@1'],
    [docs.extensionSdk]: ['host-sideload-boundary.md', '宿主能力矩阵'],
    [docs.extensionManifest]: ['host-sideload-boundary.md', 'extension-sdk.md'],
    [docs.web]: ['host-sideload-boundary.md', 'Web 默认不做完整 UAEM 资源侧载'],
    [docs.vscode]: ['host-sideload-boundary.md', '资源包侧载边界'],
    [docs.desktop]: ['host-sideload-boundary.md', '声明式扩展 SDK', '资源发现与用户确认'],
    [docs.compatible]: ['host-sideload-boundary.md', '自动安装'],
    [docs.resourceDiscovery]: ['host-sideload-boundary.md', '资源发现导入确认矩阵'],
    [docs.creative]: ['host-sideload-boundary.md', 'npm run host-sideload:check'],
    [docs.development]: ['host-sideload:check', 'host-sideload-boundary.md'],
    [docs.releaseGate]: ['host-sideload:check', 'manifest-only Web inspection'],
    [docs.architecture]: ['host-sideload-boundary.md']
  };

  for (const [relativePath, expectedTexts] of Object.entries(requiredLinks)) {
    const content = readUtf8(relativePath);
    for (const expected of expectedTexts) {
      requireText(content, expected, relativePath);
    }
  }
}

function checkScriptsAndCi() {
  const packageJson = readJson('package.json');
  assertCondition(
    packageJson.scripts?.['host-sideload:check'] === 'node scripts/check-host-sideload-boundary.cjs',
    'package.json must expose host-sideload:check.'
  );
  requireText(packageJson.scripts?.['release:gate'] || '', 'npm run host-sideload:check', 'package.json release:gate');

  const ci = readUtf8('.github/workflows/ci.yml');
  requireText(ci, 'Check Host Sideload Boundary', '.github/workflows/ci.yml');
  requireText(ci, 'npm run host-sideload:check', '.github/workflows/ci.yml');
}

function main() {
  checkDocsExistAndArePublic();
  checkBoundaryDoc();
  checkCrossLinks();
  checkScriptsAndCi();
  process.stdout.write('Host sideload boundary checks passed.\n');
}

main();
