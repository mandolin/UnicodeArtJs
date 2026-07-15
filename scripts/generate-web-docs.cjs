#!/usr/bin/env node

/**
 * 生成 Web 公开 JavaScript 模块的本地 HIA JSDoc 文档。
 *
 * @lang zh-CN 当前仅扫描可独立导入的 gallery-index 模块；DOM 工作台入口不是稳定 SDK，不应因生成方便而扩大公开调用面。
 * @lang en Currently scans only the independently importable gallery-index module; the DOM workbench entry is not a stable SDK and must not become public merely because it is easy to generate.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(repositoryRoot, '.generated-docs', 'web');
const configPath = path.join(repositoryRoot, 'tools', 'docs', 'jsdoc.web.json');
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
