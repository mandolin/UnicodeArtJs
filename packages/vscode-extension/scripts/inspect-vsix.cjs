#!/usr/bin/env node
/**
 * VSIX 内容检查。
 *
 * 目标是防止默认扩展包携带 sharp/libvips 或 node-canvas/Cairo 运行时依赖，
 * 同时确认默认 Node 图片后端 `@napi-rs/image` 与默认文字渲染后端
 * `@napi-rs/canvas` 均已进入包内并带有第三方通知。
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
assertProductionPackageSurface(entries);
const forbiddenPatterns = [
  /(^|\/)node_modules\/sharp\//,
  /(^|\/)node_modules\/@img\/sharp/i,
  /(^|\/)node_modules\/@img\/sharp-libvips/i,
  /(^|\/)node_modules\/canvas\//i,
  /(^|\/)(?:lib)?cairo(?:[._-]|\/|$)/i,
  /(^|\/)pango(?:[._-]|\/|$)/i,
  /libvips/i
];
const forbidden = entries.filter((entry) => forbiddenPatterns.some((pattern) => pattern.test(entry)));

if (forbidden.length > 0) {
  console.error('Forbidden legacy native runtime files found in VSIX:');
  forbidden.slice(0, 50).forEach((entry) => console.error(`  - ${entry}`));
  process.exit(1);
}

/**
 * @lang zh-CN
 * 校验 VSIX 只包含声明的 portable production graph、各一个 canvas/image 平台包，并且不携带 source map。
 * @lang en
 * Validate that the VSIX contains only the declared portable production graph, one canvas and one
 * image platform package, and no source maps.
 *
 * @param {string[]} entries VSIX entry 名称 / VSIX entry names.
 * @returns {void}
 */
function assertProductionPackageSurface(entries) {
  // <lang><zh-CN>VSCE 的依赖收集可绕过扩展文件 ignore；因此实物检查必须独立拒绝任意嵌套 map。</zh-CN><en>VSCE dependency collection can bypass extension-file ignores, so artifact inspection independently rejects every nested map.</en></lang>
  const sourceMaps = entries.filter((entry) => entry.endsWith('.map'));
  if (sourceMaps.length > 0) {
    console.error(`VSIX must not contain source maps, found ${sourceMaps.length}.`);
    process.exit(1);
  }

  // <lang><zh-CN>从真实 node_modules entry 归并 package root，避免以目录计数代替依赖闭包。</zh-CN><en>Fold real node_modules entries into package roots instead of treating directory counts as a dependency closure.</en></lang>
  const packageRoots = new Set();
  for (const entry of entries) {
    const match = /^extension\/node_modules\/(@[^/]+\/[^/]+|[^/]+)\//.exec(entry);
    if (match) packageRoots.add(match[1]);
  }

  const portableRoots = [
    '@napi-rs/canvas',
    '@napi-rs/image',
    'cwise-compiler',
    'iota-array',
    'is-buffer',
    'ndarray',
    'ndarray-ops',
    'unicode-art-js',
    'uniq'
  ];
  // <lang><zh-CN>portable base 必须完整；平台包名称由构建 OS 决定，不能硬编码为当前 Windows。</zh-CN><en>The portable base must be complete; platform package names depend on the build OS and must not be hard-coded to current Windows.</en></lang>
  const missingPortable = portableRoots.filter((root) => !packageRoots.has(root));
  const canvasPlatformRoots = [...packageRoots].filter((root) => /^@napi-rs\/canvas-/.test(root));
  const imagePlatformRoots = [...packageRoots].filter((root) => /^@napi-rs\/image-/.test(root));
  const unexpectedRoots = [...packageRoots].filter(
    (root) => !portableRoots.includes(root) && !/^@napi-rs\/(?:canvas|image)-/.test(root)
  );

  if (
    missingPortable.length > 0 ||
    canvasPlatformRoots.length !== 1 ||
    imagePlatformRoots.length !== 1 ||
    unexpectedRoots.length > 0 ||
    packageRoots.size !== 11
  ) {
    console.error('VSIX production package surface does not match the audited 9-base + 2-platform closure.');
    console.error(`  missing portable: ${missingPortable.join(', ') || '<none>'}`);
    console.error(`  canvas platform: ${canvasPlatformRoots.join(', ') || '<none>'}`);
    console.error(`  image platform: ${imagePlatformRoots.join(', ') || '<none>'}`);
    console.error(`  unexpected: ${unexpectedRoots.join(', ') || '<none>'}`);
    process.exit(1);
  }
}

