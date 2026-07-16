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
