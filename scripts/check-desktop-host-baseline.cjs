#!/usr/bin/env node

/**
 * 校验桌面宿主第二基线。
 *
 * 该脚本保护公开桌面宿主契约、uaproj v1 canonical fixtures、Compatible
 * 文档链接和 release gate 集成。它不读取独立桌面仓库，也不安装桌面 runtime。
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const docs = {
  desktop: 'docs/desktop-host-baseline.md',
  host: 'docs/host-integration.md',
  compatible: 'docs/compatible-project-guide.md',
  ecosystem: 'docs/ecosystem-compatibility.md',
  development: 'docs/development.md',
  releaseGate: 'docs/release-gate.md',
  index: 'docs/README.md',
  roadmap: 'docs/roadmap.md',
  extensionSdk: 'docs/extension-sdk.md'
};
const fixtureRoot = 'fixtures/desktop/uaproj-v1';
const fixtureFiles = [
  'text-project.uaproj',
  'linked-image-project.uaproj',
  'embedded-image-project.uaproj'
];
const forbiddenFragments = [
  'work-zone',
  'ai/codex',
  'ai\\codex',
  'W-art-',
  'T-apple',
  'T-tea',
  'K:\\',
  'C:\\Users\\'
];

function projectPath(relativePath) {
  return path.join(repositoryRoot, relativePath);
}

function readUtf8(relativePath) {
  return fs.readFileSync(projectPath(relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(readUtf8(relativePath));
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} is missing required text: ${expected}`);
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} leaks private or internal fragment: ${fragment}`);
  }
}

function assertExists(relativePath) {
  assertCondition(fs.existsSync(projectPath(relativePath)), `Missing file: ${relativePath}`);
}

function assertNumberInRange(value, minimum, maximum, label) {
  assertCondition(typeof value === 'number' && Number.isFinite(value), `${label} must be a number.`);
  assertCondition(value >= minimum && value <= maximum, `${label} must be between ${minimum} and ${maximum}.`);
}

function checkDocs() {
  for (const relativePath of Object.values(docs)) {
    assertExists(relativePath);
    assertNoPrivateFragments(relativePath, readUtf8(relativePath));
  }

  const desktop = readUtf8(docs.desktop);
  for (const expected of [
    '# 桌面宿主基线',
    '宿主矩阵',
    'getCoreCapabilities()',
    '项目文件 v1',
    '*.uaproj',
    'schemaVersion',
    '普通图片项目只保存路径引用',
    '便携项目才允许嵌入图片副本',
    '10 MiB',
    '14 MiB',
    '声明式扩展 SDK',
    'UnicodeArtError',
    'Compatible 发布基线',
    'fixtures/desktop/uaproj-v1/text-project.uaproj',
    'fixtures/desktop/uaproj-v1/linked-image-project.uaproj',
    'fixtures/desktop/uaproj-v1/embedded-image-project.uaproj'
  ]) {
    requireText(desktop, expected, docs.desktop);
  }

  for (const [relativePath, expectedTexts] of Object.entries({
    [docs.index]: ['desktop-host-baseline.md'],
    [docs.host]: ['desktop-host-baseline.md', '*.uaproj'],
    [docs.compatible]: ['desktop-host-baseline.md', 'desktop-host:check'],
    [docs.ecosystem]: ['desktop-host-baseline.md', '*.uaproj'],
    [docs.development]: ['desktop-host:check', 'desktop-host-baseline.md'],
    [docs.releaseGate]: ['desktop-host:check'],
    [docs.roadmap]: ['desktop-host-baseline.md']
  })) {
    const content = readUtf8(relativePath);
    for (const expected of expectedTexts) {
      requireText(content, expected, relativePath);
    }
  }
}

function checkFixtures() {
  for (const fileName of fixtureFiles) {
    const relativePath = `${fixtureRoot}/${fileName}`;
    assertExists(relativePath);
    assertNoPrivateFragments(relativePath, readUtf8(relativePath));
    validateProjectFixture(readJson(relativePath), relativePath);
  }
}

function validateProjectFixture(project, label) {
  assertCondition(project && typeof project === 'object' && !Array.isArray(project), `${label} must contain a JSON object.`);
  assertCondition(project.schemaVersion === 1, `${label} must use schemaVersion 1.`);
  assertCondition(project.application?.id === 'unicodeart-app', `${label} must use the canonical application id.`);
  assertCondition(typeof project.application?.version === 'string', `${label} must include application.version.`);
  assertCondition(project.mode === 'text' || project.mode === 'image', `${label} mode must be text or image.`);
  validateConfig(project.config, label);
  validateSource(project.source, project.mode, label);
}

function validateConfig(config, label) {
  assertCondition(config && typeof config === 'object' && !Array.isArray(config), `${label} config must be an object.`);
  assertCondition(['ASCII', 'EXTENDED', 'CHINESE_SIMPLE'].includes(config.charset), `${label} config.charset is invalid.`);
  assertCondition(typeof config.visualFont === 'string' && config.visualFont.length > 0, `${label} config.visualFont is required.`);
  assertCondition(typeof config.glyphFont === 'string' && config.glyphFont.length > 0, `${label} config.glyphFont is required.`);
  assertNumberInRange(config.height, 2, 240, `${label} config.height`);
  assertNumberInRange(config.matrixSize, 2, 20, `${label} config.matrixSize`);
  assertNumberInRange(config.ratio, 1, 3, `${label} config.ratio`);
}

function validateSource(source, mode, label) {
  assertCondition(source && typeof source === 'object' && !Array.isArray(source), `${label} source must be an object.`);
  assertCondition(source.kind === mode, `${label} source.kind must match mode.`);
  if (mode === 'text') {
    assertCondition(typeof source.text === 'string', `${label} text source must include text.`);
    return;
  }

  assertCondition(['linked', 'embedded'].includes(source.storage), `${label} image source storage is invalid.`);
  assertCondition(['image/png', 'image/jpeg', 'image/webp', 'image/bmp', 'image/gif'].includes(source.mime), `${label} image mime is invalid.`);
  assertCondition(typeof source.name === 'string' && source.name.length > 0, `${label} image name is required.`);
  if (source.storage === 'linked') {
    assertCondition(typeof source.path === 'string' && source.path.length > 0, `${label} linked image path is required.`);
    assertCondition(!/^[A-Za-z]:[\\/]/u.test(source.path), `${label} fixture must not contain a Windows absolute path.`);
    assertCondition(!source.path.startsWith('/'), `${label} fixture must not contain a POSIX absolute path.`);
    return;
  }

  assertCondition(Number.isInteger(source.byteLength) && source.byteLength >= 0, `${label} embedded image byteLength is invalid.`);
  assertCondition(typeof source.dataBase64 === 'string', `${label} embedded image dataBase64 is required.`);
  const decoded = Buffer.from(source.dataBase64, 'base64');
  assertCondition(decoded.byteLength === source.byteLength, `${label} embedded image byteLength does not match dataBase64.`);
}

function checkScripts() {
  const packageJson = readJson('package.json');
  assertCondition(packageJson.scripts?.['desktop-host:check'] === 'node scripts/check-desktop-host-baseline.cjs', 'package.json must expose desktop-host:check.');
  assertCondition(packageJson.scripts?.['release:gate']?.includes('npm run desktop-host:check'), 'release:gate must include desktop-host:check.');
  requireText(readUtf8('.github/workflows/ci.yml'), 'Check Desktop Host Baseline', '.github/workflows/ci.yml');
}

checkDocs();
checkFixtures();
checkScripts();

process.stdout.write('Desktop host baseline checks passed.\n');
