#!/usr/bin/env node

/**
 * 生成 CLI 的本地 HIA JSDoc 试点文档。
 *
 * @lang zh-CN 每次运行都先清理专用生成目录，避免旧 doclet 或旧语言资源掩盖当前源码的问题。
 * @lang en Clears the dedicated output directory before every run so stale doclets or locale files cannot hide source changes.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(repositoryRoot, '.generated-docs', 'cli');
const configPath = path.join(repositoryRoot, 'tools', 'docs', 'jsdoc.cli.json');
const jsdocEntrypoint = require.resolve('jsdoc/jsdoc.js');

fs.rmSync(outputDirectory, { recursive: true, force: true });

const result = spawnSync(
  process.execPath,
  [jsdocEntrypoint, '-c', configPath],
  {
    cwd: repositoryRoot,
    stdio: 'inherit'
  }
);

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
