#!/usr/bin/env node

/**
 * 校验实验性静态资源发现信任链。
 *
 * 本脚本只读取仓库内 gallery sidecar：resource-lock、resource-revocations
 * 和 resource-signature。它验证 hash lock、撤回列表和签名 envelope 形状；
 * 当前公开画廊允许明确的 unsigned-draft，但不会把它误报为已签名。
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const defaultGalleryRoot = path.join(repositoryRoot, 'packages', 'web', 'public', 'gallery');
const defaultGalleryRelativeRoot = 'packages/web/public/gallery';
const defaultFixtureRoot = path.join(repositoryRoot, 'fixtures', 'resource-trust');
const allowedKinds = new Set(['unicode-art-font', 'semantic-document']);
const allowedRevocationReasons = new Set(['license', 'provenance', 'quality', 'security', 'replaced', 'other']);
const allowedKeyStatuses = new Set(['active', 'retired', 'revoked', 'compromised']);

// 测试矩阵使用固定时间，避免 fixture 随真实日期流逝而误报。
const fixtureVerificationDate = new Date('2026-07-20T00:00:00.000Z');

function fail(message) {
  throw new Error(message);
}

function normalizeSlash(value) {
  return value.replace(/\\/g, '/');
}

function projectRelative(fullPath) {
  return normalizeSlash(path.relative(repositoryRoot, fullPath));
}

function readJson(fullPath, label) {
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    fail(`${label} 不是合法 JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function readBytes(fullPath) {
  return fs.readFileSync(fullPath);
}

function sha256Hex(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function assertSha256(value, label) {
  if (!/^[a-f0-9]{64}$/.test(value || '')) {
    fail(`${label} 必须是 64 位小写 sha256。`);
  }
}

function assertDate(value, label) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    fail(`${label} 必须使用 YYYY-MM-DD。`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    fail(`${label} 不是有效日期。`);
  }
}

function assertIsoDateTime(value, label) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value)) || !value.endsWith('Z')) {
    fail(`${label} 必须是 UTC ISO 日期时间。`);
  }
}

function assertRecord(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${label} 必须是对象。`);
  }
}

function assertRelativeSidecarPath(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    fail(`${label} 必须是非空相对路径。`);
  }
  if (value.includes('\\') || value.includes(':') || value.startsWith('/') || value.startsWith('//')) {
    fail(`${label} 不能是绝对路径、URL 或平台路径。`);
  }
  if (value.split('/').includes('..')) {
    fail(`${label} 不能包含 .. 路径段。`);
  }
  return value;
}

function resolveGalleryFile(galleryRoot, relativePath, label) {
  const safePath = assertRelativeSidecarPath(relativePath, label);
  const candidate = path.resolve(galleryRoot, ...safePath.split('/'));
  const relative = path.relative(galleryRoot, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    fail(`${label} 越出了 gallery 根目录。`);
  }
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    fail(`${label} 指向的文件不存在: ${relativePath}`);
  }
  return candidate;
}

function canonicalizeJson(value) {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) fail('canonical JSON 不支持非有限数字。');
    return JSON.stringify(Object.is(value, -0) ? 0 : value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalizeJson(item)).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalizeJson(value[key])}`
    ).join(',')}}`;
  }
  fail('canonical JSON 不支持 undefined/function/symbol。');
}

function canonicalSha256(jsonValue) {
  return sha256Hex(Buffer.from(canonicalizeJson(jsonValue), 'utf8'));
}

function assertFileHash(filePath, expected, label) {
  assertRecord(expected, label);
  if (!Number.isInteger(expected.size) || expected.size <= 0) {
    fail(`${label}.size 必须是正整数。`);
  }
  assertSha256(expected.sha256, `${label}.sha256`);
  const bytes = readBytes(filePath);
  if (bytes.length !== expected.size) {
    fail(`${label}.size 与实际文件大小不一致。`);
  }
  const actualSha256 = sha256Hex(bytes);
  if (actualSha256 !== expected.sha256) {
    fail(`${label}.sha256 与实际文件内容不一致。`);
  }
  return { size: bytes.length, sha256: actualSha256 };
}

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
  assertRecord(resource, label);
  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(resource.id || '')) {
    fail(`${label}.id 必须是稳定的小写短横线 ID。`);
  }
  if (!allowedKinds.has(resource.kind)) {
    fail(`${label}.kind 不在允许范围内: ${resource.kind}`);
  }
  assertRelativeSidecarPath(resource.source, `${label}.source`);
  if (!Number.isInteger(resource.size) || resource.size <= 0) {
    fail(`${label}.size 必须是正整数。`);
  }
  assertSha256(resource.sha256, `${label}.sha256`);
}

function assertResourceLock(galleryRoot, manifest, lock, revocationsPath) {
  assertRecord(lock, 'resource-lock');
  if (lock.format !== 'unicode-art-gallery-resource-lock' || lock.version !== 1) {
    fail('resource-lock 必须使用 unicode-art-gallery-resource-lock@1。');
  }
  assertDate(lock.lockedAt, 'resource-lock.lockedAt');
  if (lock.canonicalization !== 'jcs-rfc8785') {
    fail('resource-lock.canonicalization 必须是 jcs-rfc8785。');
  }
  if (lock.digestAlgorithm !== 'sha256') {
    fail('resource-lock.digestAlgorithm 必须是 sha256。');
  }

  const manifestPath = resolveGalleryFile(galleryRoot, lock.manifest?.path, 'resource-lock.manifest.path');
  if (path.basename(manifestPath) !== 'resource-manifest.json') {
    fail('resource-lock.manifest.path 当前必须指向 resource-manifest.json。');
  }
  assertFileHash(manifestPath, lock.manifest, 'resource-lock.manifest');
  assertFileHash(revocationsPath, lock.revocations, 'resource-lock.revocations');

  if (!Array.isArray(lock.resources) || lock.resources.length === 0) {
    fail('resource-lock.resources 必须是非空数组。');
  }
  if (!Array.isArray(manifest.resources) || manifest.resources.length !== lock.resources.length) {
    fail('resource-lock.resources 必须与 manifest.resources 数量一致。');
  }

  const expectedResources = manifest.resources.map(normalizeResourceForLock);
  for (const resource of expectedResources) {
    assertResourceRecord(resource, `manifest.resources.${resource.id}`);
  }
  for (const resource of lock.resources) {
    assertResourceRecord(resource, `resource-lock.resources.${resource.id || '<unknown>'}`);
  }

  if (JSON.stringify(lock.resources) !== JSON.stringify(expectedResources)) {
    fail('resource-lock.resources 必须逐项锁定 manifest 中的 id/kind/source/size/sha256。');
  }

  const totals = expectedResources.reduce((accumulator, resource) => {
    accumulator.resources += 1;
    accumulator.bytes += resource.size;
    if (resource.kind === 'unicode-art-font') accumulator.unicodeArtFonts += 1;
    if (resource.kind === 'semantic-document') accumulator.semanticDocuments += 1;
    return accumulator;
  }, { resources: 0, bytes: 0, unicodeArtFonts: 0, semanticDocuments: 0 });
  if (JSON.stringify(lock.totals) !== JSON.stringify(totals)) {
    fail('resource-lock.totals 与资源清单统计不一致。');
  }

  return {
    manifestPath,
    resources: expectedResources,
    totals,
  };
}

function assertRevocations(revocations, manifestResources) {
  assertRecord(revocations, 'resource-revocations');
  if (revocations.format !== 'unicode-art-gallery-resource-revocations' || revocations.version !== 1) {
    fail('resource-revocations 必须使用 unicode-art-gallery-resource-revocations@1。');
  }
  assertDate(revocations.reviewedAt, 'resource-revocations.reviewedAt');
  assertRecord(revocations.policy, 'resource-revocations.policy');
  if (revocations.policy.emptyMeansNoKnownRevocations !== true) {
    fail('resource-revocations.policy.emptyMeansNoKnownRevocations 必须为 true。');
  }
  if (revocations.policy.resourceIdWithoutVersionRevokesAllVersions !== true) {
    fail('resource-revocations.policy.resourceIdWithoutVersionRevokesAllVersions 必须为 true。');
  }
  if (revocations.policy.revocationsApplyBeforeRecommendation !== true) {
    fail('resource-revocations.policy.revocationsApplyBeforeRecommendation 必须为 true。');
  }
  if (!Array.isArray(revocations.revocations)) {
    fail('resource-revocations.revocations 必须是数组。');
  }

  const activeResourceIds = new Set(manifestResources.map((resource) => resource.id));
  const seenRevocations = new Set();
  for (const item of revocations.revocations) {
    assertRecord(item, 'resource-revocations.revocations[]');
    if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(item.resourceId || '')) {
      fail('撤回项 resourceId 必须是稳定的小写短横线 ID。');
    }
    const key = `${item.resourceId}@${item.version || '*'}`;
    if (seenRevocations.has(key)) {
      fail(`撤回列表存在重复项: ${key}`);
    }
    seenRevocations.add(key);
    assertDate(item.revokedAt, `${item.resourceId}.revokedAt`);
    if (!allowedRevocationReasons.has(item.reason)) {
      fail(`${item.resourceId}.reason 不在允许范围内: ${item.reason}`);
    }
    assertRecord(item.message, `${item.resourceId}.message`);
    if (typeof item.message['zh-CN'] !== 'string' || item.message['zh-CN'].length === 0) {
      fail(`${item.resourceId}.message.zh-CN 必须是非空字符串。`);
    }
    if (typeof item.message['en-US'] !== 'string' || item.message['en-US'].length === 0) {
      fail(`${item.resourceId}.message.en-US 必须是非空字符串。`);
    }
    if (item.replacedBy !== undefined && !/^[a-z0-9][a-z0-9-]{1,63}$/.test(item.replacedBy)) {
      fail(`${item.resourceId}.replacedBy 必须是稳定的小写短横线 ID。`);
    }
    if (activeResourceIds.has(item.resourceId)) {
      fail(`已撤回资源仍在当前 manifest 中作为活跃资源发布: ${item.resourceId}`);
    }
  }
}

function fromBase64Url(value, label) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
    fail(`${label} 必须是 base64url 无 padding 字符串。`);
  }
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

function assertSignatureEnvelope(galleryRoot, signatureEnvelope, lock, options = {}) {
  const verificationDate = options.verificationDate || new Date();

  assertRecord(signatureEnvelope, 'resource-signature');
  if (signatureEnvelope.format !== 'unicode-art-gallery-resource-signature' || signatureEnvelope.version !== 1) {
    fail('resource-signature 必须使用 unicode-art-gallery-resource-signature@1。');
  }
  assertRecord(signatureEnvelope.subject, 'resource-signature.subject');
  if (signatureEnvelope.subject.schema !== 'unicode-art-gallery-resource-lock@1') {
    fail('resource-signature.subject.schema 必须是 unicode-art-gallery-resource-lock@1。');
  }
  if (signatureEnvelope.subject.lock !== 'resource-lock.json') {
    fail('resource-signature.subject.lock 当前必须是 resource-lock.json。');
  }
  if (signatureEnvelope.subject.canonicalization !== 'jcs-rfc8785') {
    fail('resource-signature.subject.canonicalization 必须是 jcs-rfc8785。');
  }
  if (signatureEnvelope.subject.digestAlgorithm !== 'sha256') {
    fail('resource-signature.subject.digestAlgorithm 必须是 sha256。');
  }

  const lockPath = resolveGalleryFile(galleryRoot, signatureEnvelope.subject.lock, 'resource-signature.subject.lock');
  const lockBytes = readBytes(lockPath);
  const actualLockSha256 = sha256Hex(lockBytes);
  if (actualLockSha256 !== signatureEnvelope.subject.lockSha256) {
    fail('resource-signature.subject.lockSha256 与 resource-lock.json 实际内容不一致。');
  }
  const payloadSha256 = canonicalSha256(lock);
  if (payloadSha256 !== signatureEnvelope.subject.payloadSha256) {
    fail('resource-signature.subject.payloadSha256 与 canonical resource-lock 不一致。');
  }

  assertRecord(signatureEnvelope.trust, 'resource-signature.trust');
  const status = signatureEnvelope.trust.status;
  if (status === 'unsigned-draft') {
    if (signatureEnvelope.signature !== null) {
      fail('unsigned-draft resource-signature.signature 必须为 null。');
    }
    assertRecord(signatureEnvelope.trust.unsignedReason, 'resource-signature.trust.unsignedReason');
    if (!Array.isArray(signatureEnvelope.keyring)) {
      fail('resource-signature.keyring 必须是数组。');
    }
    return {
      status,
      verified: false,
      payloadSha256,
      warning: '当前资源发现信任链是 unsigned-draft；hash lock 已验证，但还不是维护者签名。'
    };
  }

  if (status !== 'maintainer-signed') {
    fail(`resource-signature.trust.status 不在允许范围内: ${status}`);
  }
  assertRecord(signatureEnvelope.signature, 'resource-signature.signature');
  if (signatureEnvelope.signature.role !== 'maintainer') {
    fail('resource-signature.signature.role 必须是 maintainer。');
  }
  if (signatureEnvelope.signature.algorithm !== 'ed25519') {
    fail('resource-signature.signature.algorithm 必须是 ed25519。');
  }
  if (signatureEnvelope.signature.payloadSha256 !== payloadSha256) {
    fail('resource-signature.signature.payloadSha256 与 canonical payload 不一致。');
  }
  assertIsoDateTime(signatureEnvelope.signature.signedAt, 'resource-signature.signature.signedAt');
  assertIsoDateTime(signatureEnvelope.signature.expiresAt, 'resource-signature.signature.expiresAt');
  const signedAt = new Date(signatureEnvelope.signature.signedAt);
  const expiresAt = new Date(signatureEnvelope.signature.expiresAt);
  if (signedAt > verificationDate) {
    fail('resource-signature.signature.signedAt 晚于验证时间。');
  }
  if (expiresAt <= verificationDate) {
    fail('resource-signature.signature.expiresAt 已过期。');
  }

  if (!Array.isArray(signatureEnvelope.keyring) || signatureEnvelope.keyring.length === 0) {
    fail('maintainer-signed 必须提供 keyring。');
  }
  const key = signatureEnvelope.keyring.find((item) => item.keyId === signatureEnvelope.signature.keyId);
  if (!key) {
    fail(`keyring 缺少签名 keyId: ${signatureEnvelope.signature.keyId}`);
  }
  assertRecord(key, 'resource-signature.keyring[]');
  if (key.role !== 'maintainer' || key.algorithm !== 'ed25519') {
    fail('签名 key 必须是 maintainer ed25519。');
  }
  if (!allowedKeyStatuses.has(key.status)) {
    fail(`签名 key 状态不在允许范围内: ${key.status}`);
  }
  if (key.status === 'revoked' || key.status === 'compromised') {
    fail(`签名 key 已不可用: ${key.status}`);
  }
  if (key.publicKeyEncoding !== 'spki-base64url') {
    fail('签名 key 当前必须使用 spki-base64url。');
  }
  assertIsoDateTime(key.validFrom, 'resource-signature.key.validFrom');
  assertIsoDateTime(key.validUntil, 'resource-signature.key.validUntil');
  const keyValidFrom = new Date(key.validFrom);
  const keyValidUntil = new Date(key.validUntil);
  if (keyValidFrom > verificationDate) {
    fail('签名 key 尚未生效。');
  }
  if (keyValidUntil <= verificationDate) {
    fail('签名 key 已过期。');
  }

  const publicKey = crypto.createPublicKey({
    key: fromBase64Url(key.publicKey, 'resource-signature.key.publicKey'),
    format: 'der',
    type: 'spki',
  });
  const signatureBytes = fromBase64Url(signatureEnvelope.signature.value, 'resource-signature.signature.value');
  const canonicalBytes = Buffer.from(canonicalizeJson(lock), 'utf8');
  if (!crypto.verify(null, canonicalBytes, publicKey, signatureBytes)) {
    fail('resource-signature.signature.value 无法验证 canonical resource-lock。');
  }

  return { status, verified: true, payloadSha256 };
}

function checkResourceTrust(galleryRoot, options = {}) {
  const manifestPath = path.join(galleryRoot, 'resource-manifest.json');
  const lockPath = path.join(galleryRoot, 'resource-lock.json');
  const revocationsPath = path.join(galleryRoot, 'resource-revocations.json');
  const signaturePath = options.signaturePath || path.join(galleryRoot, 'resource-signature.json');

  for (const filePath of [manifestPath, lockPath, revocationsPath, signaturePath]) {
    if (!fs.existsSync(filePath)) {
      fail(`缺少资源发现信任链文件: ${projectRelative(filePath)}`);
    }
  }

  const manifest = readJson(manifestPath, 'resource-manifest.json');
  const lock = readJson(lockPath, 'resource-lock.json');
  const revocations = readJson(revocationsPath, 'resource-revocations.json');
  const signatureEnvelope = readJson(signaturePath, 'resource-signature.json');

  if (manifest.format !== 'unicode-art-gallery-resource-manifest' || manifest.version !== 1) {
    fail('resource-manifest 必须使用 unicode-art-gallery-resource-manifest@1。');
  }

  const lockSummary = assertResourceLock(galleryRoot, manifest, lock, revocationsPath);
  assertRevocations(revocations, lockSummary.resources);
  const signatureSummary = assertSignatureEnvelope(galleryRoot, signatureEnvelope, lock, options);

  return {
    galleryRoot: projectRelative(galleryRoot),
    resources: lockSummary.totals.resources,
    bytes: lockSummary.totals.bytes,
    revocations: revocations.revocations.length,
    trustStatus: signatureSummary.status,
    signatureVerified: signatureSummary.verified,
    payloadSha256: signatureSummary.payloadSha256,
    warning: signatureSummary.warning,
  };
}

function expectFixtureFailure(label, callback, expectedFragment) {
  try {
    callback();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes(expectedFragment)) {
      fail(`${label} 失败原因不符合预期。期待包含 "${expectedFragment}"，实际为: ${message}`);
    }
    return;
  }
  fail(`${label} 应该失败，但实际通过。`);
}

function checkSignatureFixtureMatrix(galleryRoot, fixtureRoot = defaultFixtureRoot) {
  if (!fs.existsSync(fixtureRoot) || !fs.statSync(fixtureRoot).isDirectory()) {
    fail(`缺少 resource trust fixture 目录: ${projectRelative(fixtureRoot)}`);
  }

  const cases = [
    {
      label: 'unsigned-draft',
      file: path.join(galleryRoot, 'resource-signature.json'),
      expect: 'pass',
      status: 'unsigned-draft',
    },
    {
      label: 'signed',
      file: path.join(fixtureRoot, 'resource-signature-signed-test-only-v1.json'),
      expect: 'pass',
      status: 'maintainer-signed',
    },
    {
      label: 'invalid-signature',
      file: path.join(fixtureRoot, 'resource-signature-invalid-test-only-v1.json'),
      expect: 'fail',
      message: '无法验证',
    },
    {
      label: 'expired',
      file: path.join(fixtureRoot, 'resource-signature-expired-test-only-v1.json'),
      expect: 'fail',
      message: '已过期',
    },
    {
      label: 'revoked-key',
      file: path.join(fixtureRoot, 'resource-signature-revoked-key-test-only-v1.json'),
      expect: 'fail',
      message: '签名 key 已不可用: revoked',
    },
    {
      label: 'wrong-key',
      file: path.join(fixtureRoot, 'resource-signature-wrong-key-test-only-v1.json'),
      expect: 'fail',
      message: 'keyring 缺少签名 keyId',
    },
  ];

  for (const item of cases) {
    if (!fs.existsSync(item.file)) {
      fail(`缺少 resource trust fixture: ${projectRelative(item.file)}`);
    }

    const runCase = () => checkResourceTrust(galleryRoot, {
      signaturePath: item.file,
      verificationDate: fixtureVerificationDate,
    });

    if (item.expect === 'pass') {
      const summary = runCase();
      if (summary.trustStatus !== item.status) {
        fail(`${item.label} fixture 状态不符合预期: ${summary.trustStatus}`);
      }
      continue;
    }

    expectFixtureFailure(`${item.label} fixture`, runCase, item.message);
  }

  return cases.length;
}

const galleryArg = process.argv[2];
const galleryRoot = galleryArg
  ? path.resolve(repositoryRoot, galleryArg)
  : defaultGalleryRoot;

try {
  if (!fs.existsSync(galleryRoot) || !fs.statSync(galleryRoot).isDirectory()) {
    fail(`gallery 目录不存在: ${galleryArg || defaultGalleryRelativeRoot}`);
  }
  const summary = checkResourceTrust(galleryRoot);
  const fixtureCount = galleryArg ? 0 : checkSignatureFixtureMatrix(galleryRoot);
  process.stdout.write(
    `Resource trust checks passed. status=${summary.trustStatus} resources=${summary.resources} revocations=${summary.revocations} fixtures=${fixtureCount}\n`
  );
  if (summary.warning) {
    process.stdout.write(`Warning: ${summary.warning}\n`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
