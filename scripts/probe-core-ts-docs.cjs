#!/usr/bin/env node

/**
 * 探测当前 HIA JSDoc 工具对 Core TypeScript 的实际处理边界。
 *
 * @lang zh-CN 分别尝试直接读取 TypeScript 源码和读取保留注释的 Rollup 产物；该脚本记录事实，不将编译产物误判为可追溯的源码文档。
 * @lang en Attempts direct TypeScript parsing and parsing of the comment-preserving Rollup artifact; records facts without mistaking compiled output for traceable source documentation.
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const generatedRoot = path.join(repositoryRoot, '.generated-docs');
const jsdocEntrypoint = require.resolve('jsdoc/jsdoc.js');
const npmEntrypoint = process.env.npm_execpath;

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8'
  });
}

function summarizeResult(result) {
  return {
    status: result.status ?? 1,
    stdout: result.stdout?.trim() ?? '',
    stderr: result.stderr?.trim() ?? '',
    error: result.error?.message ?? ''
  };
}

function readIntegration(relativeDirectory) {
  const integrationPath = path.join(generatedRoot, relativeDirectory, 'hia-integration.json');
  if (!fs.existsSync(integrationPath)) {
    return null;
  }

  const integration = JSON.parse(fs.readFileSync(integrationPath, 'utf8'));
  const nodes = integration.ir?.nodes ?? [];
  return {
    nodeCount: nodes.length,
    containsGetCoreCapabilities: nodes.some((node) => node.name === 'getCoreCapabilities'),
    relativePaths: [...new Set(nodes.map((node) => node.source?.definedIn?.relativePath).filter(Boolean))]
  };
}

fs.rmSync(path.join(generatedRoot, 'core-ts-source'), { recursive: true, force: true });
fs.rmSync(path.join(generatedRoot, 'core-compiled'), { recursive: true, force: true });

const buildResult = npmEntrypoint
  ? run(process.execPath, [npmEntrypoint, 'run', 'build:core'])
  : run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build:core']);
if (buildResult.status !== 0) {
  process.stderr.write(
    buildResult.stderr
      || buildResult.stdout
      || buildResult.error?.message
      || 'Core build failed before the documentation probe.\n'
  );
  process.exit(buildResult.status ?? 1);
}

const sourceConfig = path.join(repositoryRoot, 'tools', 'docs', 'jsdoc.core-ts-source-probe.json');
const compiledConfig = path.join(repositoryRoot, 'tools', 'docs', 'jsdoc.core-compiled-probe.json');
const sourceResult = run(process.execPath, [jsdocEntrypoint, '-c', sourceConfig]);
const compiledResult = run(process.execPath, [jsdocEntrypoint, '-c', compiledConfig]);

if (compiledResult.status !== 0) {
  process.stderr.write(compiledResult.stderr || compiledResult.stdout || 'Compiled Core documentation probe failed.\n');
  process.exit(compiledResult.status ?? 1);
}

const sourceIntegration = readIntegration('core-ts-source');
const compiledIntegration = readIntegration('core-compiled');
const report = {
  generatedAt: new Date().toISOString(),
  directTypeScript: {
    ...summarizeResult(sourceResult),
    integration: sourceIntegration
  },
  compiledJavaScript: {
    ...summarizeResult(compiledResult),
    integration: compiledIntegration,
    publicSourceLinkReady: false,
    limitation: 'Compiled Rollup files are not tracked source files, so their generated source links cannot satisfy public API source-traceability requirements.'
  }
};

fs.writeFileSync(
  path.join(generatedRoot, 'core-ts-probe.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);

const sourceStatus = sourceResult.status === 0 ? 'accepted' : 'rejected';
const compiledNodeCount = compiledIntegration?.nodeCount ?? 0;
process.stdout.write(`Core TypeScript probe: direct source ${sourceStatus}; compiled JS produced ${compiledNodeCount} doclets.\n`);
