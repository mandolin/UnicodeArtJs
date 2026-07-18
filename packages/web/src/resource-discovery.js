/**
 * ============================================================================
 * 🟦 UnicodeArtJs Web 静态资源发现契约
 * ============================================================================
 *
 * 🔶 模块职责
 * 解析随站发布的 `resource-manifest.json`，并在浏览器端复核同源静态资源的
 * size 与 sha256。该模块只处理声明式 JSON 和同源 URL，不安装、不执行资源。
 *
 * 🔶 安全边界
 * - 只接受 `unicode-art-gallery-resource-manifest@1`。
 * - 清单、索引和资源都必须位于当前站点的 `gallery/` 根目录下。
 * - `network` 必须是 `none`，`automaticInstall` 必须是 `false`。
 * - hash 校验只证明字节一致，不替代许可证审计或内容审核。
 *
 * @lang zh-CN 浏览器端静态资源发现契约模块；用于解析同源 gallery resource manifest，并验证 size、sha256 与画廊索引关系。
 * @lang en Browser-side static resource discovery contract; parses same-origin gallery resource manifests and verifies size, sha256, and gallery-index relationships.
 *
 * @module @unicode-art/web/resource-discovery
 * @license MIT
 * ============================================================================
 */

//#region 🟩 格式常量

/**
 * 静态资源发现清单的固定格式名。
 *
 * @lang zh-CN 静态资源发现清单的固定格式标识；其它 JSON 不会被当作资源发现清单消费。
 * @lang en Fixed format identifier for static resource discovery manifests; other JSON files are not consumed as discovery manifests.
 * @constant {string}
 * @readonly
 */
export const UNICODE_ART_RESOURCE_MANIFEST_FORMAT = 'unicode-art-gallery-resource-manifest';

/**
 * 当前支持的资源发现清单版本。
 *
 * @lang zh-CN 当前支持的资源发现清单版本；版本不匹配时调用方应更新页面或清单。
 * @lang en Currently supported resource manifest version; callers should update the page or manifest when versions differ.
 * @constant {number}
 * @readonly
 */
export const UNICODE_ART_RESOURCE_MANIFEST_VERSION = 1;

/**
 * Web 首版资源发现允许展示的资源类型。
 *
 * @lang zh-CN Web 首版只展示声明式 UAF 字体和语义文档资源，不包含脚本、远程包或可执行扩展。
 * @lang en The first Web discovery page displays only declarative UAF font and semantic-document resources, excluding scripts, remote packages, and executable extensions.
 * @constant {string[]}
 * @readonly
 */
export const UNICODE_ART_DISCOVERY_RESOURCE_KINDS = Object.freeze([
  'semantic-document',
  'unicode-art-font',
]);

const allowedKinds = new Set(UNICODE_ART_DISCOVERY_RESOURCE_KINDS);
const allowedLicenseOrigins = new Set(['original', 'imported', 'derived', 'mixed']);
const artworkExtensionByKind = Object.freeze({
  'semantic-document': '.uadoc.json',
  'unicode-art-font': '.uafont.json',
});

//#endregion

//#region 🟩 基础断言

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

function parseDate(value, name) {
  const text = asNonEmptyString(value, name, 16);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error(`${name} 必须使用 YYYY-MM-DD`);
  }
  const parsed = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new Error(`${name} 不是有效日期`);
  }
  return text;
}

function parseSha256(value, name) {
  const text = asNonEmptyString(value, name, 64);
  if (!/^[a-f0-9]{64}$/.test(text)) {
    throw new Error(`${name} 必须是 64 位小写十六进制摘要`);
  }
  return text;
}

function parseLicense(value, name) {
  const record = asRecord(value, name);
  hasOnlyExpectedKeys(record, new Set(['expression', 'origin']), name);
  const expression = asNonEmptyString(record.expression, `${name}.expression`, 120);
  const origin = asNonEmptyString(record.origin, `${name}.origin`, 40);
  if (!allowedLicenseOrigins.has(origin)) {
    throw new Error(`${name}.origin 不受支持: ${origin}`);
  }
  return Object.freeze({ expression, origin });
}

