#!/usr/bin/env node

/**
 * ============================================================================
 * 🟦 CLI Core 依赖切换工具
 * ============================================================================
 *
 * 🔶 模块职责
 * 在开发态 `file:../core` 和发布态 npm 版本之间切换 CLI 对 Core 的依赖，
 * 避免发布前后手工编辑 `package.json`。
 *
 * @module scripts/core-dependency
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

//#region 🟦 Paths

const cliPackagePath = process.env.UNICODE_ART_CLI_PACKAGE_JSON
  ? path.resolve(process.env.UNICODE_ART_CLI_PACKAGE_JSON)
  : path.resolve(__dirname, '..', 'package.json');

const corePackagePath = process.env.UNICODE_ART_CORE_PACKAGE_JSON
  ? path.resolve(process.env.UNICODE_ART_CORE_PACKAGE_JSON)
  : path.resolve(__dirname, '..', '..', 'core', 'package.json');

//#endregion

//#region 🟦 Package Helpers

/** 读取 JSON 文件。 */
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

/** 写入格式化 JSON 文件。 */
function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf-8');
}

/** 获取 Core 当前版本。 */
function getCoreVersion(explicitVersion) {
  if (explicitVersion) {
    return explicitVersion.replace(/^\^/, '');
  }

  return readJson(corePackagePath).version;
}

/** 读取 CLI package。 */
function readCliPackage() {
  return readJson(cliPackagePath);
}

/** 写入 CLI package。 */
function writeCliPackage(pkg) {
  writeJson(cliPackagePath, pkg);
}

//#endregion

//#region 🟦 Commands

/** 显示当前 Core 依赖。 */
function showStatus() {
  const pkg = readCliPackage();
  console.log(pkg.dependencies?.['unicode-art-js'] || '(missing)');
}

/** 切换到 npm Core 依赖。 */
function useNpm(version) {
  const pkg = readCliPackage();
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies['unicode-art-js'] = `^${getCoreVersion(version)}`;
  writeCliPackage(pkg);
  showStatus();
}

/** 切换回本地 Core 依赖。 */
function useLocal() {
  const pkg = readCliPackage();
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies['unicode-art-js'] = 'file:../core';
  writeCliPackage(pkg);
  showStatus();
}

/** 验证发布态不再使用 file 依赖。 */
function verifyReleaseDependency() {
  const pkg = readCliPackage();
  const value = pkg.dependencies?.['unicode-art-js'];

  if (!value || value.startsWith('file:')) {
    throw new Error(`CLI release dependency must use npm unicode-art-js, got: ${value || '(missing)'}`);
  }

  console.log(`ok ${value}`);
}

//#endregion

//#region 🟦 CLI

const command = process.argv[2] || 'status';
const version = process.argv[3];

try {
  if (command === 'status') {
    showStatus();
  } else if (command === 'use-npm') {
    useNpm(version);
  } else if (command === 'use-local' || command === 'restore-local') {
    useLocal();
  } else if (command === 'verify-release') {
    verifyReleaseDependency();
  } else {
    throw new Error(`Unknown command: ${command}`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

//#endregion
