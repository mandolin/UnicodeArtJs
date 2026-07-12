#!/usr/bin/env node
/**
 * ============================================================================
 * 🟦 UnicodeArtJs 仓库级发布门禁
 * ============================================================================
 *
 * 🔶 模块职责
 * 将跨包版本图、依赖图、默认 backend、VSIX 内容、公开文档和共享 fixture
 * 收敛成一个可重复的发布前核验入口。
 *
 * English note: this script intentionally checks release facts rather than
 * replacing package-level unit tests. Run package checks before this gate.
 *
 * @module scripts/release-gate
 * ============================================================================
 */

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

//#region 🟦 Paths and CLI flags

const repoRoot = path.resolve(__dirname, '..');
const strictPublish = process.argv.includes('--strict-publish');
const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const paths = {
  rootPackage: path.join(repoRoot, 'package.json'),
  lockfile: path.join(repoRoot, 'package-lock.json'),
  rootReadme: path.join(repoRoot, 'README.md'),
  developmentDoc: path.join(repoRoot, 'docs', 'development.md'),
  releaseDoc: path.join(repoRoot, 'docs', 'release-gate.md'),
  runtimeSbomDoc: path.join(repoRoot, 'docs', 'runtime-sbom.md'),
  vscodeReleaseChecklist: path.join(repoRoot, 'docs', 'vscode-extension-release-checklist.md'),
  fixtures: path.join(repoRoot, 'fixtures', 'release', 'fixtures.json'),
  corePackage: path.join(repoRoot, 'packages', 'core', 'package.json'),
  coreVersionSource: path.join(repoRoot, 'packages', 'core', 'src', 'version.ts'),
  coreDist: path.join(repoRoot, 'packages', 'core', 'dist', 'index.cjs.js'),
  coreNotices: path.join(repoRoot, 'packages', 'core', 'THIRD_PARTY_NOTICES.md'),
  cliPackage: path.join(repoRoot, 'packages', 'cli', 'package.json'),
  cliEntry: path.join(repoRoot, 'packages', 'cli', 'src', 'console.js'),
  webPackage: path.join(repoRoot, 'packages', 'web', 'package.json'),
  vscodePackage: path.join(repoRoot, 'packages', 'vscode-extension', 'package.json')
};

//#endregion

//#region 🟦 Gate State

const failures = [];
const notices = [];

function fail(message) {
  failures.push(message);
}

function notice(message) {
  notices.push(message);
}

function assertGate(condition, message) {
  if (!condition) fail(message);
}

//#endregion

