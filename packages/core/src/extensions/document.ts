/**
 * ============================================================================
 * 🟦 UnicodeArtJs 声明式扩展清单校验器
 * ============================================================================
 *
 * 🔶 模块职责
 * 解析、校验和协商 UAEM v1。模块不访问文件系统、不解析资源内容、不执行
 * 第三方代码，因此可由 Node、Browser、Web、VS Code 和桌面宿主共同复用。
 *
 * 🔶 安全约束
 * 清单路径只能是安全的相对 POSIX 路径。宿主读取前仍必须确认真实路径位于
 * 扩展根目录内，以防符号链接和宿主特有路径语义绕过。
 * ============================================================================
 */

import { normalizeLocale, t as translateCoreMessage } from '../i18n';
import type { MessageKey, MessageParams, SupportedLocale } from '../i18n';
import {
  isPermissiveUnicodeArtFontLicense,
  isSpdxExpressionSyntax
} from '../artFont/document';
import { ErrorCode, UnicodeArtError } from '../types/output';
import {
  UNICODE_ART_EXTENSION_FORMAT,
  type UnicodeArtExtensionCapability,
  type UnicodeArtExtensionCompatibility,
  type UnicodeArtExtensionCompatibilityReason,
  type UnicodeArtExtensionCompatibilityResult,
  type UnicodeArtExtensionHost,
  type UnicodeArtExtensionManifest,
  type UnicodeArtExtensionManifestV1,
  type UnicodeArtExtensionMetadata,
  type UnicodeArtExtensionParseOptions,
  type UnicodeArtExtensionResource,
  type UnicodeArtExtensionTarget
} from '../types/extension';
import type {
  UnicodeArtFontCreation,
  UnicodeArtFontLicense
} from '../types/artFont';

//#region 🟦 常量与公共政策

const MAX_AUTHORS = 16;
const MAX_RESOURCES = 128;
const ID_PATTERN = /^[a-z0-9](?:[a-z0-9.-]{0,126}[a-z0-9])?$/;
const RESOURCE_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const SEMVER_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const RESOURCE_CAPABILITIES: readonly UnicodeArtExtensionCapability[] = [
  'semantic-document',
  'unicode-art-font'
];
const EXTENSION_TARGETS: readonly UnicodeArtExtensionTarget[] = [
  'node',
  'browser',
  'cli',
  'web',
  'vscode',
  'desktop'
];

/** UAEM v1 允许的纯声明式资源能力。 */
export const UNICODE_ART_EXTENSION_RESOURCE_CAPABILITIES = RESOURCE_CAPABILITIES;

//#endregion

//#region 🟦 公开解析与校验入口

