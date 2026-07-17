#!/usr/bin/env node

/**
 * 校验公开文档质量、术语和注释抽样契约。
 *
 * 该脚本保护 P7 文档采用周期的质量底线：它不替代人工技术审查，
 * 但会阻止公开文档入口、术语说明和抽样注释覆盖出现明显漂移。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');

const requiredFiles = [
  'README.md',
  'docs/README.md',
  'docs/code-documentation.md',
  'docs/documentation-quality.md',
  'docs/documentation-pipeline.md',
  'docs/developer-documentation-architecture.md',
  'docs/development.md',
  'package.json',
  '.github/workflows/ci.yml',
  'fixtures/docs-site/developer-docs-architecture.json',
  'scripts/check-documentation-contract.cjs',
  'packages/core/src/types/config.ts',
  'packages/core/src/capabilities.ts',
  'packages/core/src/types/output.ts',
  'packages/cli/src/console.js',
  'packages/web/src/gallery-index.js',
  'packages/web/src/main.js',
  'packages/vscode-extension/src/config/types.ts',
  'packages/vscode-extension/src/webview/protocol.ts',
  'packages/vscode-extension/src/commands/convertImageFile.ts',
  'packages/vscode-extension/src/i18n.ts'
];

const forbiddenPublicFragments = [
  'work-zone',
  'ai/codex',
  'ai\\codex',
  'W-art-',
  'T-apple',
  'T-tea',
  'Qoder',
  'Comate',
  'Codex',
  'K:\\',
  'C:\\Users\\'
];

const discouragedTerminology = [
  '像素字符',
  '字素字符',
  'fontreduce'
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
  assertCondition(content.includes(expected), `${label} 缺少质量契约文本: ${expected}`);
}

function countOccurrences(content, needle) {
  return content.split(needle).length - 1;
}

function listMarkdownFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listMarkdownFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.md') ? [fullPath] : [];
  });
}

function assertNoPrivateFragments(label, content) {
  for (const fragment of forbiddenPublicFragments) {
    assertCondition(!content.includes(fragment), `${label} 泄露内部或协作片段: ${fragment}`);
  }
}

function assertNoDiscouragedTerminology(label, content) {
  for (const term of discouragedTerminology) {
    assertCondition(!content.includes(term), `${label} 使用了不推荐术语: ${term}`);
  }
}

for (const relativePath of requiredFiles) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `缺少文档质量相关文件: ${relativePath}`);
}

const packageJson = readJson('package.json');
const ciWorkflow = readUtf8('.github/workflows/ci.yml');
const docsIndex = readUtf8('docs/README.md');
const developmentDoc = readUtf8('docs/development.md');
const codeDocumentation = readUtf8('docs/code-documentation.md');
const qualityDoc = readUtf8('docs/documentation-quality.md');
const pipelineDoc = readUtf8('docs/documentation-pipeline.md');
const architectureDoc = readUtf8('docs/developer-documentation-architecture.md');
const architectureFixture = readJson('fixtures/docs-site/developer-docs-architecture.json');

for (const expected of [
  '文档质量',
  '术语抽查',
  '注释抽样',
  '公开文案',
  'manual review',
  'npm run docs:quality:check',
  'npm run docs:contract:check',
  'npm run docs:all:check',
  'docs/code-documentation.md',
  'docs/documentation-pipeline.md',
  'docs/developer-documentation-architecture.md',
  '字素',
  '视觉字体',
  '字素字体',
  '宽字素',
  '裱框',
  '语义文档',
  'Unicode Art Font (UAF)',
  'glyph font',
  'visual font',
  'stable',
  'experimental',
  'reserved',
  'legacy',
  'deprecated'
]) {
  requireText(qualityDoc, expected, 'docs/documentation-quality.md');
}

assertCondition(
  packageJson.scripts?.['docs:quality:check'] === 'node scripts/check-documentation-quality.cjs',
  'package.json 必须声明 docs:quality:check。'
);
requireText(packageJson.scripts?.['docs:all:check'] || '', 'docs:quality:check', 'package.json docs:all:check');
requireText(packageJson.scripts?.['release:gate'] || '', 'docs:quality:check', 'package.json release:gate');
requireText(ciWorkflow, 'Check Documentation Quality', '.github/workflows/ci.yml');
requireText(ciWorkflow, 'npm run docs:quality:check', '.github/workflows/ci.yml');
requireText(docsIndex, 'documentation-quality.md', 'docs/README.md');
requireText(developmentDoc, 'npm run docs:quality:check', 'docs/development.md');
requireText(codeDocumentation, 'documentation-quality.md', 'docs/code-documentation.md');
requireText(pipelineDoc, 'docs:quality:check', 'docs/documentation-pipeline.md');
requireText(architectureDoc, 'docs/documentation-quality.md', 'docs/developer-documentation-architecture.md');

const apiReferenceSection = architectureFixture.sections.find((section) => section.id === 'api-reference');
assertCondition(
  apiReferenceSection?.requiredDocs?.includes('docs/documentation-quality.md'),
  'developer-docs-architecture fixture 的 API Reference 分区必须包含 docs/documentation-quality.md。'
);

const markdownFiles = [
  projectPath('README.md'),
  ...listMarkdownFiles(projectPath('docs')),
  projectPath('packages/core/README.md'),
  projectPath('packages/cli/README.md'),
  projectPath('packages/web/README.md'),
  projectPath('packages/vscode-extension/README.md')
];

for (const filePath of markdownFiles) {
  const relativePath = path.relative(repositoryRoot, filePath).replace(/\\/g, '/');
  const content = fs.readFileSync(filePath, 'utf8');
  assertNoPrivateFragments(relativePath, content);
  if (relativePath !== 'docs/documentation-quality.md') {
    assertNoDiscouragedTerminology(relativePath, content);
  }
}

const sampleRequirements = {
  'packages/core/src/types/config.ts': [
    'Visual-font configuration',
    '视觉字体',
    'Glyph-font configuration',
    '字素字体',
    'wideCharRegex',
    'experimental'
  ],
  'packages/core/src/capabilities.ts': [
    'Core 能力稳定性标签',
    'Gets a snapshot of the current public Core capability boundary',
    '@returns The current Core capability snapshot',
    'stable',
    'experimental',
    'reserved',
    'legacy'
  ],
  'packages/core/src/types/output.ts': [
    'Machine-readable error codes',
    'Error object emitted by UnicodeArtJs public APIs',
    '调用方应优先使用 `code`',
    'UTF-8 文本大小并不必然等于'
  ],
  'packages/vscode-extension/src/config/types.ts': [
    'VS Code 扩展内部统一配置',
    '视觉字体',
    '字素字体',
    '输出宿主固定为 VS Code'
  ],
  'packages/vscode-extension/src/webview/protocol.ts': [
    'WebView 初始化状态',
    '所有消息必须先通过 `isWebviewMessage` 校验',
    '@param value',
    '@returns `true` 表示可按 `WebviewMessage` 处理'
  ],
  'packages/web/src/main.js': [
    '当前版本不支持上传',
    '静态作品画廊控制器'
  ]
};

for (const [relativePath, snippets] of Object.entries(sampleRequirements)) {
  const content = readUtf8(relativePath);
  for (const snippet of snippets) {
    requireText(content, snippet, relativePath);
  }
}

for (const [relativePath, minimumPairCount] of Object.entries({
  'packages/cli/src/console.js': 20,
  'packages/web/src/gallery-index.js': 6,
  'scripts/check-documentation-contract.cjs': 1,
  'scripts/check-documentation-quality.cjs': 0
})) {
  const content = readUtf8(relativePath);
  const zhCount = countOccurrences(content, '@lang zh-CN');
  const enCount = countOccurrences(content, '@lang en');
  assertCondition(
    zhCount === enCount,
    `${relativePath} 的 @lang zh-CN / @lang en 数量不一致: ${zhCount} / ${enCount}`
  );
  assertCondition(
    zhCount >= minimumPairCount,
    `${relativePath} 的双语注释抽样数量低于预期: ${zhCount} < ${minimumPairCount}`
  );
}

const imageCommandSource = readUtf8('packages/vscode-extension/src/commands/convertImageFile.ts');
requireText(imageCommandSource, "t('message.localImageOnly')", 'packages/vscode-extension/src/commands/convertImageFile.ts');
assertCondition(
  !imageCommandSource.includes('in this phase'),
  'packages/vscode-extension/src/commands/convertImageFile.ts 不应暴露 this phase 这类内部阶段表达。'
);

const vscodeI18n = readUtf8('packages/vscode-extension/src/i18n.ts');
requireText(vscodeI18n, "'message.localImageOnly'", 'packages/vscode-extension/src/i18n.ts');
requireText(vscodeI18n, '当前版本仅支持转换本地图片文件。', 'packages/vscode-extension/src/i18n.ts');
requireText(vscodeI18n, 'Only local image files can be converted for now.', 'packages/vscode-extension/src/i18n.ts');

process.stdout.write('Documentation quality checks passed.\n');
