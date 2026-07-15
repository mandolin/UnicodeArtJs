/**
 * ============================================================================
 * 🟦 UnicodeArtJs 静态画廊索引契约
 * ============================================================================
 *
 * 🔶 模块职责
 * 约束 GitHub Pages 上可展示的审核作品索引。此模块只处理静态 JSON 元数据，
 * 不执行作品代码、不接受网络地址，也不承担用户上传或社区投稿。
 *
 * 🔶 安全边界
 * - 资源必须位于画廊同源 `artworks/` 目录。
 * - 只允许 UAF 与语义文档这两类已由 Core 校验的声明式 JSON。
 * - 所有展示文本由调用方以 textContent 写入页面，不能拼接为 HTML。
 *
 * @lang zh-CN 审核静态画廊索引的浏览器模块；只处理同源 JSON 元数据与安全相对路径，不加载或执行第三方作品代码。
 * @lang en Browser module for reviewed static gallery indexes; handles only same-origin JSON metadata and safe relative paths, without loading or executing third-party artwork code.
 *
 * @module @unicode-art/web/gallery-index
 * @license MIT
 * ============================================================================
 */

//#region 🟩 格式常量

/**
 * 静态画廊索引的固定格式名。
 *
 * @lang zh-CN 静态画廊索引的固定格式标识；解析器拒绝其它格式，防止把任意 JSON 当作作品目录消费。
 * @lang en Fixed format identifier for static gallery indexes; the parser rejects other formats so arbitrary JSON cannot be consumed as an artwork catalog.
 * @constant {string}
 * @readonly
 */
export const UNICODE_ART_GALLERY_INDEX_FORMAT = 'unicode-art-gallery-index';

/**
 * 当前支持的静态画廊索引版本。
 *
 * @lang zh-CN 当前支持的静态画廊索引版本；版本不匹配时必须由调用方更新索引或解析器。
 * @lang en Currently supported static gallery index version; callers must update the index or parser when versions differ.
 * @constant {number}
 * @readonly
 */
export const UNICODE_ART_GALLERY_INDEX_VERSION = 1;

/**
 * 画廊首版允许的、可由现有 Core 解析的资源种类。
 *
 * @lang zh-CN 画廊首版允许的声明式资源种类；不包含脚本、远程 URL、压缩包或可执行扩展。
 * @lang en Declarative resource kinds allowed by the first gallery release; excludes scripts, remote URLs, archives, and executable extensions.
 * @constant {string[]}
 * @readonly
 */
export const UNICODE_ART_GALLERY_ARTWORK_KINDS = Object.freeze([
  'semantic-document',
  'unicode-art-font',
]);

/** 作品资源路径允许的文件扩展名。 */
const ARTWORK_EXTENSION_BY_KIND = Object.freeze({
  'semantic-document': '.uadoc.json',
  'unicode-art-font': '.uafont.json',
});

//#endregion

//#region 🟩 解析辅助

