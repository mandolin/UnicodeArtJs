#!/usr/bin/env node
/**
 * VSIX 内容检查。
 *
 * 目标是防止默认扩展包携带 sharp/libvips 运行时依赖，同时确认新的默认
 * Node 图片后端 `@napi-rs/image` 已进入包内。
 */

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const rootDir = path.resolve(__dirname, '..');
const vsixPath = process.argv[2] ? path.resolve(process.argv[2]) : findLatestVsix(rootDir);

if (!vsixPath) {
  console.error('No VSIX file found. Pass a path or run npm run package first.');
  process.exit(1);
}

const vsixBuffer = fs.readFileSync(vsixPath);
const zipEntries = listZipEntries(vsixBuffer);
const entries = zipEntries.map((entry) => entry.name);
const forbiddenPatterns = [
  /(^|\/)node_modules\/sharp\//,
  /(^|\/)node_modules\/@img\/sharp/i,
  /(^|\/)node_modules\/@img\/sharp-libvips/i,
  /libvips/i
];
const forbidden = entries.filter((entry) => forbiddenPatterns.some((pattern) => pattern.test(entry)));

if (forbidden.length > 0) {
  console.error('Forbidden sharp/libvips files found in VSIX:');
  forbidden.slice(0, 50).forEach((entry) => console.error(`  - ${entry}`));
  process.exit(1);
}

const hasCore = entries.some((entry) => /(^|\/)node_modules\/unicode-art-js\//.test(entry));
const hasNapiImage = entries.some((entry) => /(^|\/)node_modules\/@napi-rs\/image\//.test(entry));
const hasNapiNative = entries.some((entry) => /(^|\/)node_modules\/@napi-rs\/image-[^/]+\//.test(entry));

if (!hasCore) {
  console.error('unicode-art-js was not found in VSIX node_modules.');
  process.exit(1);
}

if (!hasNapiImage && !hasNapiNative) {
  console.error('@napi-rs/image was not found in VSIX node_modules.');
  process.exit(1);
}

const packageEntry = zipEntries.find((entry) => entry.name === 'extension/package.json');
const packageJson = packageEntry ? JSON.parse(readZipTextEntry(vsixBuffer, packageEntry)) : undefined;
const coreSpec = packageJson?.dependencies?.['unicode-art-js'];

if (!coreSpec || coreSpec.startsWith('file:')) {
  console.error(`VSIX package.json must use an npm unicode-art-js dependency, got: ${coreSpec || '<missing>'}`);
  process.exit(1);
}

console.log(`VSIX OK: ${path.basename(vsixPath)} (${entries.length} files)`);

function findLatestVsix(directory) {
  const candidates = fs.readdirSync(directory)
    .filter((name) => name.endsWith('.vsix'))
    .map((name) => {
      const filePath = path.join(directory, name);
      return { filePath, mtimeMs: fs.statSync(filePath).mtimeMs };
    })
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.filePath;
}

function listZipEntries(buffer) {
  const eocdOffset = findEndOfCentralDirectory(buffer);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);
  const entries = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index++) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory signature at ${offset}`);
    }

    const fileNameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const compressionMethod = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const nameStart = offset + 46;
    const nameEnd = nameStart + fileNameLength;
    entries.push({
      name: buffer.toString('utf8', nameStart, nameEnd),
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset
    });
    offset = nameEnd + extraLength + commentLength;
  }

  return entries;
}

function readZipTextEntry(buffer, entry) {
  const offset = entry.localHeaderOffset;
  const signature = buffer.readUInt32LE(offset);

  if (signature !== 0x04034b50) {
    throw new Error(`Invalid ZIP local header signature at ${offset}`);
  }

  const fileNameLength = buffer.readUInt16LE(offset + 26);
  const extraLength = buffer.readUInt16LE(offset + 28);
  const dataStart = offset + 30 + fileNameLength + extraLength;
  const compressed = buffer.subarray(dataStart, dataStart + entry.compressedSize);
  let data;

  if (entry.compressionMethod === 0) {
    data = compressed;
  } else if (entry.compressionMethod === 8) {
    data = zlib.inflateRawSync(compressed);
  } else {
    throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod} for ${entry.name}`);
  }

  if (data.length !== entry.uncompressedSize) {
    throw new Error(`Unexpected size for ${entry.name}`);
  }

  return data.toString('utf8');
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 0xffff - 22);

  for (let offset = buffer.length - 22; offset >= minOffset; offset--) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }

  throw new Error('Unable to find ZIP end of central directory.');
}
