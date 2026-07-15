#!/usr/bin/env node

/**
 * 校验 VS Code Extension TSDoc 生成链。
 *
 * 该脚本只检查中间文档数据质量，不把生成目录视为最终公开 API 站点。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const configPath = path.join(repositoryRoot, 'tsdoc.vscode-extension.json');
const outputDirectory = path.join(repositoryRoot, '.generated-docs', 'tsdoc', 'vscode-extension');
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

const expectedInputs = [
  {
    artifactBasePath: 'api/vscode/extension',
    sourcePath: 'packages/vscode-extension/src/extension.ts',
    requiredSymbols: ['activate', 'deactivate']
  },
  {
    artifactBasePath: 'api/vscode/commands',
    sourcePath: 'packages/vscode-extension/src/commands/index.ts',
    requiredSymbols: ['registerCommands']
  },
  {
    artifactBasePath: 'api/vscode/commands/convert-selection',
    sourcePath: 'packages/vscode-extension/src/commands/convertSelection.ts',
    requiredSymbols: [
      'convertSelection',
      'generateWithDefaultTemplate',
      'generateWithTemplateSlot',
      'convertSelectionWithOptions'
    ]
  },
  {
    artifactBasePath: 'api/vscode/commands/convert-image-file',
    sourcePath: 'packages/vscode-extension/src/commands/convertImageFile.ts',
    requiredSymbols: ['convertImageFile']
  },
  {
    artifactBasePath: 'api/vscode/config/types',
    sourcePath: 'packages/vscode-extension/src/config/types.ts',
    requiredSymbols: ['ExtensionLocale', 'ExtensionArtConfig']
  },
  {
    artifactBasePath: 'api/vscode/config/resolver',
    sourcePath: 'packages/vscode-extension/src/config/configResolver.ts',
    requiredSymbols: ['ResolveArtConfigOptions', 'resolveArtConfig']
  },
  {
    artifactBasePath: 'api/vscode/config/preset-store',
    sourcePath: 'packages/vscode-extension/src/config/presetStore.ts',
    requiredSymbols: [
      'TemplateSlotSummary',
      'loadRecentConfig',
      'loadDefaultTemplate',
      'loadTemplateSlot',
      'getTemplateSlotSummaries',
      'saveRecentConfig',
      'saveDefaultTemplate',
      'saveTemplateSlot'
    ]
  },
  {
    artifactBasePath: 'api/vscode/core-adapter',
    sourcePath: 'packages/vscode-extension/src/core/coreAdapter.ts',
    requiredSymbols: ['CoreAdapter', 'createCoreAdapter']
  },
  {
    artifactBasePath: 'api/vscode/output/result-writer',
    sourcePath: 'packages/vscode-extension/src/output/resultWriter.ts',
    requiredSymbols: ['InsertMode', 'writeResult']
  },
  {
    artifactBasePath: 'api/vscode/webview/protocol',
    sourcePath: 'packages/vscode-extension/src/webview/protocol.ts',
    requiredSymbols: [
      'TemplateSlotView',
      'InitialWebviewState',
      'ConvertTextPayload',
      'ConvertImagePayload',
      'SaveFormat',
      'PresetSaveTarget',
      'WebviewMessage',
      'ExtensionMessage',
      'isWebviewMessage'
    ]
  },
  {
    artifactBasePath: 'api/vscode/webview/messaging',
    sourcePath: 'packages/vscode-extension/src/webview/messaging.ts',
    requiredSymbols: ['handleWebviewMessage']
  },
  {
    artifactBasePath: 'api/vscode/webview/panel',
    sourcePath: 'packages/vscode-extension/src/webview/panel.ts',
    requiredSymbols: ['createConverterPanel']
  },
  {
    artifactBasePath: 'api/vscode/webview/html',
    sourcePath: 'packages/vscode-extension/src/webview/html.ts',
    requiredSymbols: ['getConverterHtml']
  },
  {
    artifactBasePath: 'api/vscode/i18n',
    sourcePath: 'packages/vscode-extension/src/i18n.ts',
    requiredSymbols: ['getLocale', 't', 'getWebviewMessages']
  },
  {
    artifactBasePath: 'api/vscode/ui/status-bar',
    sourcePath: 'packages/vscode-extension/src/ui/statusBar.ts',
    requiredSymbols: ['createStatusBarEntry']
  },
  {
    artifactBasePath: 'api/vscode/utils/logger',
    sourcePath: 'packages/vscode-extension/src/utils/logger.ts',
    requiredSymbols: ['ExtensionLogger', 'createLogger']
  }
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
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

assertCondition(fs.existsSync(configPath), 'Missing tsdoc.vscode-extension.json.');
assertCondition(fs.existsSync(resultPath), 'Missing VS Code TSDoc producer result.');

const config = readJson(configPath);
assertCondition(config.options?.sourcesContentPolicy === 'none', 'VS Code TSDoc must use sourcesContentPolicy: none.');
assertCondition(config.inputs?.length === expectedInputs.length,
  `VS Code TSDoc config has ${config.inputs?.length ?? 0} inputs; expected ${expectedInputs.length}.`);

for (const expectedInput of expectedInputs) {
  const configuredInput = config.inputs.find((input) => input.artifactBasePath === expectedInput.artifactBasePath);
  assertCondition(configuredInput, `VS Code TSDoc config is missing input: ${expectedInput.artifactBasePath}.`);
  assertCondition(configuredInput.path === expectedInput.sourcePath,
    `VS Code TSDoc config maps ${expectedInput.artifactBasePath} to ${configuredInput.path}, expected ${expectedInput.sourcePath}.`);
}

const result = readJson(resultPath);
assertCondition(result.contract === 'documentation-producer-result' && result.status === 'success',
  'VS Code TSDoc producer did not report success.');
assertCondition(result.producer?.id === 'tsdoc' && result.producer?.version === expectedRunnerVersion,
  `VS Code TSDoc producer version must be ${expectedRunnerVersion}.`);
assertCondition(result.artifacts?.length === expectedArtifactKinds.length * expectedInputs.length,
  `VS Code TSDoc emitted ${result.artifacts?.length ?? 0} artifacts; expected ${expectedArtifactKinds.length * expectedInputs.length}.`);

for (const kind of expectedArtifactKinds) {
  const count = result.artifacts.filter((artifact) => artifact.kind === kind).length;
  assertCondition(count === expectedInputs.length,
    `VS Code TSDoc emitted ${count} ${kind} artifacts; expected ${expectedInputs.length}.`);
}

for (const artifact of result.artifacts) {
  const artifactPath = path.join(outputDirectory, artifact.path);
  assertCondition(fs.existsSync(artifactPath), `VS Code TSDoc artifact is missing from disk: ${artifact.path}`);

  if (artifact.kind === 'ordinary-source-map' || artifact.kind === 'doc-source-map') {
    assertCondition(!hasEmbeddedSourceContent(readJson(artifactPath)),
      `VS Code TSDoc source map embeds source content: ${artifact.path}`);
  }
}

for (const expectedInput of expectedInputs) {
  const extractionArtifactPath = `${expectedInput.artifactBasePath}.tsdoc.json`;
  const artifact = result.artifacts.find((candidate) => candidate.kind === 'tsdoc-extraction'
    && candidate.path === extractionArtifactPath);
  assertCondition(artifact, `VS Code TSDoc extraction is missing: ${extractionArtifactPath}.`);

  const extraction = readJson(path.join(outputDirectory, artifact.path));
  assertCondition(extraction.source?.path === expectedInput.sourcePath,
    `VS Code TSDoc extraction ${artifact.path} targets ${extraction.source?.path}, expected ${expectedInput.sourcePath}.`);

  const diagnostics = extraction.diagnostics ?? [];
  assertCondition(!diagnostics.some((diagnostic) => diagnostic.severity === 'error' || diagnostic.severity === 'warning'),
    `VS Code TSDoc extraction contains diagnostics: ${artifact.path}`);

  const exportedSymbols = extraction.symbols?.filter((symbol) => symbol.exported) ?? [];
  assertCondition(exportedSymbols.length > 0,
    `VS Code TSDoc extraction did not detect exported symbols in ${artifact.path}.`);

  const undocumentedSymbols = exportedSymbols.filter((symbol) => !symbol.comment);
  assertCondition(undocumentedSymbols.length === 0,
    `VS Code TSDoc extraction has undocumented exported symbols in ${artifact.path}: ${undocumentedSymbols.map((symbol) => symbol.name).join(', ')}`);

  const symbolNames = new Set(exportedSymbols.map((symbol) => symbol.name));
  for (const requiredSymbol of expectedInput.requiredSymbols) {
    assertCondition(symbolNames.has(requiredSymbol),
      `VS Code TSDoc extraction is missing required symbol ${requiredSymbol} in ${artifact.path}.`);
  }
}

process.stdout.write('VS Code Extension TSDoc output passed artifact, diagnostic, coverage, and source-map privacy checks.\n');