const hasCore = entries.some((entry) => /(^|\/)node_modules\/unicode-art-js\//.test(entry));
const hasNapiImage = entries.some((entry) => /(^|\/)node_modules\/@napi-rs\/image\//.test(entry));
const hasNapiImageNative = entries.some((entry) => /(^|\/)node_modules\/@napi-rs\/image-[^/]+\//.test(entry));
const hasNapiCanvas = entries.some((entry) => /(^|\/)node_modules\/@napi-rs\/canvas\//.test(entry));
const hasNapiCanvasNative = entries.some((entry) => /(^|\/)node_modules\/@napi-rs\/canvas-[^/]+\//.test(entry));

if (!hasCore) {
  console.error('unicode-art-js was not found in VSIX node_modules.');
  process.exit(1);
}

if (!hasNapiImage || !hasNapiImageNative) {
  console.error('@napi-rs/image was not found in VSIX node_modules.');
  process.exit(1);
}

if (!hasNapiCanvas || !hasNapiCanvasNative) {
  console.error('@napi-rs/canvas was not found in VSIX node_modules.');
  process.exit(1);
}

// <lang><zh-CN>把完整 native component map 与两份 NOTICE 一起作为 VSIX 合规材料，避免只打包短声明。</zh-CN><en>Treat the complete native component map and both NOTICE files as VSIX compliance material so packaging cannot retain only the short notice.</en></lang>
const requiredComplianceFiles = [
  'extension/THIRD_PARTY_NOTICES.md',
  'extension/node_modules/unicode-art-js/THIRD_PARTY_NOTICES.md',
  'extension/node_modules/unicode-art-js/NATIVE_COMPONENTS.json'
];

for (const compliancePath of requiredComplianceFiles) {
  if (!entries.includes(compliancePath)) {
    console.error(`Required third-party compliance file was not found in VSIX: ${compliancePath}`);
    process.exit(1);
  }
}

// <lang><zh-CN>直接读取 VSIX 内映射，确保打包到扩展的不是同名空文件或旧 schema。</zh-CN><en>Read the map from the VSIX so a same-named empty file or stale schema cannot satisfy the entry check.</en></lang>
const nativeComponentEntry = zipEntries.find(
  (entry) => entry.name === 'extension/node_modules/unicode-art-js/NATIVE_COMPONENTS.json'
);
const nativeComponentMap = JSON.parse(readZipTextEntry(vsixBuffer, nativeComponentEntry));

if (
  nativeComponentMap.schema !== 'unicodeartjs-native-component-map@1' ||
  nativeComponentMap.runtimePackage !== '@napi-rs/image' ||
  nativeComponentMap.runtimeVersion !== '1.14.0' ||
  nativeComponentMap.componentCount !== 172
) {
  console.error('VSIX native component map does not match the audited @napi-rs/image@1.14.0 contract.');
  process.exit(1);
}

const packageEntry = zipEntries.find((entry) => entry.name === 'extension/package.json');
const packageJson = packageEntry ? JSON.parse(readZipTextEntry(vsixBuffer, packageEntry)) : undefined;
const coreSpec = packageJson?.dependencies?.['unicode-art-js'];

if (!coreSpec || coreSpec.startsWith('file:')) {
  console.error(`VSIX package.json must use an npm unicode-art-js dependency, got: ${coreSpec || '<missing>'}`);
  process.exit(1);
}

assertPackagedDependencyVersion('extension/node_modules/@napi-rs/image/package.json', '@napi-rs/image', '1.14.0');
assertPackagedDependencyVersion('extension/node_modules/@napi-rs/canvas/package.json', '@napi-rs/canvas', '1.0.2');

console.log(`VSIX OK: ${path.basename(vsixPath)} (${entries.length} files)`);

function assertPackagedDependencyVersion(entryName, packageName, expectedVersion) {
  const entry = zipEntries.find((candidate) => candidate.name === entryName);

  if (!entry) {
    console.error(`${packageName} package.json was not found in VSIX.`);
    process.exit(1);
  }

  const metadata = JSON.parse(readZipTextEntry(vsixBuffer, entry));
  if (metadata.version !== expectedVersion || metadata.license !== 'MIT') {
    console.error(`${packageName} must be ${expectedVersion} with MIT metadata, got ${metadata.version || '<missing>'} / ${metadata.license || '<missing>'}.`);
    process.exit(1);
  }
}

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