//#region 🟦 File Helpers

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function normalizeNewlines(value) {
  return String(value).replace(/\r\n/g, '\n').trimEnd();
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    ...options
  });

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(' ')}\n${result.error?.message || result.stderr || result.stdout || '<no output>'}`);
  }

  return result;
}

function createTempOutputPath(prefix) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return {
    tempDir,
    outputPath: path.join(tempDir, 'output.txt')
  };
}

//#endregion

//#region 🟦 Package Graph Checks

function checkPackageGraph() {
  const rootPackage = readJson(paths.rootPackage);
  const corePackage = readJson(paths.corePackage);
  const cliPackage = readJson(paths.cliPackage);
  const webPackage = readJson(paths.webPackage);
  const vscodePackage = readJson(paths.vscodePackage);
  const coreVersionSource = readText(paths.coreVersionSource);
  const coreVersionMatch = coreVersionSource.match(/VERSION\s*=\s*['"]([^'"]+)['"]/);

  assertGate(rootPackage.private === true, 'Root package must stay private.');
  assertGate(Array.isArray(rootPackage.workspaces), 'Root package must declare npm workspaces.');

  for (const workspace of ['packages/core', 'packages/cli', 'packages/web', 'packages/vscode-extension']) {
    assertGate(rootPackage.workspaces.includes(workspace), `Root workspaces missing ${workspace}.`);
  }

  assertGate(Boolean(coreVersionMatch), 'Core VERSION constant was not found.');
  assertGate(coreVersionMatch?.[1] === corePackage.version, 'Core VERSION constant must match packages/core/package.json.');

  const cliCoreSpec = cliPackage.dependencies?.['unicode-art-js'];
  const webCoreSpec = webPackage.dependencies?.['unicode-art-js'];
  const vscodeCoreSpec = vscodePackage.dependencies?.['unicode-art-js'];
  const expectedNpmCoreSpec = `^${corePackage.version}`;

  if (strictPublish) {
    assertGate(cliCoreSpec === expectedNpmCoreSpec, `CLI publish dependency must be ${expectedNpmCoreSpec}, got ${cliCoreSpec}.`);
  } else {
    assertGate(
      cliCoreSpec === 'file:../core' || cliCoreSpec === expectedNpmCoreSpec,
      `CLI dependency must be local dev spec or ${expectedNpmCoreSpec}, got ${cliCoreSpec}.`
    );
  }

  assertGate(webCoreSpec === 'file:../core', `Web should consume local Core in this monorepo, got ${webCoreSpec}.`);
  assertGate(vscodeCoreSpec === expectedNpmCoreSpec, `VSCode extension dependency must be ${expectedNpmCoreSpec}, got ${vscodeCoreSpec}.`);
  assertGate(vscodePackage.publisher === 'mandolin', `VSCode publisher must be mandolin, got ${vscodePackage.publisher}.`);

  if (cliCoreSpec === 'file:../core') {
    notice('CLI is in development dependency mode. Run packages/cli core:dep:npm before npm publishing, then restore local mode after publishing.');
  }
}

//#endregion

//#region 🟦 Core Capability Checks

function checkCoreCapabilities() {
  if (!fs.existsSync(paths.coreDist)) {
    fail('Core dist was not found. Run npm run build:core before release verification.');
    return;
  }

  const corePackage = readJson(paths.corePackage);
  const core = require(paths.coreDist);
  const capabilities = core.getCoreCapabilities?.();

  assertGate(Boolean(capabilities), 'getCoreCapabilities() must be exported by Core dist.');
  if (!capabilities) return;

  assertGate(capabilities.version === corePackage.version, 'Core capabilities version must match package version.');
  assertGate(capabilities.nodeImageBackends?.defaultBackend === 'napi-rs', 'Core default Node image backend must be napi-rs.');
  assertGate(capabilities.nodeImageBackends?.legacyBackends?.includes('sharp'), 'Core capabilities must mark sharp as legacy.');
  assertGate(capabilities.stableFeatures?.some((item) => item.id === 'node.imageBackend.napi-rs'), 'Core stable features must include node.imageBackend.napi-rs.');
  assertGate(capabilities.nodeTextRenderer?.defaultBackend === 'napi-rs-canvas', 'Core default Node text renderer must be napi-rs-canvas.');
  assertGate(capabilities.nodeTextRenderer?.runtimePackage === '@napi-rs/canvas', 'Core Node text renderer must expose @napi-rs/canvas.');
  assertGate(capabilities.stableFeatures?.some((item) => item.id === 'node.textRenderer.napi-rs-canvas'), 'Core stable features must include node.textRenderer.napi-rs-canvas.');
  assertGate(capabilities.supportedLocales?.includes('zh-CN'), 'Core capabilities must include zh-CN locale.');
  assertGate(capabilities.supportedLocales?.includes('en-US'), 'Core capabilities must include en-US locale.');
}

//#endregion

//#region 🟦 Dependency and License Checks

function checkForbiddenRuntimeDeps() {
  const lockfileText = readText(paths.lockfile);
  const corePackage = readJson(paths.corePackage);
  const packageManifestText = [
    paths.corePackage,
    paths.cliPackage,
    paths.webPackage,
    paths.vscodePackage
  ].map(readText).join('\n');

  const forbiddenPatterns = [
    { pattern: /@img\/sharp/i, label: '@img/sharp*' },
    { pattern: /sharp-libvips/i, label: 'sharp-libvips' },
    { pattern: /packages\/core\/node_modules\/sharp/i, label: 'packages/core/node_modules/sharp' },
    { pattern: /packages\/vscode-extension\/node_modules\/sharp/i, label: 'packages/vscode-extension/node_modules/sharp' },
    { pattern: /"sharp"\s*:\s*"[^"]+"/i, label: 'sharp dependency declaration' },
    { pattern: /(^|["/])node_modules\/canvas(?:["/]|$)/i, label: 'node-canvas package' },
    { pattern: /packages\/core\/node_modules\/canvas/i, label: 'packages/core/node_modules/canvas' }
  ];

  for (const { pattern, label } of forbiddenPatterns) {
    assertGate(!pattern.test(lockfileText), `package-lock.json must not contain ${label}.`);
    assertGate(!pattern.test(packageManifestText), `Package manifests must not contain ${label}.`);
  }

  assertGate(corePackage.dependencies?.['@napi-rs/image'] === '1.14.0', 'Core must pin @napi-rs/image to 1.14.0.');
  assertGate(corePackage.dependencies?.['@napi-rs/canvas'] === '1.0.2', 'Core must pin @napi-rs/canvas to 1.0.2.');
  assertGate(!corePackage.dependencies?.canvas, 'Core dependencies must not contain node-canvas.');
  assertGate(!corePackage.optionalDependencies?.canvas, 'Core optionalDependencies must not contain node-canvas.');
  assertGate(!corePackage.peerDependencies?.canvas, 'Core peerDependencies must not contain node-canvas.');
  assertGate(Array.isArray(corePackage.files) && corePackage.files.includes('THIRD_PARTY_NOTICES.md'), 'Core npm files must include THIRD_PARTY_NOTICES.md.');
  assertGate(fs.existsSync(paths.coreNotices), 'Core THIRD_PARTY_NOTICES.md is required.');
  assertGate(lockfileText.includes('node_modules/@napi-rs/canvas'), 'package-lock.json must contain @napi-rs/canvas.');
  assertGate(lockfileText.includes('node_modules/@napi-rs/image'), 'package-lock.json must contain @napi-rs/image.');

  const lockfile = readJson(paths.lockfile);
  const forbiddenLicensePattern = /\b(AGPL|GPL|LGPL|MPL|EPL|CDDL)\b/i;
  const blockedLicenses = [];

  for (const [packagePath, metadata] of Object.entries(lockfile.packages || {})) {
    const license = String(metadata.license || '');
    if (forbiddenLicensePattern.test(license)) {
      blockedLicenses.push(`${packagePath || '<root>'}: ${license}`);
    }
  }

  assertGate(blockedLicenses.length === 0, `Forbidden runtime/dependency licenses found:\n${blockedLicenses.join('\n')}`);
}

//#endregion

//#region 🟦 Native Runtime Checks

function checkNodeTextRuntime() {
  if (!fs.existsSync(paths.coreDist)) return;

  run(npmBin, ['--workspace', 'packages/core', 'run', 'test:node-runtime'], {
    shell: process.platform === 'win32'
  });
  run(npmBin, ['--workspace', 'packages/core', 'run', 'test:node-package-runtime'], {
    shell: process.platform === 'win32'
  });
}

//#endregion

//#region 🟦 VSIX Checks

function checkVsix() {
  run(npmBin, ['--workspace', 'packages/vscode-extension', 'run', 'inspect:vsix'], {
    shell: process.platform === 'win32'
  });
}

//#endregion

//#region 🟦 Shared Fixture Checks

async function checkSharedFixtures() {
  if (!fs.existsSync(paths.coreDist)) return;

  const fixtures = readJson(paths.fixtures);
  const core = require(paths.coreDist);

  assertGate(fixtures.version === 1, 'Release fixture version must be 1.');

  for (const fixture of fixtures.text || []) {
    const config = createCoreConfig(core, fixture);
    const expected = await core.textToArt(fixture.input, config);
    const cliOutput = runCliText(fixture);
    assertGate(
      normalizeNewlines(cliOutput.stdout) === normalizeNewlines(expected.content),
      `Text fixture ${fixture.id} differs between Core and CLI.`
    );
  }

  for (const fixture of fixtures.image || []) {
    const imagePath = path.join(repoRoot, fixture.path);
    const config = createCoreConfig(core, fixture);
    const expected = await core.imageToArt(imagePath, config);
    const cliOutput = runCliImage(fixture, imagePath);
    assertGate(
      normalizeNewlines(cliOutput.stdout) === normalizeNewlines(expected.content),
      `Image fixture ${fixture.id} differs between Core and CLI.`
    );
  }
}

function createCoreConfig(core, fixture) {
  const config = {
    height: fixture.height,
    locale: fixture.locale,
    outputFormat: core.OutputFormat.PLAIN_TEXT
  };

  if (fixture.width) {
    config.width = fixture.width;
  }

  if (fixture.chars) {
    config.charset = {
      type: core.PresetCharset.CUSTOM,
      customChars: fixture.chars
    };
  } else if (fixture.charset) {
    config.charset = {
      type: core.PresetCharset[fixture.charset]
    };
  }

  if (fixture.box) {
    config.box = fixture.box;
  }

  return config;
}

function createCliArgs(fixture) {
  const args = [
    '--no-config',
    '--height',
    String(fixture.height),
    '--lang',
    fixture.locale || 'en-US'
  ];

  if (fixture.width) {
    args.push('--width', String(fixture.width));
  }

  if (fixture.chars) {
    args.push('--chars', fixture.chars);
  } else if (fixture.charset) {
    args.push('--charset', fixture.charset);
  }

  if (fixture.box) {
    args.push('--box', JSON.stringify(fixture.box));
  }

  return args;
}

function runCliText(fixture) {
  const { tempDir, outputPath } = createTempOutputPath('unicode-art-release-text');

  try {
    run(process.execPath, [paths.cliEntry, 'text', fixture.input, ...createCliArgs(fixture), '--output', outputPath]);
    return { stdout: readText(outputPath) };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function runCliImage(fixture, imagePath) {
  const { tempDir, outputPath } = createTempOutputPath('unicode-art-release-image');

  try {
    run(process.execPath, [paths.cliEntry, 'image', imagePath, ...createCliArgs(fixture), '--output', outputPath]);
    return { stdout: readText(outputPath) };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

//#endregion

//#region 🟦 Public Documentation Checks

function checkPublicDocs() {
  const rootPackage = readJson(paths.rootPackage);
  const rootReadme = readText(paths.rootReadme);
  const developmentDoc = readText(paths.developmentDoc);
  const releaseDoc = readText(paths.releaseDoc);
  const runtimeSbomDoc = readText(paths.runtimeSbomDoc);
  const vscodeChecklist = readText(paths.vscodeReleaseChecklist);

  assertGate(rootReadme.includes(rootPackage.homepage), 'Root README must include the GitHub Pages homepage.');
  assertGate(developmentDoc.includes('npm run release:gate'), 'Development doc must mention npm run release:gate.');
  assertGate(releaseDoc.includes('release:gate'), 'Release gate doc must describe release:gate.');
  assertGate(releaseDoc.includes('W-art-P1.7'), 'Release gate doc must identify W-art-P1.7.');
  assertGate(releaseDoc.includes('napi-rs/canvas'), 'Release gate doc must identify the default Node text renderer.');
  assertGate(runtimeSbomDoc.includes('@napi-rs/canvas@1.0.2'), 'Runtime inventory must pin @napi-rs/canvas@1.0.2.');
  assertGate(runtimeSbomDoc.includes('@napi-rs/image@1.14.0'), 'Runtime inventory must pin @napi-rs/image@1.14.0.');
  assertGate(vscodeChecklist.includes('inspect:vsix'), 'VSCode release checklist must include inspect:vsix.');
}

//#endregion

//#region 🟦 Main

async function main() {
  checkPackageGraph();
  checkCoreCapabilities();
  checkForbiddenRuntimeDeps();
  checkNodeTextRuntime();
  checkVsix();
  await checkSharedFixtures();
  checkPublicDocs();

  for (const item of notices) {
    console.log(`NOTICE ${item}`);
  }

  if (failures.length > 0) {
    console.error('\nRelease gate failed:');
    failures.forEach((message) => console.error(`- ${message}`));
    process.exit(1);
  }

  console.log(`Release gate OK (${strictPublish ? 'strict publish' : 'development'} mode).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exit(1);
});

//#endregion
