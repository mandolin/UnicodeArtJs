#!/usr/bin/env node

/**
 * 校验实验性静态资源发现清单。
 *
 * 该脚本只验证随站发布的同源 gallery 资源：schema、路径边界、size、sha256、
 * 许可证元数据和资源 JSON 形状。它不会联网、下载、安装或执行资源内容。
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const galleryRoot = path.join(repositoryRoot, 'packages', 'web', 'public', 'gallery');
const defaultManifestPath = path.join(galleryRoot, 'resource-manifest.json');
const allowedKinds = new Set(['unicode-art-font', 'semantic-document']);
const allowedLicenseOrigins = new Set(['original', 'imported', 'derived', 'mixed']);

function fail(message) {
  throw new Error(message);
}

function normalizeSlash(value) {
  return value.replace(/\\/g, '/');
}

function readUtf8(fullPath) {
  return fs.readFileSync(fullPath, 'utf8');
}

function readJson(fullPath, label) {
  try {
    return JSON.parse(readUtf8(fullPath));
  } catch (error) {
    fail(`${label} 不是合法 JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${label} 必须使用 YYYY-MM-DD。`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(`${label} 不是有效日期。`);
  }
}

function assertInside(parent, child, label) {
  const relative = path.relative(parent, child);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`${label} 越出了允许目录。`);
  }
}

function assertRelativeResourcePath(source, resourceRoot, label) {
  if (typeof source !== 'string' || source.length === 0) {
    fail(`${label}.source 必须是非空相对路径。`);
  }
  if (source.includes('\\') || source.includes(':') || source.startsWith('/') || source.startsWith('//')) {
    fail(`${label}.source 只能使用普通相对路径。`);
  }
  if (source.split('/').includes('..')) {
    fail(`${label}.source 不允许包含 .. 路径段。`);
  }
  if (!source.startsWith(resourceRoot)) {
    fail(`${label}.source 必须位于 ${resourceRoot} 下。`);
  }
}

function assertSha256(value, label) {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    fail(`${label}.sha256 必须是 64 位小写十六进制摘要。`);
  }
}

function assertLicense(value, label) {
  if (!value || typeof value !== 'object') {
    fail(`${label}.license 必须是对象。`);
  }
  if (typeof value.expression !== 'string' || value.expression.length === 0) {
    fail(`${label}.license.expression 必须是非空字符串。`);
  }
  if (!allowedLicenseOrigins.has(value.origin)) {
    fail(`${label}.license.origin 不在允许范围内: ${value.origin}`);
  }
}

function assertSameLicense(left, right, label) {
  if (left.expression !== right.expression || left.origin !== right.origin) {
    fail(`${label} 与画廊索引许可证不一致。`);
  }
}

function assertResourceJsonShape(resource, json) {
  if (resource.kind === 'unicode-art-font') {
    if (json.format !== 'unicode-art-font' || json.version !== 1 || !json.glyphs) {
      fail(`${resource.id} 不是有效 unicode-art-font@1 资源。`);
    }
    return;
  }
  if (resource.kind === 'semantic-document') {
    if (json.version !== 1 || !Array.isArray(json.rows)) {
      fail(`${resource.id} 不是有效 semantic-document@1 资源。`);
    }
    return;
  }
  fail(`${resource.id} 使用了不支持的资源类型: ${resource.kind}`);
}

function createArtworkMap(index) {
  if (index.format !== 'unicode-art-gallery-index' || index.version !== 1) {
    fail('画廊索引必须保持 unicode-art-gallery-index@1。');
  }
  if (!Array.isArray(index.artworks)) {
    fail('画廊索引 artworks 必须是数组。');
  }
  const map = new Map();
  for (const artwork of index.artworks) {
    if (map.has(artwork.id)) {
      fail(`画廊索引存在重复作品 ID: ${artwork.id}`);
    }
    map.set(artwork.id, artwork);
  }
  return map;
}

function checkManifest(manifestPath) {
  assertInside(galleryRoot, manifestPath, '资源发现 manifest');
  const manifest = readJson(manifestPath, normalizeSlash(path.relative(repositoryRoot, manifestPath)));
  const manifestDir = path.dirname(manifestPath);

  if (manifest.format !== 'unicode-art-gallery-resource-manifest') {
    fail('资源发现 manifest.format 必须是 unicode-art-gallery-resource-manifest。');
  }
  if (manifest.version !== 1) {
    fail('资源发现 manifest.version 必须是 1。');
  }
  if (manifest.index !== 'index.json') {
    fail('资源发现 manifest.index 当前必须指向同目录 index.json。');
  }
  if (manifest.resourceRoot !== 'artworks/') {
    fail('资源发现 manifest.resourceRoot 当前必须是 artworks/。');
  }
  if (manifest.network !== 'none') {
    fail('资源发现 manifest.network 当前必须是 none。');
  }
  if (manifest.automaticInstall !== false) {
    fail('资源发现 manifest.automaticInstall 当前必须是 false。');
  }
  assertDate(manifest.reviewedAt, '资源发现 manifest.reviewedAt');
  if (!Array.isArray(manifest.resources) || manifest.resources.length === 0) {
    fail('资源发现 manifest.resources 必须是非空数组。');
  }

  const indexPath = path.join(manifestDir, manifest.index);
  assertInside(galleryRoot, indexPath, '画廊索引');
  const artworkMap = createArtworkMap(readJson(indexPath, '画廊索引'));
  if (artworkMap.size !== manifest.resources.length) {
    fail('资源发现 manifest.resources 数量必须与画廊索引一致。');
  }

  const seenIds = new Set();
  for (const resource of manifest.resources) {
    const label = `资源 ${resource?.id || '<unknown>'}`;
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(resource.id || '')) {
      fail(`${label}.id 必须是稳定的小写短横线 ID。`);
    }
    if (seenIds.has(resource.id)) {
      fail(`资源发现 manifest 存在重复 ID: ${resource.id}`);
    }
    seenIds.add(resource.id);

    if (!allowedKinds.has(resource.kind)) {
      fail(`${label}.kind 不在当前 gallery 资源发现范围内: ${resource.kind}`);
    }
    assertRelativeResourcePath(resource.source, manifest.resourceRoot, label);
    assertSha256(resource.sha256, label);
    assertLicense(resource.license, label);
    assertDate(resource.reviewedAt, `${label}.reviewedAt`);
    if (!Number.isInteger(resource.size) || resource.size <= 0) {
      fail(`${label}.size 必须是正整数。`);
    }

    const artwork = artworkMap.get(resource.id);
    if (!artwork) {
      fail(`${label} 没有对应的画廊索引项。`);
    }
    if (artwork.kind !== resource.kind || artwork.source !== resource.source) {
      fail(`${label} 与画廊索引 kind/source 不一致。`);
    }
    assertSameLicense(resource.license, artwork.license, `${label}.license`);
    if (artwork.reviewedAt !== resource.reviewedAt) {
      fail(`${label}.reviewedAt 与画廊索引不一致。`);
    }

    const resourcePath = path.join(manifestDir, resource.source);
    assertInside(path.join(galleryRoot, manifest.resourceRoot), resourcePath, `${label}.source`);
    if (!fs.existsSync(resourcePath)) {
      fail(`${label}.source 指向的文件不存在: ${resource.source}`);
    }

    const content = fs.readFileSync(resourcePath);
    const actualHash = crypto.createHash('sha256').update(content).digest('hex');
    if (content.length !== resource.size) {
      fail(`${label}.size 与实际文件大小不一致。`);
    }
    if (actualHash !== resource.sha256) {
      fail(`${label}.sha256 与实际文件内容不一致。`);
    }
    assertResourceJsonShape(resource, JSON.parse(content.toString('utf8')));
  }

  for (const id of artworkMap.keys()) {
    if (!seenIds.has(id)) {
      fail(`画廊索引作品缺少资源发现条目: ${id}`);
    }
  }
}

const manifestArg = process.argv[2];
const manifestPath = manifestArg
  ? path.resolve(repositoryRoot, manifestArg)
  : defaultManifestPath;

try {
  checkManifest(manifestPath);
  process.stdout.write('Static resource discovery checks passed.\n');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
