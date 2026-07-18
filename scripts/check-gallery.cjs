#!/usr/bin/env node

/**
 * 校验静态作品画廊与投稿链路。
 *
 * 该脚本用于提交前和 CI：检查公开投稿文档、Issue/PR 模板、画廊索引、
 * 作品源文件与 Core 解析能力，避免未审核资产或断链进入 GitHub Pages。
 */

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const repoRoot = path.resolve(__dirname, '..');
const galleryRoot = path.join(repoRoot, 'packages', 'web', 'public', 'gallery');
const galleryIndexPath = path.join(galleryRoot, 'index.json');
const galleryIndexModulePath = path.join(repoRoot, 'packages', 'web', 'src', 'gallery-index.js');
const webMainPath = path.join(repoRoot, 'packages', 'web', 'src', 'main.js');
const coreEntryPath = path.join(repoRoot, 'packages', 'core', 'dist', 'index.cjs.js');

const publicFilesToScan = [
  'docs/gallery.md',
  'docs/gallery-submission.md',
  'docs/gallery-review.md',
  '.github/ISSUE_TEMPLATE/gallery_artwork.yml',
  '.github/PULL_REQUEST_TEMPLATE/gallery_artwork.md',
];

const requiredPublicText = [
  ['docs/gallery.md', 'gallery-submission.md'],
  ['docs/gallery.md', 'gallery-review.md'],
  ['docs/gallery.md', 'resource-manifest.json'],
  ['docs/gallery.md', 'npm run resource-discovery:check'],
  ['docs/gallery-submission.md', 'npm run gallery:check'],
  ['docs/gallery-submission.md', 'packages/web/public/gallery/artworks/'],
  ['docs/gallery-submission.md', '许可确认'],
  ['docs/gallery-submission.md', 'gallery-review.md'],
  ['docs/gallery-review.md', '回退流程'],
  ['docs/gallery-review.md', 'npm run gallery:check'],
  ['docs/gallery-review.md', 'scripts/check-gallery.cjs'],
  ['.github/ISSUE_TEMPLATE/gallery_artwork.yml', 'Gallery artwork proposal'],
  ['.github/ISSUE_TEMPLATE/gallery_artwork.yml', 'docs/gallery-review.md'],
  ['.github/PULL_REQUEST_TEMPLATE/gallery_artwork.md', 'npm run gallery:check'],
  ['.github/PULL_REQUEST_TEMPLATE/gallery_artwork.md', 'Rollback notes'],
];

const permissiveGalleryLicenses = new Set([
  '0BSD',
  'MIT',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'Apache-2.0',
  'CC0-1.0',
  'Unlicense',
]);

function fail(message) {
  throw new Error(message);
}

function readUtf8(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

function checkPublicDocsAndTemplates() {
  for (const relativePath of publicFilesToScan) {
    const fullPath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(fullPath)) fail(`Missing public gallery file: ${relativePath}`);

    const text = fs.readFileSync(fullPath, 'utf8');
    for (const fragment of ['work-zone', 'ai/codex', '.generated-docs', 'K:\\', 'C:\\']) {
      if (text.includes(fragment)) {
        fail(`${relativePath} leaks internal fragment: ${fragment}`);
      }
    }
  }

  for (const [relativePath, expected] of requiredPublicText) {
    const text = readUtf8(relativePath);
    if (!text.includes(expected)) {
      fail(`${relativePath} is missing required gallery text: ${expected}`);
    }
  }
}

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    fail(`${label} must use YYYY-MM-DD.`);
  }

  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(`${label} is not a valid calendar date.`);
  }
}

function compareIsoDate(left, right) {
  return left.localeCompare(right);
}

function assertPermissiveLicense(license, label) {
  if (license.origin !== 'original') {
    fail(`${label}.origin must be original for the default static gallery.`);
  }
  if (!permissiveGalleryLicenses.has(license.expression)) {
    fail(`${label}.expression is not in the permissive gallery allowlist: ${license.expression}`);
  }
}

function assertArtworkPathInsideGallery(fullPath, label) {
  const artworkRoot = path.join(galleryRoot, 'artworks');
  const relative = path.relative(artworkRoot, fullPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`${label} resolves outside packages/web/public/gallery/artworks.`);
  }
}

async function checkGalleryAssets() {
  const {
    parseUnicodeArtGalleryIndex,
  } = await import(pathToFileURL(galleryIndexModulePath).href);
  const core = require(coreEntryPath);
  const index = parseUnicodeArtGalleryIndex(fs.readFileSync(galleryIndexPath, 'utf8'));
  const webMain = fs.readFileSync(webMainPath, 'utf8');

  assertDate(index.meta.reviewedAt, 'gallery index.meta.reviewedAt');
  assertPermissiveLicense(index.meta.license, 'gallery index.meta.license');

  const seenSources = new Set();
  const seenIds = new Set();
  if (index.artworks.length < 5) {
    fail('The default static gallery should keep at least 5 reviewed examples.');
  }
  for (const artwork of index.artworks) {
    if (seenIds.has(artwork.id)) {
      fail(`Duplicate gallery artwork id: ${artwork.id}`);
    }
    seenIds.add(artwork.id);

    assertDate(artwork.reviewedAt, `artwork ${artwork.id}.reviewedAt`);
    if (compareIsoDate(index.meta.reviewedAt, artwork.reviewedAt) < 0) {
      fail(`gallery index.meta.reviewedAt is older than artwork ${artwork.id}.reviewedAt.`);
    }
    assertPermissiveLicense(artwork.license, `artwork ${artwork.id}.license`);
    for (const tag of artwork.tags) {
      if (!webMain.includes(`'gallery.tag.${tag}'`)) {
        fail(`Artwork ${artwork.id} uses untranslated gallery tag: ${tag}`);
      }
    }

    if (seenSources.has(artwork.source)) {
      fail(`Duplicate gallery artwork source: ${artwork.source}`);
    }
    seenSources.add(artwork.source);

    const artworkPath = path.join(galleryRoot, artwork.source);
    assertArtworkPathInsideGallery(artworkPath, `artwork ${artwork.id}.source`);
    if (!fs.existsSync(artworkPath)) {
      fail(`Missing gallery artwork file: ${artwork.source}`);
    }

    const source = fs.readFileSync(artworkPath, 'utf8');
    if (artwork.kind === 'unicode-art-font') {
      const font = core.parseUnicodeArtFontJson(source, { locale: 'zh-CN' });
      if (font.meta.license.expression !== artwork.license.expression) {
        fail(`Artwork ${artwork.id} index license does not match UAF metadata.`);
      }
      if (font.meta.license.origin !== artwork.license.origin) {
        fail(`Artwork ${artwork.id} index license origin does not match UAF metadata.`);
      }
      const rendered = core.renderUnicodeArtFontText(font, artwork.sample, { locale: 'zh-CN' });
      if (!rendered.content || rendered.content.trim().length === 0) {
        fail(`Artwork ${artwork.id} sample did not render any UAF content.`);
      }
    } else if (artwork.kind === 'semantic-document') {
      core.parseSemanticDocumentJson(source, { locale: 'zh-CN' });
    } else {
      fail(`Unsupported gallery artwork kind: ${artwork.kind}`);
    }
  }
}

async function main() {
  checkPublicDocsAndTemplates();
  await checkGalleryAssets();
  process.stdout.write('Static gallery submission checks passed.\n');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