function parseLocalPath(value, name, expectedValue) {
  const path = asNonEmptyString(value, name, 80);
  if (expectedValue && path === expectedValue) return path;
  if (expectedValue && path !== expectedValue) {
    throw new Error(`${name} 当前必须是 ${expectedValue}`);
  }
  if (
    path.includes('\\')
    || path.includes(':')
    || path.startsWith('/')
    || path.startsWith('//')
    || path.split('/').some((segment) => !segment || segment === '.' || segment === '..')
  ) {
    throw new Error(`${name} 必须是安全相对路径`);
  }
  return path;
}

function parseResourcePath(value, kind, resourceRoot, name) {
  const source = parseLocalPath(value, name);
  const expectedExtension = artworkExtensionByKind[kind];
  if (!source.startsWith(resourceRoot) || !source.endsWith(expectedExtension)) {
    throw new Error(`${name} 必须位于 ${resourceRoot} 下并以 ${expectedExtension} 结尾`);
  }
  return source;
}

//#endregion

//#region 🟩 公开解析 API

/**
 * 解析并严格校验静态资源发现清单。
 *
 * @lang zh-CN 解析 `unicode-art-gallery-resource-manifest@1`；该入口只校验清单元数据和安全路径，不读取资源内容。
 * @lang en Parses `unicode-art-gallery-resource-manifest@1`; this entry validates manifest metadata and safe paths without reading resource contents.
 *
 * @param {string} source - <lang key="web.resource.parse.param.source"><zh-CN>`resource-manifest.json` 的 UTF-8 文本。</zh-CN><en>UTF-8 text from `resource-manifest.json`.</en></lang>
 * @returns {Object} <lang key="web.resource.parse.returns"><zh-CN>冻结后的资源发现清单。</zh-CN><en>Frozen resource discovery manifest.</en></lang>
 * @throws {Error} <lang key="web.resource.parse.throws"><zh-CN>当 JSON、格式版本、路径、许可证或 hash 字段不符合契约时抛出。</zh-CN><en>Thrown when JSON, format version, paths, licenses, or hash fields violate the contract.</en></lang>
 */
export function parseUnicodeArtResourceManifest(source) {
  let value;
  try {
    value = JSON.parse(source);
  } catch {
    throw new Error('资源发现清单不是有效 JSON');
  }

  const manifest = asRecord(value, 'resource manifest');
  hasOnlyExpectedKeys(
    manifest,
    new Set(['format', 'version', 'index', 'resourceRoot', 'network', 'automaticInstall', 'reviewedAt', 'resources']),
    'resource manifest',
  );
  if (manifest.format !== UNICODE_ART_RESOURCE_MANIFEST_FORMAT) {
    throw new Error(`resource manifest.format 必须为 ${UNICODE_ART_RESOURCE_MANIFEST_FORMAT}`);
  }
  if (manifest.version !== UNICODE_ART_RESOURCE_MANIFEST_VERSION) {
    throw new Error(`resource manifest.version 必须为 ${UNICODE_ART_RESOURCE_MANIFEST_VERSION}`);
  }
  if (manifest.network !== 'none') {
    throw new Error('resource manifest.network 当前必须为 none');
  }
  if (manifest.automaticInstall !== false) {
    throw new Error('resource manifest.automaticInstall 当前必须为 false');
  }

  const resourceRoot = parseLocalPath(manifest.resourceRoot, 'resource manifest.resourceRoot', 'artworks/');
  if (!Array.isArray(manifest.resources) || manifest.resources.length === 0 || manifest.resources.length > 200) {
    throw new Error('resource manifest.resources 必须是包含 1-200 项的数组');
  }

  const ids = new Set();
  const resources = manifest.resources.map((entry, index) => {
    const resource = asRecord(entry, `resource manifest.resources[${index}]`);
    hasOnlyExpectedKeys(
      resource,
      new Set(['id', 'kind', 'source', 'size', 'sha256', 'license', 'reviewedAt']),
      `resource manifest.resources[${index}]`,
    );
    const id = asNonEmptyString(resource.id, `resource manifest.resources[${index}].id`, 80);
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(id) || ids.has(id)) {
      throw new Error(`resource manifest.resources[${index}].id 必须唯一且只包含小写字母、数字和连字符`);
    }
    ids.add(id);

    const kind = asNonEmptyString(resource.kind, `resource manifest.resources[${index}].kind`, 40);
    if (!allowedKinds.has(kind)) {
      throw new Error(`resource manifest.resources[${index}].kind 不受支持: ${kind}`);
    }
    if (!Number.isInteger(resource.size) || resource.size <= 0) {
      throw new Error(`resource manifest.resources[${index}].size 必须是正整数`);
    }

    return Object.freeze({
      id,
      kind,
      source: parseResourcePath(resource.source, kind, resourceRoot, `resource manifest.resources[${index}].source`),
      size: resource.size,
      sha256: parseSha256(resource.sha256, `resource manifest.resources[${index}].sha256`),
      license: parseLicense(resource.license, `resource manifest.resources[${index}].license`),
      reviewedAt: parseDate(resource.reviewedAt, `resource manifest.resources[${index}].reviewedAt`),
    });
  });

  return Object.freeze({
    format: manifest.format,
    version: manifest.version,
    index: parseLocalPath(manifest.index, 'resource manifest.index', 'index.json'),
    resourceRoot,
    network: manifest.network,
    automaticInstall: manifest.automaticInstall,
    reviewedAt: parseDate(manifest.reviewedAt, 'resource manifest.reviewedAt'),
    resources: Object.freeze(resources),
  });
}

