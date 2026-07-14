/**
 * Core npm tarball 的默认 Node 文本渲染运行时冒烟测试。
 *
 * 中文说明：与 workspace 内冒烟测试不同，本脚本会在临时目录安装刚打出的
 * Core tarball，随后真实加载其 @napi-rs/canvas 平台二进制。它用于防止动态
 * require、npm files 白名单或原生 optional dependency 在发布产物中失效。
 */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const coreRoot = path.resolve(currentDirectory, '..');
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-core-package-'));
const tarballDirectory = path.join(temporaryRoot, 'tarball');
const consumerDirectory = path.join(temporaryRoot, 'consumer');
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

try {
  fs.mkdirSync(tarballDirectory, { recursive: true });
  fs.mkdirSync(consumerDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(consumerDirectory, 'package.json'),
    JSON.stringify({ name: 'unicode-art-core-package-smoke', private: true }, null, 2)
  );

  const packOutput = runNpm(
    ['pack', '--pack-destination', tarballDirectory],
    coreRoot
  );
  const tarballName = packOutput
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.endsWith('.tgz'));

  assert.ok(tarballName, 'npm pack must produce a Core tarball');
  const tarballPath = path.join(tarballDirectory, tarballName);

  runNpm(
    ['install', '--omit=dev', '--package-lock=false', tarballPath],
    consumerDirectory
  );

  assert.ok(
    fs.existsSync(path.join(consumerDirectory, 'node_modules', 'unicode-art-js', 'THIRD_PARTY_NOTICES.md')),
    'Installed Core tarball must include THIRD_PARTY_NOTICES.md'
  );
  assert.equal(
    fs.existsSync(path.join(consumerDirectory, 'node_modules', 'canvas')),
    false,
    'Installed Core tarball must not install the old node-canvas package'
  );

  const childSmokePath = path.join(consumerDirectory, 'smoke.cjs');
  fs.writeFileSync(childSmokePath, createChildSmokeScript());
  const smokeOutput = execFileSync(process.execPath, [childSmokePath], {
    cwd: consumerDirectory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });

  assert.match(smokeOutput, /"ok"\s*:\s*true/u, 'Installed Core tarball child process must render text');
  process.stdout.write(smokeOutput);
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

/**
 * 在独立 Node 进程执行原生加载，避免 Windows 在当前测试进程结束前锁住 .node。
 */
function createChildSmokeScript() {
  return `
const assert = require('node:assert/strict');
const core = require('unicode-art-js');

void (async () => {
  const result = await core.textToArt('Package', {
    height: 4,
    charset: { type: core.PresetCharset.ASCII },
    trimTrailingSpaces: true
  });

  assert.equal(core.getCoreCapabilities().nodeTextRenderer.defaultBackend, 'napi-rs-canvas');
  assert.ok(result.content.trim().length > 0, 'Installed Core tarball must render text');
  const semantic = await core.semanticDocumentToArt({
    version: 1,
    rows: [{ cells: [{ blocks: [{ kind: 'raw-text', text: 'npm' }] }] }]
  }, {
    height: 1,
    box: false
  }, {
    grid: false
  });
  assert.equal(semantic.content, 'npm', 'Installed Core tarball must render semantic documents');
  const artFont = core.parseUnicodeArtFontJson(JSON.stringify({
    format: 'unicode-art-font',
    version: 1,
    meta: {
      id: 'org.unicodeartjs.package-smoke',
      name: 'Package Smoke',
      authors: ['UnicodeArtJs'],
      license: { expression: 'MIT', origin: 'original' }
    },
    metrics: { height: 1, defaultAdvance: 2, fallbackGlyph: '?' },
    glyphs: { A: { lines: ['AA'] }, '?': { lines: ['??'] } }
  }));
  const artFontMeasurement = core.measureUnicodeArtFontText(artFont, 'AΩ');
  assert.equal(artFontMeasurement.cols, 4, 'Installed Core tarball must measure Unicode art fonts');
  assert.deepEqual(artFontMeasurement.missingGlyphs, ['Ω'], 'Installed Core tarball must apply art-font fallback');
  const artFontRendering = core.renderUnicodeArtFontText(artFont, 'AΩ');
  assert.equal(artFontRendering.content, 'AA??', 'Installed Core tarball must render Unicode art fonts');
  const semanticArtFont = await core.semanticDocumentToArt({
    version: 1,
    rows: [{ cells: [{ blocks: [{ kind: 'art-font-text', text: 'A', font: artFont }] }] }]
  }, {
    height: 1,
    box: false
  }, {
    grid: false
  });
  assert.equal(semanticArtFont.content, 'AA', 'Installed Core tarball must render art-font semantic blocks');
  console.log(JSON.stringify({
    ok: true,
    renderer: 'napi-rs-canvas',
    packageInstall: true,
    rows: result.rows,
    bytes: Buffer.byteLength(result.content),
    semanticColumns: semantic.cols,
    artFontColumns: artFontMeasurement.cols,
    artFontBytes: Buffer.byteLength(artFontRendering.content)
  }, null, 2));
})().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});
`;
}

/** 在 Windows 上通过 cmd.exe 调用 npm.cmd，避免 Node 直接执行 .cmd 的 EINVAL。 */
function runNpm(args, cwd) {
  const options = { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] };

  if (process.platform !== 'win32') {
    return execFileSync(npmBin, args, options);
  }

  const command = [npmBin, ...args]
    .map((value) => quoteWindowsCommandArgument(String(value)))
    .join(' ');
  return execFileSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command], options);
}

/** cmd.exe 只为含空格或引号的参数加引号，避免把 npm.cmd 自身转义成文本。 */
function quoteWindowsCommandArgument(value) {
  if (!/[\s"]/u.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}