/** 解析 UAEM JSON；文件读取和权限提示由宿主负责。 */
export function parseUnicodeArtExtensionManifestJson(
  source: string,
  options: UnicodeArtExtensionParseOptions = {}
): UnicodeArtExtensionManifest {
  const locale = normalizeLocale(options.locale);
  if (typeof source !== 'string') {
    throw extensionError('extension.json.invalid', ErrorCode.EXTENSION_MANIFEST_PARSE_FAILED, locale, {
      message: 'source must be a string'
    });
  }

  try {
    return validateUnicodeArtExtensionManifest(JSON.parse(source), options);
  } catch (error) {
    if (error instanceof UnicodeArtError) throw error;
    throw extensionError('extension.json.invalid', ErrorCode.EXTENSION_MANIFEST_PARSE_FAILED, locale, {
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

/**
 * 校验并规范化 UAEM 文档。
 *
 * 未知字段一律拒绝；清单只声明资源，资源存在性和内容校验由宿主在受控路径中完成。
 */
export function validateUnicodeArtExtensionManifest(
  input: unknown,
  options: UnicodeArtExtensionParseOptions = {}
): UnicodeArtExtensionManifestV1 {
  const locale = normalizeLocale(options.locale);
  const document = expectRecord(input, locale, 'extension.document.object');
  rejectUnknownFields(
    document,
    ['format', 'version', 'meta', 'capabilities', 'compatibility', 'resources'],
    'document',
    locale
  );

  if (document.format !== UNICODE_ART_EXTENSION_FORMAT) {
    throw extensionError('extension.document.format', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      format: String(document.format)
    });
  }
  if (document.version !== 1) {
    throw extensionError('extension.document.version', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      version: String(document.version)
    });
  }

  const meta = normalizeMetadata(document.meta, locale);
  const capabilities = normalizeCapabilities(document.capabilities, locale);
  const compatibility = normalizeCompatibility(document.compatibility, locale);
  const resources = normalizeResources(document.resources, capabilities, locale);
  return { format: UNICODE_ART_EXTENSION_FORMAT, version: 1, meta, capabilities, compatibility, resources };
}

/**
 * 判断清单许可证是否符合官方随包扩展的宽松许可政策。
 *
 * 该函数只表达项目政策，不构成法律意见；规则与 UAF 官方随包资产保持一致。
 */
export function isPermissiveUnicodeArtExtensionLicense(expression: string): boolean {
  return isPermissiveUnicodeArtFontLicense(expression);
}

/**
 * 评估已校验扩展清单是否可由一个宿主加载。
 *
 * 返回全部原因而非首个错误，兼容通过也不等于资源已被读取或被用户信任。
 */
export function evaluateUnicodeArtExtensionCompatibility(
  manifest: UnicodeArtExtensionManifest,
  host: UnicodeArtExtensionHost
): UnicodeArtExtensionCompatibilityResult {
  const reasons: UnicodeArtExtensionCompatibilityReason[] = [];
  const hostVersion = parseSemver(host.coreVersion);
  if (!hostVersion) throw new TypeError('host.coreVersion must be a major.minor.patch version');
  if (!EXTENSION_TARGETS.includes(host.target)) {
    throw new TypeError('unsupported extension host target: ' + String(host.target));
  }

  if (manifest.compatibility.targets && !manifest.compatibility.targets.includes(host.target)) {
    reasons.push({ code: 'targetUnsupported', value: host.target });
  }
  const minimum = parseSemver(manifest.compatibility.minCoreVersion);
  if (!minimum) throw new TypeError('validated manifest must contain a valid minCoreVersion');
  if (compareSemver(hostVersion, minimum) < 0) {
    reasons.push({ code: 'coreVersionTooOld', value: manifest.compatibility.minCoreVersion });
  }
  if (manifest.compatibility.maxCoreVersionExclusive) {
    const maximum = parseSemver(manifest.compatibility.maxCoreVersionExclusive);
    if (!maximum) throw new TypeError('validated manifest must contain a valid maxCoreVersionExclusive');
    if (compareSemver(hostVersion, maximum) >= 0) {
      reasons.push({ code: 'coreVersionTooNew', value: manifest.compatibility.maxCoreVersionExclusive });
    }
  }

  const hostCapabilities = new Set(host.capabilities);
  for (const capability of manifest.capabilities) {
    if (!hostCapabilities.has(capability)) {
      reasons.push({ code: 'capabilityMissing', value: capability });
    }
  }
  return { compatible: reasons.length === 0, reasons };
}

//#endregion

//#region 🟦 规范化实现

function normalizeMetadata(input: unknown, locale: SupportedLocale): UnicodeArtExtensionMetadata {
  const meta = expectRecord(input, locale, 'extension.field.required', { path: 'meta' });
  rejectUnknownFields(meta, ['id', 'name', 'authors', 'description', 'license', 'creation'], 'meta', locale);
  const id = expectString(meta.id, 'meta.id', locale, 3, 128);
  if (!ID_PATTERN.test(id) || !id.includes('.')) {
    throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path: 'meta.id', message: 'must be a reverse-DNS style identifier'
    });
  }

  const normalized: UnicodeArtExtensionMetadata = {
    id,
    name: expectString(meta.name, 'meta.name', locale, 1, 128),
    authors: normalizeAuthors(meta.authors, locale),
    license: normalizeLicense(meta.license, locale)
  };
  if (meta.description !== undefined) {
    normalized.description = expectString(meta.description, 'meta.description', locale, 1, 512);
  }
  if (meta.creation !== undefined) normalized.creation = normalizeCreation(meta.creation, locale);
  return normalized;
}

function normalizeAuthors(input: unknown, locale: SupportedLocale): string[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_AUTHORS) {
    throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path: 'meta.authors', message: 'must contain 1-' + String(MAX_AUTHORS) + ' authors'
    });
  }
  return input.map((value, index) => expectString(value, 'meta.authors[' + String(index) + ']', locale, 1, 128));
}

function normalizeLicense(input: unknown, locale: SupportedLocale): UnicodeArtFontLicense {
  const license = expectRecord(input, locale, 'extension.field.required', { path: 'meta.license' });
  rejectUnknownFields(license, ['expression', 'origin', 'sourceUrl', 'attribution'], 'meta.license', locale);
  const expression = expectString(license.expression, 'meta.license.expression', locale, 1, 256);
  if (!isSpdxExpressionSyntax(expression)) {
    throw extensionError('extension.license.expression', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, { expression });
  }
  if (license.origin !== 'original' && license.origin !== 'derived' && license.origin !== 'imported') {
    throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path: 'meta.license.origin', message: String(license.origin)
    });
  }

  const normalized: UnicodeArtFontLicense = { expression, origin: license.origin };
  if (license.sourceUrl !== undefined) {
    normalized.sourceUrl = normalizeHttpUrl(license.sourceUrl, 'meta.license.sourceUrl', locale);
  }
  if (license.attribution !== undefined) {
    normalized.attribution = expectString(license.attribution, 'meta.license.attribution', locale, 1, 1024);
  }
  if (normalized.origin !== 'original' && (!normalized.sourceUrl || !normalized.attribution)) {
    throw extensionError('extension.license.provenance', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      origin: normalized.origin
    });
  }
  return normalized;
}

