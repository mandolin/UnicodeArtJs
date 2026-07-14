/**
 * 静态画廊索引契约测试。
 *
 * 这些测试不依赖浏览器或 Core build，专注确认静态资源索引的安全路径、
 * 许可元数据和双语展示字段在提交时不会退化。
 */

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import test from 'node:test';

import {
  getGalleryLocalizedText,
  parseUnicodeArtGalleryIndex,
  resolveUnicodeArtGalleryArtworkUrl,
} from '../src/gallery-index.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const galleryIndexPath = path.join(testDirectory, '..', 'public', 'gallery', 'index.json');

test('parses the reviewed static gallery index', async () => {
  const source = await readFile(galleryIndexPath, 'utf8');
  const index = parseUnicodeArtGalleryIndex(source);

  assert.equal(index.version, 1);
  assert.equal(index.artworks.length, 4);
  assert.equal(index.meta.license.expression, 'MIT');
  assert.equal(getGalleryLocalizedText(index.artworks[0].title, 'zh-CN'), '线条 Banner');
  assert.equal(getGalleryLocalizedText(index.artworks[0].title, 'en-US'), 'Line Banner');
  assert.ok(index.artworks.every((artwork) => artwork.license.origin === 'original'));
  assert.ok(index.artworks.every((artwork) => artwork.source.startsWith('artworks/')));
});

test('resolves artwork sources only within the gallery asset root', () => {
  const url = resolveUnicodeArtGalleryArtworkUrl(
    'artworks/line-banner.uafont.json',
    'https://example.test/UnicodeArtJs/',
  );
  assert.equal(url.href, 'https://example.test/UnicodeArtJs/gallery/artworks/line-banner.uafont.json');
});

test('rejects an unsafe artwork source path', () => {
  const invalid = {
    format: 'unicode-art-gallery-index',
    version: 1,
    meta: {
      name: { 'zh-CN': '测试画廊', 'en-US': 'Test Gallery' },
      license: { expression: 'MIT', origin: 'original' },
      reviewedAt: '2026-07-14',
    },
    artworks: [{
      id: 'unsafe-source',
      kind: 'semantic-document',
      source: '../outside.uadoc.json',
      title: { 'zh-CN': '测试', 'en-US': 'Test' },
      description: { 'zh-CN': '测试资源', 'en-US': 'Test asset' },
      tags: ['layout'],
      author: 'UnicodeArtJs',
      license: { expression: 'MIT', origin: 'original' },
      reviewedAt: '2026-07-14',
    }],
  };

  assert.throws(
    () => parseUnicodeArtGalleryIndex(JSON.stringify(invalid)),
    /artworks\/ 下安全的/u,
  );
});
