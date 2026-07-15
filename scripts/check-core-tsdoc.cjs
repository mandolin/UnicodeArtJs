#!/usr/bin/env node

/**
 * 校验 Core TSDoc 生成链的公开契约。
 *
 * 该脚本有意只检查中间文档数据的完整性、覆盖率、诊断和源码隐私策略。
 * 它不把 JSON 产物当成已经部署的公共文档站；最终站点聚合仍由后续文档阶段负责。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const configPath = path.join(repositoryRoot, 'tsdoc.core.json');
const outputDirectory = path.join(repositoryRoot, '.generated-docs', 'tsdoc', 'core');
const resultPath = path.join(outputDirectory, 'tsdoc.producer-result.json');
const expectedRunnerVersion = '0.1.2';
const expectedArtifactKinds = [
  'generated-js',
  'ordinary-source-map',
  'tsdoc-extraction',
  'jsdoc-bridge',
  'hia-document',
  'doc-source-map'
];

/**
 * 每项同时锁定公开入口、TSDoc artifact 路径与核心符号。
 * `pure.ts` 是纯再导出入口，若干 adapter 文件当前以导出常量对象或常量别名为主。
 * 这些形态在 HIA 0.1.2 fixture scanner 中可能不会形成独立符号，故显式允许空符号。
 */
