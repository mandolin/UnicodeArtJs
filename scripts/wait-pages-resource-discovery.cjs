#!/usr/bin/env node

/**
 * 等待 GitHub Pages 静态资源发现文件完成传播。
 *
 * GitHub Pages 部署刚完成时，页面、gallery manifest 和 artwork 文件偶尔会
 * 短暂处在新旧资源混合状态。部署后 smoke test 前先跑这个脚本，确保远端
 * resource manifest、hash lock sidecar 和实际 artwork bytes 已经彼此一致。
 */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const localGalleryRoot = path.join(repositoryRoot, 'packages', 'web', 'public', 'gallery');
const requiredSidecars = [
  'resource-manifest.json',
  'resource-lock.json',
  'resource-revocations.json',
  'resource-signature.json',
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function sha256Hex(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeBaseUrl(value) {
  if (!value) {
    throw new Error('BASE_URL or first argument is required.');
  }
  return value.endsWith('/') ? value : `${value}/`;
}

async function fetchBytes(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${url} returned HTTP ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function assertRemoteFileMatchesLocal(baseUrl, relativePath) {
  const localBytes = fs.readFileSync(path.join(localGalleryRoot, relativePath));
  const remoteBytes = await fetchBytes(new URL(`gallery/${relativePath}`, baseUrl).href);
  const localSha256 = sha256Hex(localBytes);
  const remoteSha256 = sha256Hex(remoteBytes);
  if (localSha256 !== remoteSha256) {
    throw new Error(`${relativePath} has not propagated yet: ${remoteSha256} !== ${localSha256}`);
  }
  return { size: remoteBytes.length, sha256: remoteSha256 };
}

async function assertRemoteDiscoveryReady(baseUrl) {
  const pageBytes = await fetchBytes(baseUrl);
  if (!pageBytes.toString('utf8').includes('UnicodeArtJs')) {
    throw new Error('deployed page HTML does not contain UnicodeArtJs marker.');
  }

  for (const relativePath of requiredSidecars) {
    await assertRemoteFileMatchesLocal(baseUrl, relativePath);
  }

  const manifest = JSON.parse(fs.readFileSync(path.join(localGalleryRoot, 'resource-manifest.json'), 'utf8'));
  for (const resource of manifest.resources) {
    const remoteBytes = await fetchBytes(new URL(`gallery/${resource.source}`, baseUrl).href);
    const remoteSha256 = sha256Hex(remoteBytes);
    if (remoteBytes.length !== resource.size || remoteSha256 !== resource.sha256) {
      throw new Error(`${resource.id} bytes do not match manifest yet.`);
    }
  }
}

async function main() {
  const baseUrl = normalizeBaseUrl(process.env.BASE_URL || process.argv[2]);
  const maxAttempts = Number(process.env.PAGES_WAIT_ATTEMPTS || 36);
  const delayMs = Number(process.env.PAGES_WAIT_DELAY_MS || 5000);
  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await assertRemoteDiscoveryReady(baseUrl);
      process.stdout.write(`Pages resource discovery files are ready after ${attempt} attempt(s).\n`);
      return;
    } catch (error) {
      lastError = error;
      process.stdout.write(`Waiting for Pages resource discovery files (${attempt}/${maxAttempts}): ${error.message}\n`);
      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }
  }

  throw lastError || new Error('Pages resource discovery files did not become ready.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
