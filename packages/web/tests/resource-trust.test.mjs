/**
 * Web 资源信任链测试。
 *
 * 这些测试在 Node Web Crypto 环境下复核浏览器端信任链实现，确保生产
 * `maintainer-signed` sidecar 可以通过，坏签名和资源撤回不会被放行。
 */

import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

if (!globalThis.crypto) {
  Object.defineProperty(globalThis, 'crypto', {
    value: webcrypto,
    configurable: true,
  });
}

if (!globalThis.atob) {
  Object.defineProperty(globalThis, 'atob', {
    value: (source) => Buffer.from(source, 'base64').toString('binary'),
    configurable: true,
  });
}

const {
  parseUnicodeArtResourceManifest,
} = await import('../src/resource-discovery.js');
const {
  getUnicodeArtResourceRevocationStatus,
  parseUnicodeArtResourceLock,
  parseUnicodeArtResourceRevocations,
  parseUnicodeArtResourceSignature,
  verifyUnicodeArtResourceTrust,
} = await import('../src/resource-trust.js');

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDirectory, '..', '..', '..');
const galleryRoot = path.join(projectRoot, 'packages', 'web', 'public', 'gallery');
const fixtureRoot = path.join(projectRoot, 'fixtures', 'resource-trust');
const verificationDate = new Date('2026-07-20T00:00:00.000Z');

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

async function readGalleryFile(relativePath) {
  const bytes = await readFile(path.join(galleryRoot, relativePath));
  return {
    bytes: toArrayBuffer(bytes),
    text: bytes.toString('utf8'),
  };
}

async function loadTrustInputs(signatureRelativePath = null) {
  const [manifestFile, lockFile, revocationsFile, signatureFile] = await Promise.all([
    readGalleryFile('resource-manifest.json'),
    readGalleryFile('resource-lock.json'),
    readGalleryFile('resource-revocations.json'),
    signatureRelativePath
      ? readFile(path.join(fixtureRoot, signatureRelativePath), 'utf8').then((text) => ({ text }))
      : readGalleryFile('resource-signature.json'),
  ]);

  return {
    manifest: parseUnicodeArtResourceManifest(manifestFile.text),
    lock: parseUnicodeArtResourceLock(lockFile.text),
    revocations: parseUnicodeArtResourceRevocations(revocationsFile.text),
    signatureEnvelope: parseUnicodeArtResourceSignature(signatureFile.text),
    manifestBytes: manifestFile.bytes,
    lockBytes: lockFile.bytes,
    revocationsBytes: revocationsFile.bytes,
    verificationDate,
  };
}

test('verifies the production maintainer-signed resource trust chain', async () => {
  const summary = await verifyUnicodeArtResourceTrust(await loadTrustInputs());

  assert.equal(summary.status, 'maintainer-signed');
  assert.equal(summary.verified, true);
  assert.equal(summary.importAllowed, true);
  assert.equal(summary.resources, 9);
  assert.equal(summary.revocations, 0);
  assert.match(summary.payloadSha256, /^[a-f0-9]{64}$/u);
});

test('blocks an invalid maintainer signature fixture', async () => {
  const summary = await verifyUnicodeArtResourceTrust(await loadTrustInputs(
    'resource-signature-invalid-test-only-v1.json',
  ));

  assert.equal(summary.status, 'invalid-signature');
  assert.equal(summary.verified, false);
  assert.equal(summary.importAllowed, false);
  assert.match(summary.message, /无法验证|signature/u);
});

test('marks revoked resources as non-importable facts', () => {
  const revocation = getUnicodeArtResourceRevocationStatus({
    revocations: [
      {
        resourceId: 'review-workflow',
        reason: 'quality',
        message: { 'zh-CN': '测试撤回', 'en-US': 'Test revocation' },
      },
    ],
  }, 'review-workflow');

  assert.equal(revocation.status, 'revoked-resource');
  assert.equal(revocation.revoked, true);
  assert.equal(revocation.reason, 'quality');

  const clear = getUnicodeArtResourceRevocationStatus({ revocations: [] }, 'review-workflow');
  assert.equal(clear.status, 'not-revoked');
  assert.equal(clear.revoked, false);
});
