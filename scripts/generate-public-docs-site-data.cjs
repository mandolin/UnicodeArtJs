#!/usr/bin/env node

/**
 * 生成 GitHub Pages 文档入口使用的公开数据快照。
 *
 * `.generated-docs/documentation-manifest.json` 是本地聚合清单，包含生成产物路径；
 * Web 站点只需要公开可展示的包、文档类型和入口链接，因此这里会做一次白名单投影，
 * 避免把内部目录、生成目录或 WorkZone 信息发布到 Pages。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const sourceManifestPath = path.join(repositoryRoot, '.generated-docs', 'documentation-manifest.json');
const docsArchitecturePath = path.join(repositoryRoot, 'fixtures', 'docs-site', 'developer-docs-architecture.json');
const publicManifestPath = path.join(repositoryRoot, 'packages', 'web', 'public', 'docs', 'manifest.json');
const repositoryUrl = 'https://github.com/mandolin/UnicodeArtJs';
const pagesUrl = 'https://mandolin.github.io/UnicodeArtJs/';
const apiReferenceContract = 'unicodeartjs-public-api-reference';
const summaryMaxLength = 260;
const forbiddenFragments = [
  '.generated-docs',
  'work-zone',
  'ai/codex',
  'ai\\codex',
  'K:\\',
  'C:\\',
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toRepositoryGuideUrl(publicGuide) {
  const [guidePath, hash = ''] = String(publicGuide || '').split('#');
  const normalizedPath = guidePath.replace(/\\/g, '/').replace(/^\/+/, '');
  const suffix = hash ? `#${hash}` : '';
  return `${repositoryUrl}/blob/main/${normalizedPath}${suffix}`;
}

function toRepositoryTreeUrl(publicPath) {
  const normalizedPath = String(publicPath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  return `${repositoryUrl}/blob/main/${normalizedPath}`;
}

function toRepositorySourceUrl(sourcePath, line) {
  const normalizedPath = String(sourcePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const lineNumber = Number(line);
  const suffix = Number.isInteger(lineNumber) && lineNumber > 0 ? `#L${lineNumber}` : '';
  return `${repositoryUrl}/blob/main/${normalizedPath}${suffix}`;
}

function cleanText(value, maxLength = summaryMaxLength) {
  const cleaned = String(value || '')
    .replace(/<lang\b[^>]*>|<\/lang>|<zh-CN>|<\/zh-CN>|<en>|<\/en>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function toLine(value) {
  const line = Number(value);
  return Number.isInteger(line) && line > 0 ? line : undefined;
}

function toTypeText(type) {
  if (!type) return '';
  if (Array.isArray(type)) return type.join('|');
  if (Array.isArray(type.names)) return type.names.join('|');
  return String(type);
}

function buildJsdocSignature(node) {
  const name = String(node.name || node.title || node.longname || '');
  if (node.kind !== 'function') return name;

  const params = Array.isArray(node.jsdoc?.params) ? node.jsdoc.params : [];
  const signatureParams = params.map((param) => {
    const paramName = String(param.name || 'param');
    const typeText = toTypeText(param.type);
    return typeText ? `${paramName}: ${typeText}` : paramName;
  });
  return `${name}(${signatureParams.join(', ')})`;
}

function getJsdocLocalizedSummary(node) {
  const localized = node.i18n?.localized || node.i18n?.generation?.perLocale || {};
  const zh = cleanText(localized['zh-CN']?.text || localized.zh?.text || '');
  const en = cleanText(localized.en?.text || localized['en-US']?.text || '');
  const fallback = cleanText(node.summary || node.description || '');

  if (zh || en) {
    return removeUndefined({
      'zh-CN': zh || fallback,
      'en-US': en || fallback || zh,
    });
  }

  return fallback;
}

function toPublicSymbol(entry, symbol, fallbackKind = 'symbol') {
  const sourcePath = symbol.sourcePath;
  const sourceLine = toLine(symbol.sourceLine);
  return removeUndefined({
    id: `${entry.id}:${symbol.id}`,
    name: cleanText(symbol.name, 120),
    kind: cleanText(symbol.kind || fallbackKind, 40),
    signature: cleanText(symbol.signature || symbol.name, 180),
    summary: symbol.summary,
    source: {
      path: sourcePath,
      line: sourceLine,
      url: sourcePath ? toRepositorySourceUrl(sourcePath, sourceLine) : undefined,
    },
  });
}

function toPublicEntry(entry) {
  return {
    id: entry.id,
    title: entry.title,
    packageName: entry.packageName,
    packageVersion: entry.packageVersion,
    surface: entry.surface,
    documentationKind: entry.documentationKind,
    stability: entry.stability,
    guideUrl: toRepositoryGuideUrl(entry.publicGuide),
    checkCommand: entry.checkCommand,
    metrics: {
      artifactCount: entry.metrics?.artifactCount ?? undefined,
      inputCount: entry.metrics?.inputCount ?? undefined,
      nodeCount: entry.metrics?.nodeCount ?? undefined,
      requiredFiles: entry.metrics?.requiredFiles ?? undefined,
    },
  };
}

function collectTsdocSymbols(entry) {
  const outputRoot = path.join(repositoryRoot, entry.outputRoot);
  const resultPath = path.join(repositoryRoot, entry.primaryOutput);
  const result = readJson(resultPath);
  const symbols = [];

  for (const artifact of result.artifacts || []) {
    if (artifact.kind !== 'hia-document') continue;

    const documentPath = path.join(outputRoot, artifact.path);
    const document = readJson(documentPath);
    for (const symbol of document.symbols || []) {
      const definedIn = symbol.source?.definedIn || {};
      const sourcePath = definedIn.relativePath || symbol.source?.path;
      if (!symbol.name || !sourcePath) continue;

      symbols.push(toPublicSymbol(entry, {
        id: `${artifact.path}:${symbol.id}`,
        name: symbol.name,
        kind: symbol.kind || symbol.metadata?.tsdoc?.tsKind || 'symbol',
        signature: symbol.signature || symbol.name,
        summary: cleanText(symbol.summary || ''),
        sourcePath,
        sourceLine: definedIn.position?.line || definedIn.range?.start?.line,
      }));
    }
  }

  return symbols.sort(comparePublicSymbols);
}

function collectHiaJsdocSymbols(entry) {
  const integration = readJson(path.join(repositoryRoot, entry.integrationPath));
  const nodes = Array.isArray(integration.ir?.nodes) ? integration.ir.nodes : [];
  const symbols = [];

  for (const node of nodes) {
    const definedIn = node.source?.definedIn || {};
    const sourcePath = definedIn.relativePath;
    if (!node.name || !sourcePath) continue;

    symbols.push(toPublicSymbol(entry, {
      id: node.id || node.longname || node.name,
      name: node.name,
      kind: node.kind || 'symbol',
      signature: buildJsdocSignature(node),
      summary: getJsdocLocalizedSummary(node),
      sourcePath,
      sourceLine: definedIn.position?.line || definedIn.range?.start?.line,
    }));
  }

  return symbols.sort(comparePublicSymbols);
}

function comparePublicSymbols(left, right) {
  const leftPath = left.source?.path || '';
  const rightPath = right.source?.path || '';
  if (leftPath !== rightPath) return leftPath.localeCompare(rightPath);
  const leftLine = left.source?.line || 0;
  const rightLine = right.source?.line || 0;
  if (leftLine !== rightLine) return leftLine - rightLine;
  return String(left.name || '').localeCompare(String(right.name || ''));
}

function collectPublicSymbols(entry) {
  if (entry.documentationKind === 'hia-tsdoc') return collectTsdocSymbols(entry);
  if (entry.documentationKind === 'hia-jsdoc') return collectHiaJsdocSymbols(entry);
  return [];
}

function toPublicApiReference(source) {
  const apiEntries = (source.entries || []).map((entry) => {
    const symbols = collectPublicSymbols(entry);
    const sourceFileCount = new Set(symbols.map((symbol) => symbol.source?.path).filter(Boolean)).size;
    return {
      entryId: entry.id,
      title: entry.title,
      packageName: entry.packageName,
      packageVersion: entry.packageVersion,
      surface: entry.surface,
      documentationKind: entry.documentationKind,
      stability: entry.stability,
      symbolCount: symbols.length,
      sourceFileCount,
      symbols,
    };
  });

  const allSymbols = apiEntries.flatMap((entry) => entry.symbols);
  return {
    contract: apiReferenceContract,
    version: 1,
    symbolCount: allSymbols.length,
    sourceFileCount: new Set(allSymbols.map((symbol) => symbol.source?.path).filter(Boolean)).size,
    entries: apiEntries,
    generatedFrom: {
      sourceContract: source.contract,
      sourceContractVersion: source.contractVersion,
    },
  };
}

function toPublicArchitecture(source) {
  if (!fs.existsSync(docsArchitecturePath)) {
    throw new Error('Missing developer docs architecture fixture. Run npm run docs:architecture:check.');
  }

  const architecture = readJson(docsArchitecturePath);
  return {
    contract: architecture.contract,
    version: architecture.version,
    checkCommand: architecture.checkCommand,
    guideUrl: toRepositoryTreeUrl(architecture.architectureDoc),
    audiences: architecture.audiences,
    sections: (architecture.sections || []).map((section) => ({
      id: section.id,
      title: section.title,
      docCount: section.requiredDocs?.length ?? 0,
      docs: (section.requiredDocs || []).map((docPath) => ({
        path: docPath,
        url: toRepositoryTreeUrl(docPath),
      })),
    })),
    generatedFrom: {
      sourceContract: source.contract,
      sourceContractVersion: source.contractVersion,
    },
  };
}

function removeUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(removeUndefined);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, removeUndefined(item)]),
  );
}

function buildPublicManifest() {
  if (!fs.existsSync(sourceManifestPath)) {
    throw new Error('Missing documentation manifest. Run npm run docs:manifest first.');
  }

  const source = readJson(sourceManifestPath);
  const entries = Array.isArray(source.entries) ? source.entries : [];
  return removeUndefined({
    contract: 'unicodeartjs-public-docs-site-manifest',
    contractVersion: '0.1.0',
    generatedAt: source.generatedAt,
    homepage: pagesUrl,
    repository: repositoryUrl,
    docsHomeUrl: `${repositoryUrl}/tree/main/docs`,
    sourceManifest: {
      contract: source.contract,
      contractVersion: source.contractVersion,
    },
    policy: {
      generatedArtifactsCommitted: false,
      sourcesContentPolicy: source.policy?.sourcesContentPolicy ?? 'none',
      publicDataOnly: true,
    },
    architecture: toPublicArchitecture(source),
    apiReference: toPublicApiReference(source),
    entries: entries.map(toPublicEntry),
  });
}

function stringifyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function normalizeForCheck(serialized) {
  const value = JSON.parse(serialized);
  value.generatedAt = '<ignored>';
  return stringifyJson(value);
}

function assertNoPrivateLeak(serialized) {
  for (const fragment of forbiddenFragments) {
    if (serialized.includes(fragment)) {
      throw new Error(`Public docs manifest leaks private fragment: ${fragment}`);
    }
  }
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const publicManifest = buildPublicManifest();
  const serialized = stringifyJson(publicManifest);
  assertNoPrivateLeak(serialized);

  if (checkOnly) {
    const current = fs.existsSync(publicManifestPath) ? fs.readFileSync(publicManifestPath, 'utf8') : '';
    if (!current) {
      throw new Error('Missing public docs site manifest. Run npm run docs:public-site.');
    }
    if (normalizeForCheck(current) !== normalizeForCheck(serialized)) {
      throw new Error('Public docs site manifest is stale. Run npm run docs:public-site.');
    }
    process.stdout.write('Public docs site manifest is up to date and privacy-safe.\n');
    return;
  }

  fs.mkdirSync(path.dirname(publicManifestPath), { recursive: true });
  fs.writeFileSync(publicManifestPath, serialized);
  process.stdout.write(`Wrote ${path.relative(repositoryRoot, publicManifestPath)}.\n`);
}

main();