/**
 * 复核资源发现清单与画廊索引的一致性。
 *
 * @lang zh-CN 确认资源清单覆盖每个画廊作品，且 kind、source、license 和 reviewedAt 与画廊索引一致。
 * @lang en Ensures the resource manifest covers every gallery artwork and matches kind, source, license, and reviewedAt from the gallery index.
 *
 * @param {Object} manifest - <lang key="web.resource.match.param.manifest"><zh-CN>已解析的资源发现清单。</zh-CN><en>Parsed resource discovery manifest.</en></lang>
 * @param {Object} galleryIndex - <lang key="web.resource.match.param.galleryIndex"><zh-CN>已解析的静态画廊索引。</zh-CN><en>Parsed static gallery index.</en></lang>
 * @returns {Object} <lang key="web.resource.match.returns"><zh-CN>包含资源数和覆盖数的冻结摘要。</zh-CN><en>Frozen summary containing resource and coverage counts.</en></lang>
 * @throws {Error} <lang key="web.resource.match.throws"><zh-CN>当资源清单和画廊索引不一致时抛出。</zh-CN><en>Thrown when the resource manifest and gallery index do not agree.</en></lang>
 */
export function matchResourceManifestWithGallery(manifest, galleryIndex) {
  const artworkMap = new Map((galleryIndex.artworks || []).map((artwork) => [artwork.id, artwork]));
  if (artworkMap.size !== manifest.resources.length) {
    throw new Error('资源发现清单数量必须与画廊索引一致');
  }

  const seen = new Set();
  for (const resource of manifest.resources) {
    const artwork = artworkMap.get(resource.id);
    if (!artwork) throw new Error(`资源 ${resource.id} 没有对应画廊作品`);
    if (seen.has(resource.id)) throw new Error(`资源 ${resource.id} 重复出现`);
    seen.add(resource.id);
    if (artwork.kind !== resource.kind || artwork.source !== resource.source) {
      throw new Error(`资源 ${resource.id} 与画廊索引 kind/source 不一致`);
    }
    if (
      artwork.license?.expression !== resource.license.expression
      || artwork.license?.origin !== resource.license.origin
    ) {
      throw new Error(`资源 ${resource.id} 与画廊索引许可证不一致`);
    }
    if (artwork.reviewedAt !== resource.reviewedAt) {
      throw new Error(`资源 ${resource.id} 与画廊索引审核日期不一致`);
    }
  }

  for (const id of artworkMap.keys()) {
    if (!seen.has(id)) throw new Error(`画廊作品 ${id} 缺少资源发现条目`);
  }

  return Object.freeze({
    resourceCount: manifest.resources.length,
    coveredArtworkCount: artworkMap.size,
  });
}

