#!/usr/bin/env node
/**
 * 检查可选输入格式与 adapter 的公开边界。
 *
 * 该脚本不访问网络，只核对当前默认 Clean 路径的格式承诺、公开文档、
 * VS Code 入口和发布门禁是否保持一致。
 */

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const policyPath = path.join(repoRoot, 'fixtures', 'adapters', 'optional-input-adapters-policy.json');
const coreDistPath = path.join(repoRoot, 'packages', 'core', 'dist', 'index.cjs.js');

const forbiddenPublicFragments = [
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
  return path.join(repoRoot, relativePath);
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
  for (const fragment of forbiddenPublicFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} leaks private/internal fragment: ${fragment}`);
  }
}

function assertArrayEqual(actual, expected, label) {
  assertCondition(
    JSON.stringify(actual) === JSON.stringify(expected),
    `${label} mismatch. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
  );
}

function extractSupportedNapiFormats(source) {
  const match = /SUPPORTED_NAPI_INPUT_FORMATS\s*=\s*new Set\(\[([^\]]+)\]\)/m.exec(source);
  assertCondition(Boolean(match), 'Could not find SUPPORTED_NAPI_INPUT_FORMATS in napiRsImageBackend.ts.');
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
}

const policy = JSON.parse(fs.readFileSync(policyPath, 'utf8'));
assertCondition(policy.contract === 'unicodeartjs-optional-input-adapters-policy', 'Optional adapter policy contract changed.');
assertCondition(policy.version === 1, 'Optional adapter policy version must be 1.');
assertArrayEqual(policy.defaultCleanNodeFormats, ['png', 'jpeg', 'jpg', 'webp', 'bmp'], 'Default Clean Node formats');

const publicDocs = [
  'docs/optional-input-adapters.md',
  'docs/README.md',
  'docs/development.md',
  'docs/release-gate.md',
  'docs/runtime-sbom.md',
  'docs/license-audit.md',
  'docs/host-integration.md',
  'docs/compatible-project-guide.md',
  'docs/ecosystem-compatibility.md',
  'docs/desktop-host-baseline.md',
  'packages/vscode-extension/README.md'
];

for (const relativePath of publicDocs) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `Missing public doc: ${relativePath}`);
  assertNoPrivateFragments(relativePath, readText(relativePath));
}

const optionalDoc = readText('docs/optional-input-adapters.md');
for (const expected of [
  'PNG / JPEG / JPG / WebP / BMP',
  'CoreImageData',
  'UNSUPPORTED_FORMAT',
  'Clean',
  'Compatible',
  'Pure Host Adapter',
  '外部转换器',
  'GIF',
  'SVG',
  'TIFF',
  'HEIF',
  'AVIF',
  'npm run optional-adapters:check'
]) {
  requireText(optionalDoc, expected, 'docs/optional-input-adapters.md');
}

const docsIndex = readText('docs/README.md');
requireText(docsIndex, 'optional-input-adapters.md', 'docs/README.md');

const developmentDoc = readText('docs/development.md');
requireText(developmentDoc, 'npm run optional-adapters:check', 'docs/development.md');

const releaseDoc = readText('docs/release-gate.md');
requireText(releaseDoc, 'optional-adapters:check', 'docs/release-gate.md');
requireText(releaseDoc, '可选输入格式', 'docs/release-gate.md');

for (const [relativePath, expected] of Object.entries({
  'docs/runtime-sbom.md': 'optional-input-adapters.md',
  'docs/license-audit.md': 'optional-input-adapters.md',
  'docs/host-integration.md': 'optional-input-adapters.md',
  'docs/compatible-project-guide.md': 'optional-input-adapters.md',
  'docs/ecosystem-compatibility.md': 'optional-input-adapters.md',
  'docs/desktop-host-baseline.md': '可选输入格式'
})) {
  requireText(readText(relativePath), expected, relativePath);
}

