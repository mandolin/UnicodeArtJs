#!/usr/bin/env node

/**
 * 校验 UnicodeArtJs 对 HIA TSDoc target gate 的采纳状态。
 *
 * 该脚本不重新生成文档产物，只检查现有 TSDoc producer result 是否
 * 已按项目级 HIA 配置登记、保持成功状态，并且没有嵌入源码正文或
 * 内部工作区路径。CI 中应先运行 Core / VS Code TSDoc 检查，再运行本脚本。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const packagePath = path.join(repositoryRoot, 'package.json');
const ciWorkflowPath = path.join(repositoryRoot, '.github', 'workflows', 'ci.yml');
const hiaConfigPath = path.join(repositoryRoot, 'docs', 'hia', 'hia-project-docs.json');
const developmentDocPath = path.join(repositoryRoot, 'docs', 'development.md');
const pipelineDocPath = path.join(repositoryRoot, 'docs', 'documentation-pipeline.md');

const forbiddenFragments = [
  'work-zone',
  'ai/codex',
  'ai\\codex',
  'HIA-Documentation-Sys\\work-zone',
  'HIA-Documentation-Sys/work-zone',
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

function assertRelativePath(relativePath, label) {
  assertCondition(typeof relativePath === 'string' && relativePath.length > 0, `${label} must be a non-empty string.`);
  assertCondition(!path.isAbsolute(relativePath), `${label} must be repository-relative: ${relativePath}`);
  assertCondition(!relativePath.includes('..'), `${label} must not escape repository root: ${relativePath}`);
}

function assertNoForbiddenFragments(text, label) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!text.includes(fragment), `${label} leaks private fragment: ${fragment}`);
  }
}

/**
 * HIA source map 允许出现空数组形式的 sourcesContent。
 * 真正要拦截的是非空源码正文，因为它会把 TypeScript 源文写入中间产物。
 */
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

function listFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(entryPath) : [entryPath];
  });
}

function assertOutputPrivacy(outputDirectory) {
  for (const filePath of listFiles(outputDirectory)) {
    const extension = path.extname(filePath);
    if (!['.json', '.map'].includes(extension)) {
      continue;
    }

    const text = readText(filePath);
    const relativePath = path.relative(repositoryRoot, filePath);
    assertNoForbiddenFragments(text, relativePath);
    assertCondition(!hasEmbeddedSourceContent(JSON.parse(text)), `${relativePath} embeds source content.`);
  }
}

assertCondition(fs.existsSync(hiaConfigPath), 'Missing docs/hia/hia-project-docs.json.');
assertCondition(fs.existsSync(packagePath), 'Missing package.json.');
assertCondition(fs.existsSync(ciWorkflowPath), 'Missing .github/workflows/ci.yml.');

const packageJson = readJson(packagePath);
const hiaConfigText = readText(hiaConfigPath);
const hiaConfig = JSON.parse(hiaConfigText);
const ciWorkflow = readText(ciWorkflowPath);
const developmentDoc = readText(developmentDocPath);
const pipelineDoc = readText(pipelineDocPath);

assertNoForbiddenFragments(hiaConfigText, 'docs/hia/hia-project-docs.json');
assertCondition(hiaConfig.schemaVersion === '0.1.0-draft', 'HIA project docs schema version changed.');
assertCondition(hiaConfig.projectId === 'unicodeartjs', 'HIA project id must be unicodeartjs.');
assertCondition(hiaConfig.projectKind === 'typescript-workspace', 'HIA project kind must be typescript-workspace.');
assertCondition(hiaConfig.packageBaseline?.['@hia-doc/tsdoc-runner'] === '0.1.2',
  'HIA package baseline must pin @hia-doc/tsdoc-runner@0.1.2.');
assertCondition(packageJson.devDependencies?.['@hia-doc/tsdoc-runner'] === hiaConfig.packageBaseline['@hia-doc/tsdoc-runner'],
  'package.json devDependency must match HIA package baseline.');

assertCondition(packageJson.scripts?.['docs:hia:target:check'] === 'node scripts/check-hia-tsdoc-adoption.cjs',
  'package.json must expose docs:hia:target:check.');
assertCondition((packageJson.scripts?.['docs:hia:target:all'] || '').includes('docs:all:check'),
  'docs:hia:target:all must run docs:all:check first.');
assertCondition((packageJson.scripts?.['docs:hia:target:all'] || '').includes('docs:hia:target:check'),
  'docs:hia:target:all must run docs:hia:target:check.');
assertCondition((packageJson.scripts?.['release:gate'] || '').includes('docs:hia:target:check'),
  'release:gate must include docs:hia:target:check.');
assertCondition(ciWorkflow.includes('npm run docs:hia:target:check'),
  'CI must run docs:hia:target:check.');
assertCondition(developmentDoc.includes('npm run docs:hia:target:check'),
  'docs/development.md must mention docs:hia:target:check.');
assertCondition(pipelineDoc.includes('docs/hia/hia-project-docs.json'),
  'docs/documentation-pipeline.md must mention docs/hia/hia-project-docs.json.');

const producerOutputs = hiaConfig.producerOutputs || [];
assertCondition(producerOutputs.length === 2, 'HIA project docs must describe exactly two TSDoc producer outputs.');

const expectedOutputs = new Map([
  ['unicodeartjs-core-tsdoc', {
    command: 'npm run docs:tsdoc:core:check',
    config: 'tsdoc.core.json',
    outputDirectory: '.generated-docs/tsdoc/core',
    resultManifest: '.generated-docs/tsdoc/core/tsdoc.producer-result.json'
  }],
  ['unicodeartjs-vscode-tsdoc', {
    command: 'npm run docs:tsdoc:vscode:check',
    config: 'tsdoc.vscode-extension.json',
    outputDirectory: '.generated-docs/tsdoc/vscode-extension',
    resultManifest: '.generated-docs/tsdoc/vscode-extension/tsdoc.producer-result.json'
  }]
]);

for (const output of producerOutputs) {
  const expected = expectedOutputs.get(output.id);
  assertCondition(expected, `Unexpected HIA producer output id: ${output.id}`);
  assertCondition(output.producer === 'tsdoc', `${output.id} must use tsdoc producer.`);

  for (const key of ['command', 'config', 'outputDirectory', 'resultManifest']) {
    assertCondition(output[key] === expected[key], `${output.id} ${key} changed.`);
  }

  assertRelativePath(output.config, `${output.id}.config`);
  assertRelativePath(output.outputDirectory, `${output.id}.outputDirectory`);
  assertRelativePath(output.resultManifest, `${output.id}.resultManifest`);
  assertCondition(fs.existsSync(path.join(repositoryRoot, output.config)), `${output.id} config is missing.`);

  const outputDirectory = path.join(repositoryRoot, output.outputDirectory);
  const resultManifest = path.join(repositoryRoot, output.resultManifest);
  assertCondition(fs.existsSync(resultManifest),
    `Missing ${output.id} result manifest. Run npm run docs:hia:target:all first.`);

  const manifest = readJson(resultManifest);
  assertCondition(manifest.contract === 'documentation-producer-result', `${output.id} manifest contract changed.`);
  assertCondition(manifest.status === 'success', `${output.id} producer result must be success.`);
  assertCondition(manifest.producer?.id === 'tsdoc', `${output.id} producer id must be tsdoc.`);
  assertCondition((manifest.artifacts || []).length > 0, `${output.id} manifest has no artifacts.`);
  assertOutputPrivacy(outputDirectory);
}

process.stdout.write('UnicodeArtJs HIA TSDoc adoption check passed.\n');
