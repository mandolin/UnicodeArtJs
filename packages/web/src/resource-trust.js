/**
 * ============================================================================
 * 🟦 UnicodeArtJs Web 资源信任链校验
 * ============================================================================
 *
 * 🔶 模块职责
 * 在浏览器中复核同源 gallery 的 resource-lock、resource-revocations 与
 * resource-signature。该模块只使用 Web Crypto 和声明式 JSON，不新增
 * 第三方依赖，也不安装、不执行资源。
 *
 * 🔶 安全边界
 * - 只验证 `unicode-art-gallery-resource-lock@1` 和签名 envelope v1。
 * - `maintainer-signed` 必须通过 Ed25519 真签名验证后才允许导入。
 * - Web Crypto 或 Ed25519 不可用时，状态降级为 `invalid-signature`。
 * - 签名只证明发布链未漂移，不替代许可证和来源审计。
 *
 * @lang zh-CN 浏览器端资源信任链校验模块；用于 Web 资源发现页在导入前复核 hash lock、撤回和维护者签名。
 * @lang en Browser-side resource trust-chain verifier; checks hash lock, revocations, and maintainer signatures before Web resource import.
 *
 * @module @unicode-art/web/resource-trust
 * @license MIT
 * ============================================================================
 */

import { sha256HexFromArrayBuffer } from './resource-discovery.js';

//#region 🟩 状态常量

/**
 * Web 资源导入确认首版使用的信任状态。
 *
 * @lang zh-CN 这些状态直接映射到资源发现页的导入开关；只有 `maintainer-signed` 可进入确认导入。
 * @lang en These statuses directly drive the resource-discovery import gate; only `maintainer-signed` may enter the confirmation import flow.
 * @constant {string[]}
 * @readonly
 */
export const UNICODE_ART_RESOURCE_TRUST_STATUSES = Object.freeze([
  'unsigned-draft',
  'maintainer-signed',
  'invalid-signature',
  'expired',
  'revoked-key',
]);

/**
 * Web 资源导入确认首版使用的资源撤回状态。
 *
 * @lang zh-CN 资源级撤回优先于缓存和导入；被撤回资源只能查看事实，不可导入。
 * @lang en Resource-level revocation wins over cache and import; revoked resources are visible as facts but cannot be imported.
 * @constant {string[]}
 * @readonly
 */
export const UNICODE_ART_RESOURCE_REVOCATION_STATUSES = Object.freeze([
  'not-revoked',
  'revoked-resource',
]);

const allowedKinds = new Set(['unicode-art-font', 'semantic-document']);
const allowedKeyStatuses = new Set(['active', 'retired', 'revoked', 'compromised']);
const textEncoder = new TextEncoder();

//#endregion

//#region 🟩 基础工具

function fail(message) {
  throw new Error(message);
}

function asRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} 必须是对象`);
  }
  return value;
}

function parseJson(source, label) {
  try {
    return JSON.parse(source);
  } catch (error) {
    fail(`${label} 不是合法 JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    fail(`${label} 必须使用 YYYY-MM-DD`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(`${label} 不是有效日期`);
  }
}

function assertIsoDateTime(value, label) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value)) || !value.endsWith('Z')) {
    fail(`${label} 必须是 UTC ISO 日期时间`);
  }
}

function assertSha256(value, label) {
  if (!/^[a-f0-9]{64}$/.test(value || '')) {
    fail(`${label} 必须是 64 位小写 sha256`);
  }
}