function asRecord(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${name} 必须是对象`);
  }
  return value;
}

function asNonEmptyString(value, name, maxLength = 400) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new Error(`${name} 必须是非空字符串`);
  }
  return value.trim();
}

function hasOnlyExpectedKeys(record, allowedKeys, name) {
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) throw new Error(`${name} 包含未知字段: ${key}`);
  }
}

function parseLocalizedText(value, name) {
  const record = asRecord(value, name);
  hasOnlyExpectedKeys(record, new Set(['zh-CN', 'en-US']), name);
  return Object.freeze({
    'zh-CN': asNonEmptyString(record['zh-CN'], `${name}.zh-CN`),
    'en-US': asNonEmptyString(record['en-US'], `${name}.en-US`),
  });
}

function parseAssetPath(value, kind, name) {
  const path = asNonEmptyString(value, name, 160);
  const expectedExtension = ARTWORK_EXTENSION_BY_KIND[kind];
  const hasUnsafeSegment = path.split('/').some((segment) => (
    !segment || segment === '.' || segment === '..'
  ));
  if (
    !path.startsWith('artworks/')
    || path.includes('\\')
    || hasUnsafeSegment
    || !/^[a-z0-9][a-z0-9._/-]*$/i.test(path)
    || !path.endsWith(expectedExtension)
  ) {
    throw new Error(`${name} 必须是 artworks/ 下安全的 ${expectedExtension} 相对路径`);
  }
  return path;
}

function parseLicense(value, name) {
  const record = asRecord(value, name);
  hasOnlyExpectedKeys(record, new Set(['expression', 'origin']), name);
  const expression = asNonEmptyString(record.expression, `${name}.expression`, 120);
  const origin = asNonEmptyString(record.origin, `${name}.origin`, 40);
  if (origin !== 'original') throw new Error(`${name}.origin 首版只能为 original`);
  return Object.freeze({ expression, origin });
}

function parseTags(value, name) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 8) {
    throw new Error(`${name} 必须是包含 1-8 项的数组`);
  }
  const tags = value.map((tag, index) => asNonEmptyString(tag, `${name}[${index}]`, 32));
  if (new Set(tags).size !== tags.length) throw new Error(`${name} 不能包含重复标签`);
  return Object.freeze(tags);
}

//#endregion

//#region 🟩 公开 API

/**
 * 解析并严格校验静态画廊索引。
 *
 * 解析结果为冻结对象，避免调用方意外改写已审核作品的元数据。
 *
 * @lang zh-CN 解析并严格校验静态画廊索引；该入口只接受审核后的同源 JSON 元数据，不读取、下载或执行作品内容。
 * @lang en Parses and strictly validates a static gallery index; this entry accepts only reviewed same-origin JSON metadata and never reads, downloads, or executes artwork content.
 *
 * @param {string} source - <lang key="web.gallery.parse.param.source"><zh-CN>画廊 `index.json` 的 UTF-8 文本。</zh-CN><en>UTF-8 text from the gallery `index.json` file.</en></lang>
 * @returns {Object} <lang key="web.gallery.parse.returns"><zh-CN>冻结后的索引、元数据和作品列表。</zh-CN><en>Frozen index, metadata, and artwork list.</en></lang>
 * @throws {Error} <lang key="web.gallery.parse.throws"><zh-CN>当 JSON、格式版本、字段、许可证或资源路径不符合静态画廊契约时抛出。</zh-CN><en>Thrown when JSON, format version, fields, licenses, or resource paths violate the static-gallery contract.</en></lang>
 * @example
 * const index = parseUnicodeArtGalleryIndex(indexJsonText);
 * const firstArtwork = index.artworks[0];
 */
export function parseUnicodeArtGalleryIndex(source) {
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('画廊索引不是有效 JSON');
  }

  const index = asRecord(value, 'gallery index');
  hasOnlyExpectedKeys(index, new Set(['format', 'version', 'meta', 'artworks']), 'gallery index');
  if (index.format !== UNICODE_ART_GALLERY_INDEX_FORMAT) {
    throw new Error(`gallery index.format 必须为 ${UNICODE_ART_GALLERY_INDEX_FORMAT}`);
  }
  if (index.version !== UNICODE_ART_GALLERY_INDEX_VERSION) {
    throw new Error(`gallery index.version 必须为 ${UNICODE_ART_GALLERY_INDEX_VERSION}`);
  }

  const metaSource = asRecord(index.meta, 'gallery index.meta');
  hasOnlyExpectedKeys(metaSource, new Set(['name', 'license', 'reviewedAt']), 'gallery index.meta');
  const meta = Object.freeze({
    name: parseLocalizedText(metaSource.name, 'gallery index.meta.name'),
    license: parseLicense(metaSource.license, 'gallery index.meta.license'),
    reviewedAt: asNonEmptyString(metaSource.reviewedAt, 'gallery index.meta.reviewedAt', 16),
  });

  if (!Array.isArray(index.artworks) || index.artworks.length === 0 || index.artworks.length > 100) {
    throw new Error('gallery index.artworks 必须是包含 1-100 项的数组');
  }

  const ids = new Set();
  const artworks = index.artworks.map((entry, position) => {
    const artwork = asRecord(entry, `gallery index.artworks[${position}]`);
    hasOnlyExpectedKeys(
      artwork,
      new Set(['id', 'kind', 'source', 'sample', 'title', 'description', 'tags', 'author', 'license', 'reviewedAt']),
      `gallery index.artworks[${position}]`,
    );
    const id = asNonEmptyString(artwork.id, `gallery index.artworks[${position}].id`, 80);
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(id) || ids.has(id)) {
      throw new Error(`gallery index.artworks[${position}].id 必须唯一且只包含小写字母、数字和连字符`);
    }
    ids.add(id);

    const kind = asNonEmptyString(artwork.kind, `gallery index.artworks[${position}].kind`, 40);
    if (!UNICODE_ART_GALLERY_ARTWORK_KINDS.includes(kind)) {
      throw new Error(`gallery index.artworks[${position}].kind 不受支持: ${kind}`);
    }

    const sample = artwork.sample === undefined
      ? undefined
      : asNonEmptyString(artwork.sample, `gallery index.artworks[${position}].sample`, 160);
    if (kind === 'unicode-art-font' && !sample) {
      throw new Error(`gallery index.artworks[${position}].sample 是艺术字作品的必填字段`);
    }
    if (kind === 'semantic-document' && sample !== undefined) {
      throw new Error(`gallery index.artworks[${position}].sample 只适用于艺术字作品`);
    }

    return Object.freeze({
      id,
      kind,
      source: parseAssetPath(artwork.source, kind, `gallery index.artworks[${position}].source`),
      ...(sample ? { sample } : {}),
      title: parseLocalizedText(artwork.title, `gallery index.artworks[${position}].title`),
      description: parseLocalizedText(artwork.description, `gallery index.artworks[${position}].description`),
      tags: parseTags(artwork.tags, `gallery index.artworks[${position}].tags`),
      author: asNonEmptyString(artwork.author, `gallery index.artworks[${position}].author`, 120),
      license: parseLicense(artwork.license, `gallery index.artworks[${position}].license`),
      reviewedAt: asNonEmptyString(artwork.reviewedAt, `gallery index.artworks[${position}].reviewedAt`, 16),
    });
  });

  return Object.freeze({
    format: index.format,
    version: index.version,
    meta,
    artworks: Object.freeze(artworks),
  });
}

/**
 * 根据 UI 语言读取双语元数据，并在必要时采用英文回退。
 *
 * @lang zh-CN 按 UI 语言读取已校验的双语元数据；中文缺失时回退英文，英文缺失时回退中文。
 * @lang en Reads validated localized metadata for the UI locale; falls back to English when Chinese is missing and to Chinese when English is missing.
 *
 * @param {Object} value - <lang key="web.gallery.localizedText.param.value"><zh-CN>包含 `zh-CN` 与 `en-US` 的已校验文本对象。</zh-CN><en>Validated text object containing `zh-CN` and `en-US`.</en></lang>
 * @param {string} locale - <lang key="web.gallery.localizedText.param.locale"><zh-CN>当前 UI 语言。</zh-CN><en>Current UI locale.</en></lang>
 * @returns {string} <lang key="web.gallery.localizedText.returns"><zh-CN>可安全写入文本节点的本地化文本。</zh-CN><en>Localized text safe to write into a text node.</en></lang>
 */
export function getGalleryLocalizedText(value, locale) {
  if (!value || typeof value !== 'object') return '';
  return locale === 'en-US' ? value['en-US'] || value['zh-CN'] || '' : value['zh-CN'] || value['en-US'] || '';
}

/**
 * 将已校验的作品相对路径解析为固定画廊根目录内的同源 URL。
 *
 * @lang zh-CN 将已校验作品路径解析为固定画廊根目录内的同源 URL；额外的 origin 与路径前缀检查防止调用方绕过索引约束。
 * @lang en Resolves a validated artwork path into a same-origin URL under the fixed gallery root; extra origin and path-prefix checks prevent callers from bypassing index constraints.
 *
 * @param {string} source - <lang key="web.gallery.resolveUrl.param.source"><zh-CN>画廊索引中已校验的作品相对路径。</zh-CN><en>Validated relative artwork path from the gallery index.</en></lang>
 * @param {string} [pageUrl] - <lang key="web.gallery.resolveUrl.param.pageUrl"><zh-CN>当前页面 URL；Node 测试可传入确定性值。</zh-CN><en>Current page URL; Node tests may provide a deterministic value.</en></lang>
 * @returns {URL} <lang key="web.gallery.resolveUrl.returns"><zh-CN>受同源与画廊根目录限制的作品 URL。</zh-CN><en>Artwork URL constrained to the same origin and gallery root.</en></lang>
 * @throws {Error} <lang key="web.gallery.resolveUrl.throws"><zh-CN>当路径解析后离开画廊静态资源根目录时抛出。</zh-CN><en>Thrown when the resolved path leaves the gallery static-asset root.</en></lang>
 * @example
 * const url = resolveUnicodeArtGalleryArtworkUrl('artworks/example.uafont.json', 'https://example.test/UnicodeArtJs/');
 */
export function resolveUnicodeArtGalleryArtworkUrl(source, pageUrl = window.location.href) {
  const root = new URL('./gallery/', pageUrl);
  const resolved = new URL(source, root);
  if (resolved.origin !== root.origin || !resolved.pathname.startsWith(root.pathname)) {
    throw new Error('画廊作品路径越出了静态资源根目录');
  }
  return resolved;
}

//#endregion
