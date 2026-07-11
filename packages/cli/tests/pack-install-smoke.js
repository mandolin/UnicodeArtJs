#!/usr/bin/env node

/**
 * ============================================================================
 * 🟦 CLI pack/install 冒烟测试
 * ============================================================================
 *
 * 🔶 测试内容
 * 使用 npm pack 产物安装到临时项目中，验证文本、图片和 permissive
 * `napi-rs` 图像后端路径可以从安装包执行。
 *
 * @module tests/pack-install-smoke
 * ============================================================================
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const cliRoot = path.resolve(__dirname, '..');
const coreRoot = path.resolve(repoRoot, 'packages', 'core');
const fixtureImagePath = path.resolve(coreRoot, 'tests', 'test-image-zhong.png');

/** 运行命令，失败时抛出完整输出。 */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf-8',
    shell: process.platform === 'win32',
    ...options
  });

  if (result.status !== 0) {
    throw new Error([
      `Command failed: ${command} ${args.join(' ')}`,
      result.stdout,
      result.stderr
    ].filter(Boolean).join('\n'));
  }

  return result.stdout.trim();
}

/** 复制 CLI 发布所需文件到临时 staging。 */
function stageCliPackage(stagingDir, coreTarballPath) {
  for (const entry of ['src', 'locales', 'docs']) {
    fs.cpSync(path.join(cliRoot, entry), path.join(stagingDir, entry), { recursive: true });
  }

  for (const entry of ['README.md', 'config.yml']) {
    fs.copyFileSync(path.join(cliRoot, entry), path.join(stagingDir, entry));
  }

  const pkg = JSON.parse(fs.readFileSync(path.join(cliRoot, 'package.json'), 'utf-8'));
  pkg.dependencies['unicode-art-js'] = `file:${coreTarballPath.replace(/\\/g, '/')}`;
  fs.writeFileSync(path.join(stagingDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
}

/** 解析 npm pack 输出中的 tgz 路径。 */
function resolvePackedTarball(output, destination) {
  const filename = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).pop();
  return path.join(destination, filename);
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-cli-pack-smoke-'));

try {
  const packDir = path.join(tempDir, 'packs');
  const stagingDir = path.join(tempDir, 'cli-staging');
  const appDir = path.join(tempDir, 'app');
  fs.mkdirSync(packDir, { recursive: true });
  fs.mkdirSync(stagingDir, { recursive: true });
  fs.mkdirSync(appDir, { recursive: true });

  const corePackOutput = run('npm', ['pack', coreRoot, '--silent', '--pack-destination', packDir]);
  const coreTarballPath = resolvePackedTarball(corePackOutput, packDir);
  stageCliPackage(stagingDir, coreTarballPath);

  const cliPackOutput = run('npm', ['pack', stagingDir, '--silent', '--pack-destination', packDir]);
  const cliTarballPath = resolvePackedTarball(cliPackOutput, packDir);

  run('npm', ['init', '-y'], { cwd: appDir });
  run('npm', ['install', '--no-audit', '--no-fund', cliTarballPath], { cwd: appDir });

  const binPath = path.join(appDir, 'node_modules', '.bin', process.platform === 'win32' ? 'unicode-art.cmd' : 'unicode-art');
  const textOutputPath = path.join(appDir, 'text.txt');
  const imageOutputPath = path.join(appDir, 'image.txt');

  run(binPath, ['text', 'Hi', '--height', '2', '--chars', ' @', '--output', textOutputPath, '--lang', 'en-US'], {
    cwd: appDir
  });
  run(binPath, [
    'image',
    fixtureImagePath,
    '--height',
    '2',
    '--chars',
    ' @',
    '--image-backend',
    'napi-rs',
    '--output',
    imageOutputPath,
    '--lang',
    'en-US'
  ], {
    cwd: appDir
  });

  if (!fs.readFileSync(textOutputPath, 'utf-8').trim()) {
    throw new Error('Text smoke output is empty');
  }
  if (!fs.readFileSync(imageOutputPath, 'utf-8').trim()) {
    throw new Error('Image smoke output is empty');
  }

  console.log('✅ CLI pack/install smoke passed');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
