#!/usr/bin/env node
/**
 * VSIX 隔离打包脚本。
 *
 * 中文说明：npm workspaces 会把 `unicode-art-js` 解析成本地 workspace 链接，
 * vsce 直接打包时会追进 `../core` 并带上本地 node_modules。这里改用临时目录
 * 安装本地 Core tarball，再把 VSIX 内的依赖声明恢复为 npm semver，保证发布包
 * 既可提前验证本地候选 Core，又不携带 monorepo 相对路径。
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const extensionRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(extensionRoot, '..', '..');
const coreRoot = path.join(repoRoot, 'packages', 'core');
const packageJsonPath = path.join(extensionRoot, 'package.json');
const corePackageJsonPath = path.join(coreRoot, 'package.json');

const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const vsceBin = path.join(
  extensionRoot,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vsce.cmd' : 'vsce'
);

const args = new Set(process.argv.slice(2));
const preRelease = args.has('--pre-release');
const keepStage = process.env.UNICODE_ART_KEEP_VSIX_STAGE === '1';

const extensionPackage = readJson(packageJsonPath);
const corePackage = readJson(corePackageJsonPath);
const stageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-vsix-'));
const vendorDir = path.join(stageRoot, 'vendor');
const outputPath = path.join(extensionRoot, `${extensionPackage.name}-${extensionPackage.version}.vsix`);

try {
  fs.mkdirSync(vendorDir, { recursive: true });
  copyExtensionSources(stageRoot);
  run(npmBin, ['--workspace', 'packages/core', 'run', 'build'], repoRoot);
  const coreTarball = packCore(vendorDir);

  const stagePackagePath = path.join(stageRoot, 'package.json');
  const stagePackage = readJson(stagePackagePath);
  stagePackage.dependencies = stagePackage.dependencies || {};
  stagePackage.dependencies['unicode-art-js'] = `file:./vendor/${path.basename(coreTarball)}`;
  writeJson(stagePackagePath, stagePackage);

  run(npmBin, ['install', '--omit=dev', '--package-lock=false'], stageRoot);

  stagePackage.dependencies['unicode-art-js'] = `^${corePackage.version}`;
  writeJson(stagePackagePath, stagePackage);
  fs.rmSync(vendorDir, { recursive: true, force: true });
  fs.rmSync(outputPath, { force: true });

  const vsceArgs = ['package', '--out', outputPath];
  if (preRelease) vsceArgs.splice(1, 0, '--pre-release');
  run(vsceBin, vsceArgs, stageRoot);
  console.log(`VSIX packaged: ${outputPath}`);
} finally {
  if (keepStage) {
    console.log(`VSIX stage kept: ${stageRoot}`);
  } else {
    fs.rmSync(stageRoot, { recursive: true, force: true });
  }
}

function copyExtensionSources(targetRoot) {
  const entries = [
    '.vscodeignore',
    'CHANGELOG.md',
    'LICENSE',
    'README.md',
    'THIRD_PARTY_NOTICES.md',
    'dist',
    'docs',
    'media',
    'package.json',
    'package.nls.json',
    'package.nls.zh-cn.json'
  ];

  for (const entry of entries) {
    const source = path.join(extensionRoot, entry);
    if (!fs.existsSync(source)) continue;
    const target = path.join(targetRoot, entry);
    fs.cpSync(source, target, { recursive: true });
  }
}

function packCore(destination) {
  const result = spawn(npmBin, ['--workspace', 'packages/core', 'pack', '--pack-destination', destination], repoRoot, {
    stdio: 'pipe',
    encoding: 'utf8'
  });
  const lines = result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tarballName = [...lines].reverse().find((line) => line.endsWith('.tgz'));

  if (!tarballName) {
    throw new Error(`Unable to find Core tarball name in npm pack output:\n${result.stdout}`);
  }

  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return path.join(destination, tarballName);
}

function run(command, commandArgs, cwd) {
  spawn(command, commandArgs, cwd, { stdio: 'inherit' });
}

function spawn(command, commandArgs, cwd, options) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    shell: process.platform === 'win32',
    ...options
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${commandArgs.join(' ')}`);
  }

  return result;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
