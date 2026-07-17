#!/usr/bin/env node

/**
 * 检查公开入口是否保持一致。
 *
 * 该脚本只覆盖稳定公开入口和包 metadata，不访问网络；npm registry、
 * VS Code Marketplace 和 GitHub Actions 的实时状态由发布收尾记录人工复核。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const repositoryUrl = 'https://github.com/mandolin/UnicodeArtJs';
const issuesUrl = `${repositoryUrl}/issues`;
const pagesUrl = 'https://mandolin.github.io/UnicodeArtJs/';
const marketplaceUrl = 'https://marketplace.visualstudio.com/items?itemName=mandolin.unicode-art-js-vscode';

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
  assertCondition(content.includes(expected), `${label} is missing public entry text: ${expected}`);
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} leaks private or internal fragment: ${fragment}`);
  }
}

function assertPackageMetadata(relativePath, expected) {
  const packageJson = readJson(relativePath);
  const label = relativePath;
  assertCondition(packageJson.name === expected.name, `${label} has unexpected package name.`);
  if (expected.private !== undefined) {
    assertCondition(packageJson.private === expected.private, `${label} private flag mismatch.`);
  }

  assertCondition(packageJson.repository?.url?.includes('github.com/mandolin/UnicodeArtJs'), `${label} repository URL must point to the public repository.`);
  if (expected.directory) {
    assertCondition(packageJson.repository?.directory === expected.directory, `${label} repository.directory must be ${expected.directory}.`);
  }

  assertCondition(packageJson.bugs?.url === issuesUrl, `${label} bugs.url must point to ${issuesUrl}.`);
  assertCondition(packageJson.homepage === expected.homepage, `${label} homepage must be ${expected.homepage}.`);
  assertCondition(packageJson.license === 'MIT', `${label} license must remain MIT.`);
}

for (const relativePath of [
  'README.md',
  'docs/README.md',
  'docs/quickstart.md',
  'docs/support.md',
  'docs/known-limitations.md',
  'docs/experimental-stability.md',
  'docs/config-model-vnext.md',
  'docs/glyph-width-layout.md',
  'docs/semantic-uaf-beta.md',
  'docs/extension-sdk.md',
  'docs/desktop-host-baseline.md',
  'docs/optional-input-adapters.md',
  'docs/performance-and-release-plan.md',
  'docs/developer-documentation-architecture.md',
  'docs/release-gate.md',
  'docs/vscode-extension-integration.md',
  'docs/vscode-extension-release-checklist.md',
  'packages/core/README.md',
  'packages/cli/README.md',
  'packages/web/README.md',
  'packages/vscode-extension/README.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/labels.yml'
]) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `Missing public entry file: ${relativePath}`);
  assertNoPrivateFragments(relativePath, readUtf8(relativePath));
}

const rootReadme = readUtf8('README.md');
for (const expected of [
  pagesUrl,
  'https://www.npmjs.com/package/unicode-art-js',
  'https://www.npmjs.com/package/unicode-art-cli',
  marketplaceUrl,
  'docs/support.md',
  'docs/known-limitations.md',
  'docs/gallery.md',
  'docs/quickstart.md',
  'docs/recipes.md'
]) {
  requireText(rootReadme, expected, 'README.md');
}

const docsIndex = readUtf8('docs/README.md');
for (const expected of [
  'quickstart.md',
  'support.md',
  'known-limitations.md',
  'experimental-stability.md',
  'config-model-vnext.md',
  'glyph-width-layout.md',
  'semantic-uaf-beta.md',
  'extension-sdk.md',
  'desktop-host-baseline.md',
  'optional-input-adapters.md',
  'performance-and-release-plan.md',
  'developer-documentation-architecture.md',
  'release-gate.md',
  'ecosystem-compatibility.md',
  'vscode-extension-release-checklist.md'
]) {
  requireText(docsIndex, expected, 'docs/README.md');
}

for (const [relativePath, expected] of Object.entries({
  'package.json': {
    name: 'unicode-art-js-repo',
    private: true,
    homepage: pagesUrl
  },
  'packages/core/package.json': {
    name: 'unicode-art-js',
    directory: 'packages/core',
    homepage: `${repositoryUrl}/tree/main/packages/core#readme`
  },
  'packages/cli/package.json': {
    name: 'unicode-art-cli',
    directory: 'packages/cli',
    homepage: `${repositoryUrl}/tree/main/packages/cli#readme`
  },
  'packages/web/package.json': {
    name: '@unicode-art/web',
    private: true,
    directory: 'packages/web',
    homepage: pagesUrl
  },
  'packages/vscode-extension/package.json': {
    name: 'unicode-art-js-vscode',
    directory: 'packages/vscode-extension',
    homepage: marketplaceUrl
  }
})) {
  assertPackageMetadata(relativePath, expected);
}

const packageReadmeRequirements = {
  'packages/core/README.md': ['unicode-art-js', '../../docs/support.md', '../../docs/known-limitations.md'],
  'packages/cli/README.md': ['unicode-art-cli', '../../docs/support.md', '../../docs/known-limitations.md'],
  'packages/web/README.md': [pagesUrl, '../../docs/support.md', '../../docs/known-limitations.md'],
  'packages/vscode-extension/README.md': [marketplaceUrl, '../../docs/support.md', '../../docs/known-limitations.md']
};

for (const [relativePath, expectedTexts] of Object.entries(packageReadmeRequirements)) {
  const content = readUtf8(relativePath);
  for (const expected of expectedTexts) {
    requireText(content, expected, relativePath);
  }
}

process.stdout.write('Public entrypoint checks passed.\n');