function normalizeCreation(input: unknown, locale: SupportedLocale): UnicodeArtFontCreation {
  const creation = expectRecord(input, locale, 'extension.field.invalid', {
    path: 'meta.creation', message: 'must be an object'
  });
  rejectUnknownFields(creation, ['method', 'tool'], 'meta.creation', locale);
  if (creation.method !== 'human' && creation.method !== 'ai-assisted' && creation.method !== 'other') {
    throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path: 'meta.creation.method', message: String(creation.method)
    });
  }
  const normalized: UnicodeArtFontCreation = { method: creation.method };
  if (creation.tool !== undefined) {
    normalized.tool = expectString(creation.tool, 'meta.creation.tool', locale, 1, 128);
  }
  return normalized;
}

function normalizeCapabilities(input: unknown, locale: SupportedLocale): UnicodeArtExtensionCapability[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > RESOURCE_CAPABILITIES.length) {
    throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path: 'capabilities', message: 'must be a non-empty array of supported capabilities'
    });
  }
  const normalized: UnicodeArtExtensionCapability[] = [];
  for (const value of input) {
    if (typeof value !== 'string' || !RESOURCE_CAPABILITIES.includes(value as UnicodeArtExtensionCapability)) {
      throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
        path: 'capabilities', message: 'unsupported capability: ' + String(value)
      });
    }
    const capability = value as UnicodeArtExtensionCapability;
    if (normalized.includes(capability)) {
      throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
        path: 'capabilities', message: 'duplicate capability: ' + capability
      });
    }
    normalized.push(capability);
  }
  return normalized;
}

function normalizeCompatibility(input: unknown, locale: SupportedLocale): UnicodeArtExtensionCompatibility {
  const compatibility = expectRecord(input, locale, 'extension.field.required', { path: 'compatibility' });
  rejectUnknownFields(compatibility, ['minCoreVersion', 'maxCoreVersionExclusive', 'targets'], 'compatibility', locale);
  const minCoreVersion = expectSemver(compatibility.minCoreVersion, 'compatibility.minCoreVersion', locale);
  const normalized: UnicodeArtExtensionCompatibility = { minCoreVersion };
  if (compatibility.maxCoreVersionExclusive !== undefined) {
    const maximum = expectSemver(
      compatibility.maxCoreVersionExclusive,
      'compatibility.maxCoreVersionExclusive',
      locale
    );
    if (compareSemver(parseSemver(minCoreVersion)!, parseSemver(maximum)!) >= 0) {
      throw extensionError('extension.compatibility.version', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
        min: minCoreVersion, max: maximum
      });
    }
    normalized.maxCoreVersionExclusive = maximum;
  }
  if (compatibility.targets !== undefined) {
    if (!Array.isArray(compatibility.targets) || compatibility.targets.length === 0) {
      throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
        path: 'compatibility.targets', message: 'must be a non-empty array when specified'
      });
    }
    const targets: UnicodeArtExtensionTarget[] = [];
    for (const value of compatibility.targets) {
      if (typeof value !== 'string' || !EXTENSION_TARGETS.includes(value as UnicodeArtExtensionTarget)) {
        throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
          path: 'compatibility.targets', message: 'unsupported target: ' + String(value)
        });
      }
      const target = value as UnicodeArtExtensionTarget;
      if (targets.includes(target)) {
        throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
          path: 'compatibility.targets', message: 'duplicate target: ' + target
        });
      }
      targets.push(target);
    }
    normalized.targets = targets;
  }
  return normalized;
}