/**
 * 将清单或资源路径解析为同源 gallery URL。
 *
 * @lang zh-CN 将已校验的 manifest/index/resource 相对路径解析为当前站点 `gallery/` 下的同源 URL。
 * @lang en Resolves a validated manifest, index, or resource path into a same-origin URL under the current site's `gallery/` root.
 *
 * @param {string} source - <lang key="web.resource.resolve.param.source"><zh-CN>清单、索引或资源的相对路径。</zh-CN><en>Relative manifest, index, or resource path.</en></lang>
 * @param {string} [pageUrl] - <lang key="web.resource.resolve.param.pageUrl"><zh-CN>当前页面 URL；Node 测试可传入确定性值。</zh-CN><en>Current page URL; Node tests may provide a deterministic value.</en></lang>
 * @returns {URL} <lang key="web.resource.resolve.returns"><zh-CN>受同源与 gallery 根目录限制的 URL。</zh-CN><en>URL constrained to same origin and the gallery root.</en></lang>
 * @throws {Error} <lang key="web.resource.resolve.throws"><zh-CN>当路径解析后离开 gallery 根目录时抛出。</zh-CN><en>Thrown when the resolved path leaves the gallery root.</en></lang>
 */
export function resolveUnicodeArtResourceDiscoveryUrl(source, pageUrl = window.location.href) {
  const root = new URL('./gallery/', pageUrl);
  const resolved = new URL(source, root);
  if (resolved.origin !== root.origin || !resolved.pathname.startsWith(root.pathname)) {
    throw new Error('资源发现路径越出了静态 gallery 根目录');
  }
  return resolved;
}

//#endregion

//#region 🟩 hash 与资源内容校验

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * 计算 ArrayBuffer 的 sha256。
 *
 * @lang zh-CN 使用 Web Crypto 计算资源字节的 sha256；在不支持 `crypto.subtle` 的环境中抛出明确错误。
 * @lang en Computes sha256 for resource bytes with Web Crypto; throws a clear error when `crypto.subtle` is unavailable.
 *
 * @param {ArrayBuffer} buffer - <lang key="web.resource.sha.param.buffer"><zh-CN>资源文件字节。</zh-CN><en>Resource file bytes.</en></lang>
 * @returns {Promise<string>} <lang key="web.resource.sha.returns"><zh-CN>64 位小写十六进制 sha256。</zh-CN><en>64-character lowercase hexadecimal sha256.</en></lang>
 */
export async function sha256HexFromArrayBuffer(buffer) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error('当前浏览器不支持 Web Crypto sha256');
  return toHex(await subtle.digest('SHA-256', buffer));
}

/**
 * 复核单个资源文件的 size、sha256 与 JSON 形状。
 *
 * @lang zh-CN 复核资源字节与清单记录是否一致，并确认资源 JSON 仍是当前 Web 可展示的声明式格式。
 * @lang en Verifies resource bytes against manifest metadata and confirms the resource JSON remains a declarative format that Web can display.
 *
 * @param {Object} resource - <lang key="web.resource.verify.param.resource"><zh-CN>资源清单中的单个资源条目。</zh-CN><en>Single resource entry from the manifest.</en></lang>
 * @param {ArrayBuffer} buffer - <lang key="web.resource.verify.param.buffer"><zh-CN>资源文件字节。</zh-CN><en>Resource file bytes.</en></lang>
 * @returns {Promise<Object>} <lang key="web.resource.verify.returns"><zh-CN>冻结后的校验结果。</zh-CN><en>Frozen verification result.</en></lang>
 */
export async function verifyUnicodeArtResourceBytes(resource, buffer) {
  const actualSize = buffer.byteLength;
  const actualSha256 = await sha256HexFromArrayBuffer(buffer);
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
  const json = JSON.parse(text);

  if (resource.kind === 'unicode-art-font') {
    if (json.format !== 'unicode-art-font' || json.version !== 1 || !json.glyphs) {
      throw new Error(`${resource.id} 不是有效 unicode-art-font@1 资源`);
    }
  } else if (resource.kind === 'semantic-document') {
    if (json.version !== 1 || !Array.isArray(json.rows)) {
      throw new Error(`${resource.id} 不是有效 semantic-document@1 资源`);
    }
  } else {
    throw new Error(`${resource.id} 使用了不支持的资源类型: ${resource.kind}`);
  }

  return Object.freeze({
    id: resource.id,
    actualSize,
    actualSha256,
    sizeOk: actualSize === resource.size,
    sha256Ok: actualSha256 === resource.sha256,
    shapeOk: true,
    ok: actualSize === resource.size && actualSha256 === resource.sha256,
  });
}

//#endregion