const expectedInputs = [
  {
    artifactBasePath: 'api/index',
    sourcePath: 'packages/core/src/index.ts',
    requiredSymbols: [
      'textToArt',
      'semanticDocumentToArt',
      'imageToArt',
      'validateConfig',
      'isWideChar',
      'getPresetChars',
      'calcDisplayWidth'
    ]
  },
  {
    artifactBasePath: 'api/pure',
    sourcePath: 'packages/core/src/pure.ts',
    requiredSymbols: [],
    allowNoExportedSymbols: true
  },
  {
    artifactBasePath: 'api/browser',
    sourcePath: 'packages/core/src/browser.ts',
    requiredSymbols: [
      'BrowserProgressStage',
      'BrowserProgressEvent',
      'BrowserAbortSignalLike',
      'BrowserArtOptions',
      'imageToArt',
      'textToArt',
      'semanticDocumentToArt'
    ]
  },
  {
    artifactBasePath: 'api/pure/image-data-to-art',
    sourcePath: 'packages/core/src/pure/imageDataToArt.ts',
    requiredSymbols: ['ImageDataToArtOptions', 'imageDataToArt']
  },
  {
    artifactBasePath: 'api/types/config',
    sourcePath: 'packages/core/src/types/config.ts',
    requiredSymbols: [
      'OutputTarget',
      'VisualFontConfig',
      'GlyphFontConfig',
      'ArtConfig',
      'normalizeArtConfigAliases'
    ]
  },
  {
    artifactBasePath: 'api/types/output',
    sourcePath: 'packages/core/src/types/output.ts',
    requiredSymbols: ['ArtResult', 'ArtMetadata', 'UnicodeArtError', 'UnicodeArtErrorOptions']
  },
  {
    artifactBasePath: 'api/capabilities',
    sourcePath: 'packages/core/src/capabilities.ts',
    requiredSymbols: [
      'CoreCapabilityStability',
      'CoreCapabilityDescriptor',
      'NodeImageBackendCapabilities',
      'NodeTextRendererCapabilities',
      'BrowserEntryCapabilities',
      'BoxCapabilities',
      'CoreCapabilities',
      'getCoreCapabilities'
    ]
  },
  {
    artifactBasePath: 'api/glyph/width',
    sourcePath: 'packages/core/src/glyph/width.ts',
    requiredSymbols: [
      'BuiltInGlyphWidthProfile',
      'GlyphWidthProfile',
      'GlyphWidthCalculatorOptions',
      'GlyphWidthProfileDefinition',
      'GlyphWidthCalculator',
      'createGlyphWidthCalculator',
      'getGlyphWidthProfiles',
      'isKnownGlyphWidthProfile',
      'normalizeGlyphWidthProfile',
      'normalizeWideCharRegex'
    ]
  },
  {
    artifactBasePath: 'api/box',
    sourcePath: 'packages/core/src/box/box.ts',
    requiredSymbols: ['boxText', 'previewBoxStyle', 'normalizeBoxOptions']
  },
  {
    artifactBasePath: 'api/platform/browser',
    sourcePath: 'packages/core/src/platform/browser/browserPlatformAdapter.ts',
    requiredSymbols: [
      'BrowserAdapterCacheStats',
      'BrowserAdapterCacheClearOptions',
      'BrowserRuntimeCapabilities',
      'clearBrowserAdapterCache',
      'getBrowserAdapterCacheStats',
      'getBrowserRuntimeCapabilities',
      'BrowserBinaryFontSource',
      'BrowserFontSource',
      'BrowserFontLoadOptions',
      'loadBrowserFont',
      'BrowserPlatformImageData'
    ]
  },
  { artifactBasePath: 'api/types/image', sourcePath: 'packages/core/src/types/image.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/types/charset', sourcePath: 'packages/core/src/types/charset.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/types/semantic', sourcePath: 'packages/core/src/types/semantic.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/types/art-font', sourcePath: 'packages/core/src/types/artFont.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/types/extension', sourcePath: 'packages/core/src/types/extension.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/constants', sourcePath: 'packages/core/src/constants.ts', requiredSymbols: [] },
  {
    artifactBasePath: 'api/version',
    sourcePath: 'packages/core/src/version.ts',
    requiredSymbols: [],
    allowNoExportedSymbols: true
  },
  { artifactBasePath: 'api/i18n', sourcePath: 'packages/core/src/i18n/index.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/i18n/types', sourcePath: 'packages/core/src/i18n/types.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/preprocessor', sourcePath: 'packages/core/src/preprocessor.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/sampler', sourcePath: 'packages/core/src/sampler.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/char-renderer', sourcePath: 'packages/core/src/charRenderer.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/matcher', sourcePath: 'packages/core/src/matcher.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/assembler', sourcePath: 'packages/core/src/assembler.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/utils/wide-char-detector', sourcePath: 'packages/core/src/utils/wideCharDetector.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/platform/types', sourcePath: 'packages/core/src/platform/types.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/platform/node', sourcePath: 'packages/core/src/platform/node/nodePlatformAdapter.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/platform/node/image-backend', sourcePath: 'packages/core/src/platform/node/imageBackend.ts', requiredSymbols: [] },
  {
    artifactBasePath: 'api/platform/node/sharp-image-backend',
    sourcePath: 'packages/core/src/platform/node/sharpImageBackend.ts',
    requiredSymbols: [],
    allowNoExportedSymbols: true
  },
  {
    artifactBasePath: 'api/platform/node/napi-rs-image-backend',
    sourcePath: 'packages/core/src/platform/node/napiRsImageBackend.ts',
    requiredSymbols: [],
    allowNoExportedSymbols: true
  },
  { artifactBasePath: 'api/box/types', sourcePath: 'packages/core/src/box/types.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/box/styles', sourcePath: 'packages/core/src/box/styles.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/box/spacing', sourcePath: 'packages/core/src/box/spacing.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/box/width', sourcePath: 'packages/core/src/box/width.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/semantic/document', sourcePath: 'packages/core/src/semantic/document.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/semantic/render', sourcePath: 'packages/core/src/semantic/render.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/art-font/document', sourcePath: 'packages/core/src/artFont/document.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/art-font/metrics', sourcePath: 'packages/core/src/artFont/metrics.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/art-font/render', sourcePath: 'packages/core/src/artFont/render.ts', requiredSymbols: [] },
  { artifactBasePath: 'api/extensions/document', sourcePath: 'packages/core/src/extensions/document.ts', requiredSymbols: [] }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

/** 检查任意 source map 结构中是否嵌入真实 TypeScript 源文。 */
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

assertCondition(fs.existsSync(configPath), 'Missing tsdoc.core.json.');
assertCondition(fs.existsSync(resultPath), 'Missing Core TSDoc producer result. Run npm run docs:tsdoc:core first.');

const config = readJson(configPath);
assertCondition(config.options?.sourcesContentPolicy === 'none', 'Core TSDoc must use sourcesContentPolicy: none.');
assertCondition(config.inputs?.length === expectedInputs.length,
  `Core TSDoc config has ${config.inputs?.length ?? 0} inputs; expected ${expectedInputs.length}.`);

for (const expectedInput of expectedInputs) {
  const configuredInput = config.inputs.find((input) => input.artifactBasePath === expectedInput.artifactBasePath);
  assertCondition(configuredInput, `Core TSDoc config is missing input: ${expectedInput.artifactBasePath}.`);
  assertCondition(configuredInput.path === expectedInput.sourcePath,
    `Core TSDoc config maps ${expectedInput.artifactBasePath} to ${configuredInput.path}, expected ${expectedInput.sourcePath}.`);
}

const result = readJson(resultPath);
assertCondition(result.contract === 'documentation-producer-result' && result.status === 'success',
  'Core TSDoc producer did not report a successful documentation-producer-result.');
assertCondition(result.producer?.id === 'tsdoc' && result.producer?.version === expectedRunnerVersion,
  `Core TSDoc producer version must be ${expectedRunnerVersion}.`);
assertCondition(result.artifacts?.length === expectedArtifactKinds.length * expectedInputs.length,
  `Core TSDoc emitted ${result.artifacts?.length ?? 0} artifacts; expected ${expectedArtifactKinds.length * expectedInputs.length}.`);

for (const kind of expectedArtifactKinds) {
  const count = result.artifacts.filter((artifact) => artifact.kind === kind).length;
  assertCondition(count === expectedInputs.length,
    `Core TSDoc emitted ${count} ${kind} artifacts; expected ${expectedInputs.length}.`);
}

for (const artifact of result.artifacts) {
  const artifactPath = path.join(outputDirectory, artifact.path);
  assertCondition(fs.existsSync(artifactPath), `Core TSDoc artifact is missing from disk: ${artifact.path}`);

  if (artifact.kind === 'ordinary-source-map' || artifact.kind === 'doc-source-map') {
    assertCondition(!hasEmbeddedSourceContent(readJson(artifactPath)),
      `Core TSDoc source map embeds source content: ${artifact.path}`);
  }
}

for (const expectedInput of expectedInputs) {
  const extractionArtifactPath = `${expectedInput.artifactBasePath}.tsdoc.json`;
  const artifact = result.artifacts.find((candidate) => candidate.kind === 'tsdoc-extraction'
    && candidate.path === extractionArtifactPath);
  assertCondition(artifact, `Core TSDoc extraction is missing: ${extractionArtifactPath}.`);

  const extraction = readJson(path.join(outputDirectory, artifact.path));
  assertCondition(extraction.source?.path === expectedInput.sourcePath,
    `Core TSDoc extraction ${artifact.path} targets ${extraction.source?.path}, expected ${expectedInput.sourcePath}.`);

  const diagnostics = extraction.diagnostics ?? [];
  assertCondition(!diagnostics.some((diagnostic) => diagnostic.severity === 'error' || diagnostic.severity === 'warning'),
    `Core TSDoc extraction contains diagnostics: ${artifact.path}`);

  const exportedSymbols = extraction.symbols?.filter((symbol) => symbol.exported) ?? [];
  if (!expectedInput.allowNoExportedSymbols) {
    assertCondition(exportedSymbols.length > 0,
      `Core TSDoc extraction did not detect exported symbols in ${artifact.path}.`);
  }
  const undocumentedSymbols = exportedSymbols.filter((symbol) => !symbol.comment);
  assertCondition(undocumentedSymbols.length === 0,
    `Core TSDoc extraction has undocumented exported symbols in ${artifact.path}: ${undocumentedSymbols.map((symbol) => symbol.name).join(', ')}`);

  const symbolNames = new Set(exportedSymbols.map((symbol) => symbol.name));
  for (const requiredSymbol of expectedInput.requiredSymbols) {
    assertCondition(symbolNames.has(requiredSymbol),
      `Core TSDoc extraction is missing required symbol ${requiredSymbol} in ${artifact.path}.`);
  }
}

process.stdout.write('Core TSDoc output passed artifact, diagnostic, coverage, and source-map privacy checks.\n');