function normalizeResources(
  input: unknown,
  capabilities: readonly UnicodeArtExtensionCapability[],
  locale: SupportedLocale
): UnicodeArtExtensionResource[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_RESOURCES) {
    throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path: 'resources', message: 'must contain 1-' + String(MAX_RESOURCES) + ' resources'
    });
  }
  const ids = new Set<string>();
  return input.map((value, index) => {
    const fieldPath = 'resources[' + String(index) + ']';
    const resource = expectRecord(value, locale, 'extension.field.invalid', {
      path: fieldPath, message: 'must be an object'
    });
    rejectUnknownFields(resource, ['id', 'kind', 'path', 'name', 'description'], fieldPath, locale);
    const id = expectString(resource.id, fieldPath + '.id', locale, 1, 64);
    if (!RESOURCE_ID_PATTERN.test(id) || ids.has(id)) {
      throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
        path: fieldPath + '.id',
        message: ids.has(id) ? 'duplicate resource id: ' + id : 'must be a lowercase resource identifier'
      });
    }
    ids.add(id);
    if (typeof resource.kind !== 'string' || !RESOURCE_CAPABILITIES.includes(resource.kind as UnicodeArtExtensionCapability)) {
      throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
        path: fieldPath + '.kind', message: 'unsupported resource kind: ' + String(resource.kind)
      });
    }
    const kind = resource.kind as UnicodeArtExtensionCapability;
    if (!capabilities.includes(kind)) {
      throw extensionError('extension.resource.capability', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, { kind, id });
    }

    const path = normalizeResourcePath(resource.path, kind, fieldPath, locale);
    const normalized: UnicodeArtExtensionResource = { id, kind, path };
    if (resource.name !== undefined) normalized.name = expectString(resource.name, fieldPath + '.name', locale, 1, 128);
    if (resource.description !== undefined) {
      normalized.description = expectString(resource.description, fieldPath + '.description', locale, 1, 512);
    }
    return normalized;
  });
}

function normalizeResourcePath(
  input: unknown,
  kind: UnicodeArtExtensionCapability,
  fieldPath: string,
  locale: SupportedLocale
): string {
  const value = expectString(input, fieldPath + '.path', locale, 1, 256);
  const suffix = kind === 'semantic-document' ? '.uadoc.json' : '.uafont.json';
  const segments = value.split('/');
  const invalid = value.startsWith('/')
    || value.includes('\\')
    || value.includes('//')
    || containsAsciiControlCharacter(value)
    || segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
    || !value.endsWith(suffix);
  if (invalid) {
    throw extensionError('extension.resource.path', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path: value, suffix
    });
  }
  return value;
}

//#endregion

//#region 🟦 基础校验工具

function expectRecord(
  input: unknown,
  locale: SupportedLocale,
  key: ExtensionMessageKey,
  params: MessageParams = {}
): Record<string, unknown> {
  if (!isRecord(input)) {
    throw extensionError(key, ErrorCode.EXTENSION_MANIFEST_INVALID, locale, params);
  }
  return input;
}

function rejectUnknownFields(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  locale: SupportedLocale
): void {
  const unknown = Object.keys(record).find((field) => !allowed.includes(field));
  if (unknown) {
    throw extensionError('extension.document.unknownField', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path, field: unknown
    });
  }
}

function expectString(
  input: unknown,
  path: string,
  locale: SupportedLocale,
  minLength: number,
  maxLength: number
): string {
  if (typeof input !== 'string' || input.trim().length < minLength) {
    throw extensionError('extension.field.required', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, { path });
  }
  const value = input.trim();
  if (value.length > maxLength) {
    throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path, message: 'must be at most ' + String(maxLength) + ' characters'
    });
  }
  return value;
}

function expectSemver(input: unknown, path: string, locale: SupportedLocale): string {
  const value = expectString(input, path, locale, 5, 32);
  if (!parseSemver(value)) {
    throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path, message: 'must be a major.minor.patch version'
    });
  }
  return value;
}

function normalizeHttpUrl(input: unknown, path: string, locale: SupportedLocale): string {
  const value = expectString(input, path, locale, 1, 2048);
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('unsupported protocol');
    return url.toString();
  } catch {
    throw extensionError('extension.field.invalid', ErrorCode.EXTENSION_MANIFEST_INVALID, locale, {
      path, message: 'must be an HTTP(S) URL'
    });
  }
}

function parseSemver(value: string): [number, number, number] | undefined {
  const match = SEMVER_PATTERN.exec(value);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : undefined;
}

function compareSemver(left: [number, number, number], right: [number, number, number]): number {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

/** 判断路径中是否包含 JSON / 文件系统不应接受的 ASCII 控制字符。 */
function containsAsciiControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && codePoint <= 0x1f;
  });
}

type ExtensionMessageKey = Extract<MessageKey, 'extension.' | string>;

function extensionError(
  key: ExtensionMessageKey,
  code: ErrorCode,
  locale: SupportedLocale,
  params: MessageParams
): UnicodeArtError {
  return new UnicodeArtError(translateCoreMessage(key, params, locale), code, {
    details: params,
    messageKey: key,
    messageParams: params,
    locale
  });
}

//#endregion
