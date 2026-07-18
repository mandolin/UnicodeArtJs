/**
 * Web 静态资源发现契约测试。
 *
 * 这些测试专注浏览器侧 resource manifest 解析、同源路径约束和真实资源
 * hash 校验。它们不安装、不导入、不执行任何资源。
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { parseUnicodeArtGalleryIndex } from '../src/gallery-index.js';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

const {
  matchResourceManifestWithGallery,
  parseUnicodeArtResourceManifest,
  resolveUnicodeArtResourceDiscoveryUrl,
  verifyUnicodeArtResourceBytes,
} = await import('../src/resource-discovery.js');

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const galleryRoot = path.join(testDirectory, '..', 'public', 'gallery');
const manifestPath = path.join(galleryRoot, 'resource-manifest.json');
const indexPath = path.join(galleryRoot, 'index.json');

test('parses the same-origin resource manifest and matches the gallery index', async () => {
  const manifest = parseUnicodeArtResourceManifest(await readFile(manifestPath, 'utf8'));
  const galleryIndex = parseUnicodeArtGalleryIndex(await readFile(indexPath, 'utf8'));
  const summary = matchResourceManifestWithGallery(manifest, galleryIndex);

  assert.equal(manifest.version, 1);
  assert.equal(manifest.network, 'none');
  assert.equal(manifest.automaticInstall, false);
  assert.equal(manifest.resourceRoot, 'artworks/');
  assert.equal(summary.resourceCount, galleryIndex.artworks.length);
  assert.ok(manifest.resources.some((resource) => resource.id === 'review-workflow'));
});

test('resolves discovery paths only under the gallery root', () => {
  const manifestUrl = resolveUnicodeArtResourceDiscoveryUrl(
    'resource-manifest.json',
    'https://example.test/UnicodeArtJs/',
  );
  assert.equal(manifestUrl.href, 'https://example.test/UnicodeArtJs/gallery/resource-manifest.json');

  assert.throws(
    () => resolveUnicodeArtResourceDiscoveryUrl('../docs/manifest.json', 'https://example.test/UnicodeArtJs/'),
    /越出了静态 gallery 根目录/u,
  );
});

test('verifies real resource bytes against size and sha256', async () => {
  const manifest = parseUnicodeArtResourceManifest(await readFile(manifestPath, 'utf8'));
  const resource = manifest.resources.find((item) => item.id === 'line-banner-uaj');
  const buffer = await readFile(path.join(galleryRoot, resource.source));
  const verification = await verifyUnicodeArtResourceBytes(resource, buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ));

  assert.equal(verification.ok, true);
  assert.equal(verification.sizeOk, true);
  assert.equal(verification.sha256Ok, true);
  assert.equal(verification.actualSize, resource.size);
  assert.equal(verification.actualSha256, resource.sha256);
});

test('rejects a manifest that claims automatic install', async () => {
  const source = JSON.parse(await readFile(manifestPath, 'utf8'));
  source.automaticInstall = true;

  assert.throws(
    () => parseUnicodeArtResourceManifest(JSON.stringify(source)),
    /automaticInstall 当前必须为 false/u,
  );
});
