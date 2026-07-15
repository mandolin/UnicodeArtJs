#!/usr/bin/env node

/**
 * 生成 UnicodeArtJs 文档产物统一清单。
 *
 * 该脚本只聚合已经生成的本地文档产物，不负责渲染最终公开站点。
 * 清单写入被 Git 忽略的 `.generated-docs/`，供 CI、发布前检查和后续站点聚合工具读取。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(repositoryRoot, '.generated-docs');
const manifestPath = path.join(generatedRoot, 'documentation-manifest.json');

const hiaJsdocRequiredFiles = [
  'index.html',
  'index.zh-CN.html',
  'index.en.html',
  'search-index.json',
  'i18n-index.json',
  'hia-metadata.json',
  'hia-integration.json'
];

const tsdocArtifactKindOrder = [
  'generated-js',
  'ordinary-source-map',
  'tsdoc-extraction',
  'jsdoc-bridge',
  'hia-document',
  'doc-source-map'
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function toProjectPath(filePath) {
  return path.relative(repositoryRoot, filePath).replace(/\\/g, '/');
}

function readPackageVersion(packagePath) {
  const packageJson = readJson(path.join(repositoryRoot, packagePath, 'package.json'));
  return packageJson.version;
}

function countBy(items, keySelector) {
  return items.reduce((counts, item) => {
    const key = keySelector(item);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function collectHiaJsdocEntry(definition) {
  const outputRoot = path.join(generatedRoot, definition.generatedSubdirectory);
  const integrationPath = path.join(outputRoot, 'hia-integration.json');

  for (const fileName of hiaJsdocRequiredFiles) {
    assertCondition(
      fs.existsSync(path.join(outputRoot, fileName)),
      `Missing ${definition.id} generated documentation file: ${fileName}`
    );
  }

  const integration = readJson(integrationPath);
  const nodes = integration.ir?.nodes ?? [];
  const nodeKinds = countBy(nodes, (node) => node.kind ?? 'unknown');

  assertCondition(
    integration.contract === 'hia-jsdoc-integration',
    `${definition.id} must produce hia-jsdoc-integration output.`
  );

  return {
    id: definition.id,
    title: definition.title,
    packageName: definition.packageName,
    packageVersion: readPackageVersion(definition.packagePath),
    surface: definition.surface,
    documentationKind: 'hia-jsdoc',
    stability: definition.stability,
    sourceConfig: definition.sourceConfig,
    outputRoot: toProjectPath(outputRoot),
    primaryOutput: toProjectPath(path.join(outputRoot, 'index.html')),
    integrationPath: toProjectPath(integrationPath),
    publicGuide: definition.publicGuide,
    checkCommand: definition.checkCommand,
    producer: {
      id: 'jsdoc',
      plugin: '@mandolin/jsdoc-plugin-hia-sys',
      pluginVersion: integration.pluginVersion
    },
    metrics: {
      nodeCount: nodes.length,
      nodeKinds,
      localizedHtmlFiles: ['index.zh-CN.html', 'index.en.html'],
      requiredFiles: hiaJsdocRequiredFiles
    }
  };
}

function collectTsdocEntry(definition) {
  const outputRoot = path.join(generatedRoot, definition.generatedSubdirectory);
  const resultPath = path.join(outputRoot, 'tsdoc.producer-result.json');
  const configPath = path.join(repositoryRoot, definition.sourceConfig);

  assertCondition(fs.existsSync(configPath), `Missing ${definition.id} TSDoc config: ${definition.sourceConfig}`);
  assertCondition(fs.existsSync(resultPath), `Missing ${definition.id} TSDoc producer result.`);

  const config = readJson(configPath);
  const result = readJson(resultPath);
  const artifacts = result.artifacts ?? [];
  const artifactKinds = countBy(artifacts, (artifact) => artifact.kind ?? 'unknown');

  assertCondition(
    result.contract === 'documentation-producer-result',
    `${definition.id} must produce documentation-producer-result output.`
  );
  assertCondition(result.status === 'success', `${definition.id} TSDoc result must be success.`);

  for (const artifact of artifacts) {
    assertCondition(
      fs.existsSync(path.join(outputRoot, artifact.path)),
      `${definition.id} is missing generated artifact: ${artifact.path}`
    );
  }

  return {
    id: definition.id,
    title: definition.title,
    packageName: definition.packageName,
    packageVersion: readPackageVersion(definition.packagePath),
    surface: definition.surface,
    documentationKind: 'hia-tsdoc',
    stability: definition.stability,
    sourceConfig: definition.sourceConfig,
    outputRoot: toProjectPath(outputRoot),
    primaryOutput: toProjectPath(resultPath),
    publicGuide: definition.publicGuide,
    checkCommand: definition.checkCommand,
    producer: result.producer,
    metrics: {
      inputCount: config.inputs?.length ?? 0,
      artifactCount: artifacts.length,
      artifactKinds: tsdocArtifactKindOrder.reduce((ordered, kind) => {
        ordered[kind] = artifactKinds[kind] ?? 0;
        return ordered;
      }, {})
    }
  };
}

const entries = [
  collectTsdocEntry({
    id: 'core-tsdoc',
    title: 'Core TypeScript API',
    packageName: 'unicode-art-js',
    packagePath: 'packages/core',
    surface: 'core',
    stability: 'intermediate',
    sourceConfig: 'tsdoc.core.json',
    generatedSubdirectory: path.join('tsdoc', 'core'),
    publicGuide: 'docs/code-documentation.md#core-tsdoc-中间文档',
    checkCommand: 'npm run docs:tsdoc:core:check'
  }),
  collectHiaJsdocEntry({
    id: 'cli-jsdoc',
    title: 'CLI JavaScript API',
    packageName: 'unicode-art-cli',
    packagePath: 'packages/cli',
    surface: 'cli',
    stability: 'pilot',
    sourceConfig: 'tools/docs/jsdoc.cli.json',
    generatedSubdirectory: 'cli',
    publicGuide: 'docs/code-documentation.md#双语-jsdoc-约定',
    checkCommand: 'npm run docs:cli:check'
  }),
  collectHiaJsdocEntry({
    id: 'web-jsdoc',
    title: 'Web Gallery JavaScript API',
    packageName: '@unicode-art/web',
    packagePath: 'packages/web',
    surface: 'web',
    stability: 'pilot',
    sourceConfig: 'tools/docs/jsdoc.web.json',
    generatedSubdirectory: 'web',
    publicGuide: 'docs/web-integration.md',
    checkCommand: 'npm run docs:web:check'
  }),
  collectTsdocEntry({
    id: 'vscode-tsdoc',
    title: 'VS Code Extension TypeScript API',
    packageName: 'unicode-art-js-vscode',
    packagePath: 'packages/vscode-extension',
    surface: 'vscode-extension',
    stability: 'intermediate',
    sourceConfig: 'tsdoc.vscode-extension.json',
    generatedSubdirectory: path.join('tsdoc', 'vscode-extension'),
    publicGuide: 'docs/vscode-extension-integration.md',
    checkCommand: 'npm run docs:tsdoc:vscode:check'
  })
];

const manifest = {
  contract: 'unicodeartjs-documentation-manifest',
  contractVersion: '0.1.0',
  generatedAt: new Date().toISOString(),
  repository: {
    name: 'UnicodeArtJs',
    url: 'https://github.com/mandolin/UnicodeArtJs',
    homepage: 'https://mandolin.github.io/UnicodeArtJs/'
  },
  policy: {
    generatedRoot: '.generated-docs',
    generatedArtifactsCommitted: false,
    publicDocumentationExcludes: ['work-zone', 'ai', '.generated-docs'],
    sourcesContentPolicy: 'none'
  },
  entries
};

fs.mkdirSync(generatedRoot, { recursive: true });
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

process.stdout.write(`Documentation manifest written to ${toProjectPath(manifestPath)}.\n`);