const rootPackage = readJson('package.json');
assertCondition(
  rootPackage.scripts?.['optional-adapters:check']?.includes('check-optional-input-adapters.cjs'),
  'package.json must define optional-adapters:check.'
);
assertCondition(
  rootPackage.scripts?.['release:gate']?.includes('optional-adapters:check'),
  'release:gate must include optional-adapters:check.'
);

const ciWorkflow = readText('.github/workflows/ci.yml');
requireText(ciWorkflow, 'Check Optional Input Adapters', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run optional-adapters:check', '.github/workflows/ci.yml');

const corePackage = readJson('packages/core/package.json');
assertCondition(corePackage.dependencies?.['@napi-rs/image'] === '1.14.0', 'Core must pin @napi-rs/image@1.14.0.');
for (const marker of ['sharp', 'canvas']) {
  assertCondition(!corePackage.dependencies?.[marker], `Core dependencies must not include ${marker}.`);
  assertCondition(!corePackage.optionalDependencies?.[marker], `Core optionalDependencies must not include ${marker}.`);
}

const napiSource = readText('packages/core/src/platform/node/napiRsImageBackend.ts');
assertArrayEqual(extractSupportedNapiFormats(napiSource), policy.defaultCleanNodeFormats, 'napi-rs supported formats');
for (const format of policy.notDefaultFormats) {
  assertCondition(
    !extractSupportedNapiFormats(napiSource).includes(format),
    `napi-rs default format list must not include ${format}.`
  );
}

assertCondition(fs.existsSync(coreDistPath), 'Core dist is missing. Run npm run build:core before optional-adapters:check.');
const core = require(coreDistPath);
const capabilities = core.getCoreCapabilities?.();
assertCondition(Boolean(capabilities), 'Core dist must export getCoreCapabilities().');
assertArrayEqual(
  capabilities.nodeImageBackends?.napiRsFirstBatchFormats,
  policy.defaultCleanNodeFormats,
  'getCoreCapabilities().nodeImageBackends.napiRsFirstBatchFormats'
);

const vscodePackage = readJson('packages/vscode-extension/package.json');
const explorerMenu = JSON.stringify(vscodePackage.contributes?.menus?.['explorer/context'] || []);
for (const format of policy.defaultCleanNodeFormats) {
  requireText(explorerMenu, format === 'jpeg' ? 'jpg|jpeg' : format, 'VS Code explorer image menu');
}
for (const format of ['gif', 'svg', 'tiff', 'tif']) {
  assertCondition(!new RegExp(`\\\\.${format}|\\b${format}\\b`, 'i').test(explorerMenu), `VS Code Explorer menu must not expose ${format}.`);
}

const vscodeImageCommand = readText('packages/vscode-extension/src/commands/convertImageFile.ts');
const vscodeWebviewHtml = readText('packages/vscode-extension/src/webview/html.ts');
const vscodeWebviewMessaging = readText('packages/vscode-extension/src/webview/messaging.ts');
for (const format of ['gif', 'svg', 'tiff', 'tif']) {
  assertCondition(!new RegExp(`['"]${format}['"]`, 'i').test(vscodeImageCommand), `VS Code image command must not list ${format}.`);
  assertCondition(!new RegExp(`image/${format}`, 'i').test(vscodeWebviewHtml), `VS Code WebView accept list must not expose image/${format}.`);
  assertCondition(!new RegExp(`image/${format}`, 'i').test(vscodeWebviewMessaging), `VS Code WebView messaging must not map image/${format}.`);
}

const vscodeReadme = readText('packages/vscode-extension/README.md');
requireText(vscodeReadme, '`png`, `jpg`, `jpeg`, `webp`, or `bmp`', 'packages/vscode-extension/README.md');
assertCondition(!vscodeReadme.includes('`gif`'), 'VS Code README must not list gif as a default supported image format.');

process.stdout.write('Optional input adapter checks passed.\n');
