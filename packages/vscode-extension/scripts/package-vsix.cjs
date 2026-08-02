#!/usr/bin/env node
/**
 * @lang zh-CN
 * 在隔离 stage 中组装 VSIX，并把本地 Core 候选恢复为可发布的 npm semver 依赖。
 *
 * npm workspaces 会把 `unicode-art-js` 解析成本地 workspace 链接，vsce 直接打包时会追进
 * `../core` 并带上本地 node_modules。本脚本安装本地 Core tarball、恢复 semver，再删除仅供
 * 调试的 production source map，使发布包不携带 monorepo 相对路径或非运行时 map。
 * @lang en
 * Assemble a VSIX in an isolated stage and restore the local Core candidate to a publishable npm
 * semver dependency.
 *
 * npm workspaces resolve `unicode-art-js` as a local workspace link, so direct vsce packaging can
 * traverse `../core` and local node_modules. This script installs a local Core tarball, restores the
 * semver dependency, and removes debug-only production source maps so the package carries neither
 * monorepo-relative paths nor non-runtime maps.
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

  // <lang><zh-CN>本地 tarball 安装可能物化 dev-only extraneous；标准 prune 让 stage 严格回到声明的 production closure。</zh-CN><en>A local tarball install can materialize dev-only extraneous packages; standard prune returns the stage strictly to the declared production closure.</en></lang>
  run(npmBin, ['prune', '--omit=dev', '--package-lock=false'], stageRoot);

  // <lang><zh-CN>VSCE 会独立收集 production dependency 文件；在隔离 stage 内显式清除其 map，避免 `.vscodeignore` 只作用于扩展文件。</zh-CN><en>VSCE collects production dependency files independently, so prune their maps inside the isolated stage because `.vscodeignore` only filters extension files.</en></lang>
  pruneProductionSourceMaps(path.join(stageRoot, 'node_modules'));

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

/**
 * @lang zh-CN
 * 从隔离 stage 的 production dependency 树删除仅供调试的 source map。
 *
 * 读取范围由调用点固定为 stage/node_modules；函数不触及仓库 node_modules 或产品源码。
 * @lang en
 * Remove debug-only source maps from the isolated stage's production dependency tree.
 *
 * The call site fixes the read/write boundary to stage/node_modules; this function never touches
 * repository node_modules or product source.
 *
 * @param {string} directory 当前隔离依赖目录 / Current isolated dependency directory.
 * @returns {void}
 */
function pruneProductionSourceMaps(directory) {
  // <lang><zh-CN>目录枚举只来自已创建的隔离 production tree，不接受外部路径参数。</zh-CN><en>Directory entries come only from the created isolated production tree, never from an external path argument.</en></lang>
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    // <lang><zh-CN>递归仅跟随真实目录，不跟随符号链接或 workspace 链接。</zh-CN><en>Recurse only into real directories, never symbolic or workspace links.</en></lang>
    if (entry.isDirectory()) {
      pruneProductionSourceMaps(entryPath);
      continue;
    }
    // <lang><zh-CN>只删除 `.map` 普通文件，运行时代码、类型、NOTICE、许可证和 native payload 均保持原样。</zh-CN><en>Delete only regular `.map` files; runtime code, types, notices, licenses, and native payload remain unchanged.</en></lang>
    if (entry.isFile() && entry.name.endsWith('.map')) fs.rmSync(entryPath, { force: true });
  }
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
