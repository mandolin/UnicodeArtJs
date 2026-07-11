#!/usr/bin/env node
/**
 * VSCode Extension Core 依赖切换工具。
 *
 * 默认使用 npm semver 依赖，确保 VSIX 安装时不依赖仓库相对路径。
 * 如需短时联调 Core，可执行 `core:dep:local`，发布前必须切回 npm 版本。
 */

const fs = require('node:fs');
const path = require('node:path');

const extensionPackagePath = process.env.UNICODE_ART_VSCODE_PACKAGE_JSON
  || path.resolve(__dirname, '..', 'package.json');
const corePackagePath = process.env.UNICODE_ART_CORE_PACKAGE_JSON
  || path.resolve(__dirname, '..', '..', 'core', 'package.json');

const LOCAL_CORE_SPEC = 'file:../core';

const command = process.argv[2] || 'status';
const explicitVersion = process.argv[3];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function getCoreVersion() {
  return explicitVersion || readJson(corePackagePath).version;
}

function getDependencySpec(pkg) {
  return pkg.dependencies?.['unicode-art-js'];
}

function updateDependency(spec) {
  const pkg = readJson(extensionPackagePath);
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies['unicode-art-js'] = spec;
  writeJson(extensionPackagePath, pkg);
  return spec;
}

function useNpm() {
  const version = getCoreVersion();
  return updateDependency(`^${version}`);
}

function useLocal() {
  return updateDependency(LOCAL_CORE_SPEC);
}

function verifyRelease() {
  const pkg = readJson(extensionPackagePath);
  const spec = getDependencySpec(pkg);

  if (!spec || spec.startsWith('file:')) {
    throw new Error(`Release dependency must use npm unicode-art-js, got: ${spec || '<missing>'}`);
  }

  if (!/^\^?\d+\.\d+\.\d+/.test(spec)) {
    throw new Error(`Release dependency is not a semver npm spec: ${spec}`);
  }

  return spec;
}

try {
  if (command === 'status') {
    console.log(getDependencySpec(readJson(extensionPackagePath)) || '<missing>');
  } else if (command === 'use-npm') {
    console.log(useNpm());
  } else if (command === 'use-local' || command === 'restore-local') {
    console.log(useLocal());
  } else if (command === 'verify-release') {
    console.log(verifyRelease());
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
