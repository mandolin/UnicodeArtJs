#!/usr/bin/env node

/**
 * 校验 UnicodeArtJs 文档产物统一清单。
 *
 * 该检查负责确认文档聚合层没有丢失公开面、没有引用内部资料，
 * 且不会把 TypeScript 源文嵌入到可发布的 source map 中。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const manifestPath = path.join(repositoryRoot, '.generated-docs', 'documentation-manifest.json');

const expectedEntries = {
  'core-tsdoc': {
    documentationKind: 'hia-tsdoc',
    artifactCount: 240,
    inputCount: 40,
    producerVersion: '0.1.2'
  },
  'cli-jsdoc': {
    documentationKind: 'hia-jsdoc',
    nodeCount: 37,
    pluginVersion: '0.1.1'
  },
  'web-jsdoc': {
    documentationKind: 'hia-jsdoc',
    nodeCount: 8,
    pluginVersion: '0.1.1'
  },
  'vscode-tsdoc': {
    documentationKind: 'hia-tsdoc',
    artifactCount: 96,
    inputCount: 16,
    producerVersion: '0.1.2'
  }
};

const expectedTsdocKinds = [
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

function toAbsoluteProjectPath(projectPath) {
  return path.resolve(repositoryRoot, projectPath);
}

function assertInsideGenerated(projectPath, label) {
  const absolutePath = toAbsoluteProjectPath(projectPath);
  const generatedRoot = path.join(repositoryRoot, '.generated-docs');
  const relativePath = path.relative(generatedRoot, absolutePath);

  assertCondition(
    relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath),
    `${label} must stay inside .generated-docs: ${projectPath}`
  );

  return absolutePath;
}

function hasEmbeddedSourceContent(value) {
  if (Array.isArray(value)) {
    return value.some((item) => hasEmbeddedSourceContent(item));
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  if (Array.isArray(value.sourcesContent)
    && value.sourcesContent.some((source) => typeof source === 'string' && source.length > 0)) {
    return true;
  }

  return Object.values(value).some((item) => hasEmbeddedSourceContent(item));
}

function checkNoInternalPathLeak(manifest) {
  const serialized = JSON.stringify(manifest);
  const forbiddenFragments = ['work-zone/', 'work-zone\\\\', 'ai/codex', 'ai\\\\codex'];

  for (const fragment of forbiddenFragments) {
    assertCondition(!serialized.includes(fragment), `Documentation manifest leaks internal path: ${fragment}`);
  }
}

function checkTsdocEntry(entry, expected) {
  const outputRoot = assertInsideGenerated(entry.outputRoot, `${entry.id} outputRoot`);
  const resultPath = assertInsideGenerated(entry.primaryOutput, `${entry.id} primaryOutput`);
  const result = readJson(resultPath);

  assertCondition(result.contract === 'documentation-producer-result', `${entry.id} result contract changed.`);
  assertCondition(result.status === 'success', `${entry.id} result status must be success.`);
  assertCondition(result.producer?.id === 'tsdoc', `${entry.id} producer id must be tsdoc.`);
  assertCondition(result.producer?.version === expected.producerVersion,
    `${entry.id} producer version must be ${expected.producerVersion}.`);
  assertCondition(result.artifacts?.length === expected.artifactCount,
    `${entry.id} artifact count changed: ${result.artifacts?.length ?? 0}.`);

  assertCondition(entry.metrics?.artifactCount === expected.artifactCount,
    `${entry.id} manifest artifact count changed.`);
  assertCondition(entry.metrics?.inputCount === expected.inputCount,
    `${entry.id} manifest input count changed.`);

  const perKindExpectedCount = expected.artifactCount / expectedTsdocKinds.length;
  for (const kind of expectedTsdocKinds) {
    assertCondition(entry.metrics?.artifactKinds?.[kind] === perKindExpectedCount,
      `${entry.id} manifest artifact kind ${kind} count changed.`);
  }

  for (const artifact of result.artifacts ?? []) {
    const artifactPath = path.join(outputRoot, artifact.path);
    assertCondition(fs.existsSync(artifactPath), `${entry.id} artifact missing: ${artifact.path}`);

    if (artifact.kind === 'ordinary-source-map' || artifact.kind === 'doc-source-map') {
      assertCondition(!hasEmbeddedSourceContent(readJson(artifactPath)),
        `${entry.id} source map embeds source content: ${artifact.path}`);
    }
  }
}

function checkHiaJsdocEntry(entry, expected) {
  const outputRoot = assertInsideGenerated(entry.outputRoot, `${entry.id} outputRoot`);
  const integrationPath = assertInsideGenerated(entry.integrationPath, `${entry.id} integrationPath`);
  const integration = readJson(integrationPath);

  assertCondition(integration.contract === 'hia-jsdoc-integration', `${entry.id} integration contract changed.`);
  assertCondition(integration.pluginVersion === expected.pluginVersion,
    `${entry.id} plugin version must be ${expected.pluginVersion}.`);

  const nodeCount = integration.ir?.nodes?.length ?? 0;
  assertCondition(nodeCount === expected.nodeCount, `${entry.id} node count changed: ${nodeCount}.`);
  assertCondition(entry.metrics?.nodeCount === expected.nodeCount, `${entry.id} manifest node count changed.`);

  for (const requiredFile of entry.metrics?.requiredFiles ?? []) {
    assertCondition(fs.existsSync(path.join(outputRoot, requiredFile)),
      `${entry.id} generated file missing: ${requiredFile}`);
  }
}

assertCondition(fs.existsSync(manifestPath), 'Missing documentation manifest. Run npm run docs:manifest first.');

const manifest = readJson(manifestPath);
assertCondition(manifest.contract === 'unicodeartjs-documentation-manifest',
  'Documentation manifest contract changed.');
assertCondition(manifest.contractVersion === '0.1.0',
  'Documentation manifest contractVersion changed.');
assertCondition(manifest.policy?.generatedArtifactsCommitted === false,
  'Generated documentation artifacts must remain uncommitted.');
assertCondition(manifest.policy?.sourcesContentPolicy === 'none',
  'Documentation manifest must keep sourcesContentPolicy: none.');
checkNoInternalPathLeak(manifest);

const entries = manifest.entries ?? [];
const entryIds = new Set(entries.map((entry) => entry.id));
assertCondition(entries.length === Object.keys(expectedEntries).length,
  `Documentation manifest has ${entries.length} entries.`);

for (const entryId of Object.keys(expectedEntries)) {
  assertCondition(entryIds.has(entryId), `Documentation manifest is missing ${entryId}.`);
}

for (const entry of entries) {
  const expected = expectedEntries[entry.id];
  assertCondition(expected, `Documentation manifest contains unexpected entry: ${entry.id}`);
  assertCondition(entry.documentationKind === expected.documentationKind,
    `${entry.id} documentation kind changed.`);
  assertCondition(entry.checkCommand, `${entry.id} must declare a check command.`);
  assertCondition(entry.publicGuide && fs.existsSync(toAbsoluteProjectPath(entry.publicGuide.split('#')[0])),
    `${entry.id} public guide path is missing.`);

  if (entry.documentationKind === 'hia-tsdoc') {
    checkTsdocEntry(entry, expected);
  } else {
    checkHiaJsdocEntry(entry, expected);
  }
}

process.stdout.write('Documentation manifest passed aggregate output, path, count, and privacy checks.\n');