function assertRelativeSidecarPath(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${label} 必须是非空相对路径`);
  }
  if (value.includes('\\') || value.includes(':') || value.startsWith('/') || value.startsWith('//')) {
    fail(`${label} 不能是绝对路径、URL 或平台路径`);
  }
  if (value.split('/').includes('..')) {
    fail(`${label} 不能包含 .. 路径段`);
  }
  return value;
}

function toArrayBuffer(value) {
  if (value instanceof ArrayBuffer) return value;
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  if (typeof value === 'string') return textEncoder.encode(value).buffer;
  fail('字节输入必须是 ArrayBuffer、TypedArray 或字符串');
}

function byteLength(value) {
  return toArrayBuffer(value).byteLength;
}

function canonicalizeJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('canonical JSON 不支持非有限数字');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`,
    ).join(',')}}`;
  }
  fail('canonical JSON 不支持 undefined/function/symbol');
}

async function sha256HexFromBytes(bytes) {
  return sha256HexFromArrayBuffer(toArrayBuffer(bytes));
}

async function canonicalSha256(value) {
  return sha256HexFromBytes(textEncoder.encode(canonicalizeJson(value)));
}

function fromBase64Url(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    fail(`${label} 必须是 base64url 无 padding 字符串`);
  }
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function classifyTrustError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('已过期') || message.includes('尚未生效') || message.includes('晚于验证时间')) {
    return 'expired';
  }
  if (message.includes('revoked') || message.includes('compromised') || message.includes('已不可用')) {
    return 'revoked-key';
  }
  return 'invalid-signature';
}

//#endregion

//#region 🟩 解析入口

/**
 * 解析资源锁文件。
 *
 * @lang zh-CN 解析 `resource-lock.json` 文本，并做最小格式断言；深度 hash 与资源一致性由信任验证入口完成。
 * @lang en Parses `resource-lock.json` text and performs minimal shape assertions; deep hash and resource checks are handled by the trust verifier.
 *
 * @param {string} source - <lang key="web.resourceTrust.lock.param.source"><zh-CN>资源锁 JSON 文本。</zh-CN><en>Resource-lock JSON text.</en></lang>
 * @returns {Object} <lang key="web.resourceTrust.lock.returns"><zh-CN>资源锁对象。</zh-CN><en>Resource-lock object.</en></lang>
 */
export function parseUnicodeArtResourceLock(source) {
  const lock = asRecord(parseJson(source, 'resource-lock.json'), 'resource-lock');
  if (lock.format !== 'unicode-art-gallery-resource-lock' || lock.version !== 1) {
    fail('resource-lock 必须使用 unicode-art-gallery-resource-lock@1');
  }
  return lock;
}

/**
 * 解析资源撤回列表。
 *
 * @lang zh-CN 解析 `resource-revocations.json`，供导入确认层判断资源或 key 是否应禁用。
 * @lang en Parses `resource-revocations.json` so the import confirmation gate can disable revoked resources or keys.
 *
 * @param {string} source - <lang key="web.resourceTrust.revocations.param.source"><zh-CN>资源撤回 JSON 文本。</zh-CN><en>Resource-revocation JSON text.</en></lang>
 * @returns {Object} <lang key="web.resourceTrust.revocations.returns"><zh-CN>资源撤回对象。</zh-CN><en>Resource-revocation object.</en></lang>
 */
export function parseUnicodeArtResourceRevocations(source) {
  const revocations = asRecord(parseJson(source, 'resource-revocations.json'), 'resource-revocations');
  if (revocations.format !== 'unicode-art-gallery-resource-revocations' || revocations.version !== 1) {
    fail('resource-revocations 必须使用 unicode-art-gallery-resource-revocations@1');
  }
  return revocations;
}

/**
 * 解析资源签名 envelope。
 *
 * @lang zh-CN 解析 `resource-signature.json`；签名是否真实有效由异步信任验证入口判断。
 * @lang en Parses `resource-signature.json`; the async trust verifier determines whether the signature is actually valid.
 *
 * @param {string} source - <lang key="web.resourceTrust.signature.param.source"><zh-CN>资源签名 JSON 文本。</zh-CN><en>Resource-signature JSON text.</en></lang>
 * @returns {Object} <lang key="web.resourceTrust.signature.returns"><zh-CN>资源签名 envelope。</zh-CN><en>Resource-signature envelope.</en></lang>
 */
export function parseUnicodeArtResourceSignature(source) {
  const signature = asRecord(parseJson(source, 'resource-signature.json'), 'resource-signature');
  if (signature.format !== 'unicode-art-gallery-resource-signature' || signature.version !== 1) {
    fail('resource-signature 必须使用 unicode-art-gallery-resource-signature@1');
  }
  return signature;
}

//#endregion

//#region 🟩 信任链验证

function normalizeResourceForLock(resource) {
  return {
    id: resource.id,
    kind: resource.kind,
    source: resource.source,
    size: resource.size,
    sha256: resource.sha256,
  };
}

function assertResourceRecord(resource, label) {
  asRecord(resource, label);
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(resource.id || '')) {
    fail(`${label}.id 必须是稳定的小写短横线 ID`);
  }
  if (!allowedKinds.has(resource.kind)) {
    fail(`${label}.kind 不在允许范围内: ${resource.kind}`);
  }
  assertRelativeSidecarPath(resource.source, `${label}.source`);
  if (!Number.isInteger(resource.size) || resource.size <= 0) {
    fail(`${label}.size 必须是正整数`);
  }
  assertSha256(resource.sha256, `${label}.sha256`);
}

async function assertFileHash(bytes, expected, label) {
  asRecord(expected, label);
  if (!Number.isInteger(expected.size) || expected.size <= 0) {
    fail(`${label}.size 必须是正整数`);
  }
  assertSha256(expected.sha256, `${label}.sha256`);
  const actualSize = byteLength(bytes);
  if (actualSize !== expected.size) {
    fail(`${label}.size 与实际文件大小不一致`);
  }
  const actualSha256 = await sha256HexFromBytes(bytes);
  if (actualSha256 !== expected.sha256) {
    fail(`${label}.sha256 与实际文件内容不一致`);
  }
  return Object.freeze({ size: actualSize, sha256: actualSha256 });
}

async function assertResourceLock(manifest, lock, bytes) {
  assertDate(lock.lockedAt, 'resource-lock.lockedAt');
  if (lock.canonicalization !== 'jcs-rfc8785') fail('resource-lock.canonicalization 必须是 jcs-rfc8785');
  if (lock.digestAlgorithm !== 'sha256') fail('resource-lock.digestAlgorithm 必须是 sha256');
  if (lock.manifest?.path !== 'resource-manifest.json') {
    fail('resource-lock.manifest.path 当前必须指向 resource-manifest.json');
  }
  await assertFileHash(bytes.manifest, lock.manifest, 'resource-lock.manifest');
  await assertFileHash(bytes.revocations, lock.revocations, 'resource-lock.revocations');

  if (!Array.isArray(lock.resources) || lock.resources.length === 0) {
    fail('resource-lock.resources 必须是非空数组');
  }
  if (!Array.isArray(manifest.resources) || manifest.resources.length !== lock.resources.length) {
    fail('resource-lock.resources 必须与 manifest.resources 数量一致');
  }

  const expectedResources = manifest.resources.map(normalizeResourceForLock);
  expectedResources.forEach((resource) => assertResourceRecord(resource, `manifest.resources.${resource.id}`));
  lock.resources.forEach((resource) => assertResourceRecord(resource, `resource-lock.resources.${resource.id || '<unknown>'}`));
  if (JSON.stringify(lock.resources) !== JSON.stringify(expectedResources)) {
    fail('resource-lock.resources 必须逐项锁定 manifest 中的 id/kind/source/size/sha256');
  }

  const totals = expectedResources.reduce((accumulator, resource) => {
    accumulator.resources += 1;
    accumulator.bytes += resource.size;
    if (resource.kind === 'unicode-art-font') accumulator.unicodeArtFonts += 1;
    if (resource.kind === 'semantic-document') accumulator.semanticDocuments += 1;
    return accumulator;
  }, { resources: 0, bytes: 0, unicodeArtFonts: 0, semanticDocuments: 0 });
  if (JSON.stringify(lock.totals) !== JSON.stringify(totals)) {
    fail('resource-lock.totals 与资源清单统计不一致');
  }
  return Object.freeze({ resources: Object.freeze(expectedResources), totals: Object.freeze(totals) });
}

function assertRevocations(revocations) {
  assertDate(revocations.reviewedAt, 'resource-revocations.reviewedAt');
  asRecord(revocations.policy, 'resource-revocations.policy');
  if (revocations.policy.emptyMeansNoKnownRevocations !== true) {
    fail('resource-revocations.policy.emptyMeansNoKnownRevocations 必须为 true');
  }
  if (revocations.policy.revocationsApplyBeforeRecommendation !== true) {
    fail('resource-revocations.policy.revocationsApplyBeforeRecommendation 必须为 true');
  }
  if (!Array.isArray(revocations.revocations)) fail('resource-revocations.revocations 必须是数组');
}

async function verifySignatureEnvelope(signatureEnvelope, lock, lockBytes, verificationDate) {
  asRecord(signatureEnvelope.subject, 'resource-signature.subject');
  if (signatureEnvelope.subject.schema !== 'unicode-art-gallery-resource-lock@1') {
    fail('resource-signature.subject.schema 必须是 unicode-art-gallery-resource-lock@1');
  }
  if (signatureEnvelope.subject.lock !== 'resource-lock.json') {
    fail('resource-signature.subject.lock 当前必须是 resource-lock.json');
  }
  if (signatureEnvelope.subject.canonicalization !== 'jcs-rfc8785') {
    fail('resource-signature.subject.canonicalization 必须是 jcs-rfc8785');
  }
  if (signatureEnvelope.subject.digestAlgorithm !== 'sha256') {
    fail('resource-signature.subject.digestAlgorithm 必须是 sha256');
  }
  if (await sha256HexFromBytes(lockBytes) !== signatureEnvelope.subject.lockSha256) {
    fail('resource-signature.subject.lockSha256 与 resource-lock.json 实际内容不一致');
  }
  const payloadSha256 = await canonicalSha256(lock);
  if (payloadSha256 !== signatureEnvelope.subject.payloadSha256) {
    fail('resource-signature.subject.payloadSha256 与 canonical resource-lock 不一致');
  }

  asRecord(signatureEnvelope.trust, 'resource-signature.trust');
  const status = signatureEnvelope.trust.status;
  if (status === 'unsigned-draft') {
    if (signatureEnvelope.signature !== null) fail('unsigned-draft resource-signature.signature 必须为 null');
    return Object.freeze({
      status,
      verified: false,
      importAllowed: false,
      payloadSha256,
      message: '当前资源发现信任链是 unsigned-draft；hash lock 已验证，但还不是维护者签名。',
    });
  }

  if (status !== 'maintainer-signed') {
    fail(`resource-signature.trust.status 不在允许范围内: ${status}`);
  }
  asRecord(signatureEnvelope.signature, 'resource-signature.signature');
  if (signatureEnvelope.signature.role !== 'maintainer') fail('resource-signature.signature.role 必须是 maintainer');
  if (signatureEnvelope.signature.algorithm !== 'ed25519') fail('resource-signature.signature.algorithm 必须是 ed25519');
  if (signatureEnvelope.signature.payloadSha256 !== payloadSha256) {
    fail('resource-signature.signature.payloadSha256 与 canonical payload 不一致');
  }
  assertIsoDateTime(signatureEnvelope.signature.signedAt, 'resource-signature.signature.signedAt');
  assertIsoDateTime(signatureEnvelope.signature.expiresAt, 'resource-signature.signature.expiresAt');
  const signedAt = new Date(signatureEnvelope.signature.signedAt);
  const expiresAt = new Date(signatureEnvelope.signature.expiresAt);
  if (signedAt > verificationDate) fail('resource-signature.signature.signedAt 晚于验证时间');
  if (expiresAt <= verificationDate) fail('resource-signature.signature.expiresAt 已过期');

  if (!Array.isArray(signatureEnvelope.keyring) || signatureEnvelope.keyring.length === 0) {
    fail('maintainer-signed 必须提供 keyring');
  }
  const key = signatureEnvelope.keyring.find((item) => item.keyId === signatureEnvelope.signature.keyId);
  if (!key) fail(`keyring 缺少签名 keyId: ${signatureEnvelope.signature.keyId}`);
  if (key.role !== 'maintainer' || key.algorithm !== 'ed25519') fail('签名 key 必须是 maintainer ed25519');
  if (!allowedKeyStatuses.has(key.status)) fail(`签名 key 状态不在允许范围内: ${key.status}`);
  if (key.status === 'revoked' || key.status === 'compromised') fail(`签名 key 已不可用: ${key.status}`);
  if (key.publicKeyEncoding !== 'spki-base64url') fail('签名 key 当前必须使用 spki-base64url');
  assertIsoDateTime(key.validFrom, 'resource-signature.key.validFrom');
  assertIsoDateTime(key.validUntil, 'resource-signature.key.validUntil');
  const keyValidFrom = new Date(key.validFrom);
  const keyValidUntil = new Date(key.validUntil);
  if (keyValidFrom > verificationDate) fail('签名 key 尚未生效');
  if (keyValidUntil <= verificationDate) fail('签名 key 已过期');

  const subtle = globalThis.crypto?.subtle;
  if (!subtle) fail('当前浏览器无法使用 Web Crypto 验证 Ed25519 签名');

  let publicKey;
  try {
    publicKey = await subtle.importKey(
      'spki',
      fromBase64Url(key.publicKey, 'resource-signature.key.publicKey'),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
  } catch (error) {
    fail(`当前浏览器无法导入 Ed25519 公钥: ${error instanceof Error ? error.message : String(error)}`);
  }

  const verified = await subtle.verify(
    { name: 'Ed25519' },
    publicKey,
    fromBase64Url(signatureEnvelope.signature.value, 'resource-signature.signature.value'),
    textEncoder.encode(canonicalizeJson(lock)),
  );
  if (!verified) fail('resource-signature.signature.value 无法验证 canonical resource-lock');

  return Object.freeze({
    status,
    verified: true,
    importAllowed: true,
    payloadSha256,
    keyId: signatureEnvelope.signature.keyId,
    expiresAt: signatureEnvelope.signature.expiresAt,
    message: '维护者签名验证通过；仍需查看许可证和来源。',
  });
}

/**
 * 验证浏览器端资源信任链。
 *
 * @lang zh-CN 复核 manifest、lock、revocations 和 signature 的一致性；验证失败时返回不可导入摘要而不是抛出到 UI。
 * @lang en Verifies manifest, lock, revocations, and signature consistency; failures return a non-importable summary instead of escaping into the UI.
 *
 * @param {Object} input - <lang key="web.resourceTrust.verify.param.input"><zh-CN>包含已解析 sidecar 和原始字节的校验输入。</zh-CN><en>Verification input containing parsed sidecars and original bytes.</en></lang>
 * @returns {Promise<Object>} <lang key="web.resourceTrust.verify.returns"><zh-CN>冻结后的信任摘要。</zh-CN><en>Frozen trust summary.</en></lang>
 */
export async function verifyUnicodeArtResourceTrust(input) {
  const verificationDate = input.verificationDate || new Date();
  const bytes = {
    manifest: input.manifestBytes,
    lock: input.lockBytes,
    revocations: input.revocationsBytes,
  };

  try {
    if (input.manifest.format !== 'unicode-art-gallery-resource-manifest' || input.manifest.version !== 1) {
      fail('resource-manifest 必须使用 unicode-art-gallery-resource-manifest@1');
    }
    const lockSummary = await assertResourceLock(input.manifest, input.lock, bytes);
    assertRevocations(input.revocations);
    const signatureSummary = await verifySignatureEnvelope(
      input.signatureEnvelope,
      input.lock,
      bytes.lock,
      verificationDate,
    );

    return Object.freeze({
      ...signatureSummary,
      resources: lockSummary.resources.length,
      bytes: lockSummary.totals.bytes,
      revocations: input.revocations.revocations.length,
      error: '',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Object.freeze({
      status: classifyTrustError(error),
      verified: false,
      importAllowed: false,
      resources: Array.isArray(input.manifest?.resources) ? input.manifest.resources.length : 0,
      bytes: 0,
      revocations: Array.isArray(input.revocations?.revocations) ? input.revocations.revocations.length : 0,
      payloadSha256: '',
      message,
      error: message,
    });
  }
}

/**
 * 获取单个资源的撤回状态。
 *
 * @lang zh-CN 根据撤回列表判断资源是否被撤回；撤回资源不可导入，即使文件 hash 仍匹配。
 * @lang en Determines whether a resource is revoked; revoked resources cannot be imported even when file hashes still match.
 *
 * @param {Object} revocations - <lang key="web.resourceTrust.resourceRevoked.param.revocations"><zh-CN>已解析的撤回列表。</zh-CN><en>Parsed revocation list.</en></lang>
 * @param {string} resourceId - <lang key="web.resourceTrust.resourceRevoked.param.resourceId"><zh-CN>资源 ID。</zh-CN><en>Resource ID.</en></lang>
 * @returns {Object} <lang key="web.resourceTrust.resourceRevoked.returns"><zh-CN>冻结后的资源撤回摘要。</zh-CN><en>Frozen resource revocation summary.</en></lang>
 */
export function getUnicodeArtResourceRevocationStatus(revocations, resourceId) {
  const item = Array.isArray(revocations?.revocations)
    ? revocations.revocations.find((entry) => entry.resourceId === resourceId)
    : null;
  if (!item) {
    return Object.freeze({ status: 'not-revoked', revoked: false, message: '' });
  }
  return Object.freeze({
    status: 'revoked-resource',
    revoked: true,
    reason: item.reason || 'other',
    replacedBy: item.replacedBy || '',
    message: item.message || {},
  });
}

//#endregion
