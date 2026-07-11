#!/usr/bin/env node

/**
 * ============================================================================
 * 🟦 CLI 发布工具测试
 * ============================================================================
 *
 * 🔶 测试内容
 * 验证 Core 依赖切换脚本能在临时 package.json 上完成 npm / local 往返，
 * 不污染真实 CLI package。
 *
 * @module tests/release-tools.test
 * ============================================================================
 */

const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..', '..');
const cliPackagePath = path.resolve(__dirname, '..', 'package.json');
const corePackagePath = path.resolve(repoRoot, 'packages', 'core', 'package.json');
const toolPath = path.resolve(__dirname, '..', 'scripts', 'core-dependency.js');

/** 运行切换工具。 */
function runTool(args, env) {
  const result = spawnSync(process.execPath, [toolPath, ...args], {
    encoding: 'utf-8',
    env: { ...process.env, ...env }
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout);
  }

  return result.stdout.trim();
}

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'unicode-art-cli-release-tools-'));

try {
  const tempPackagePath = path.join(tempDir, 'package.json');
  fs.copyFileSync(cliPackagePath, tempPackagePath);

  const env = {
    UNICODE_ART_CLI_PACKAGE_JSON: tempPackagePath,
    UNICODE_ART_CORE_PACKAGE_JSON: corePackagePath
  };

  assert.strictEqual(runTool(['status'], env), 'file:../core');
  assert.strictEqual(runTool(['use-npm', '1.2.3'], env), '^1.2.3');
  assert.strictEqual(runTool(['verify-release'], env), 'ok ^1.2.3');
  assert.strictEqual(runTool(['use-local'], env), 'file:../core');

  const tempPackage = JSON.parse(fs.readFileSync(tempPackagePath, 'utf-8'));
  assert.strictEqual(tempPackage.dependencies['unicode-art-js'], 'file:../core');

  console.log('✅ release tools test passed');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
