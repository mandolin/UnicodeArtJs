#!/usr/bin/env node

/**
 * 校验 UAF 作者路径文档和示例。
 *
 * 该脚本让作者指南、官方示例字体、Core 渲染和 CLI 预检保持一致，
 * 防止 UAF 规则只在实现里存在而没有可执行的作者说明。
 */

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repositoryRoot = path.resolve(__dirname, '..');
const coreEntryPath = path.join(repositoryRoot, 'packages', 'core', 'dist', 'index.cjs.js');
const cliEntryPath = path.join(repositoryRoot, 'packages', 'cli', 'src', 'console.js');
const officialFontPath = path.join(repositoryRoot, 'packages', 'extension-line-banner', 'assets', 'line-font.uafont.json');
const betaFontPath = path.join(repositoryRoot, 'packages', 'core', 'tests', 'fixtures', 'semantic-uaf-beta', 'beta-font.uafont.json');

const requiredFiles = [
  'docs/uaf-authoring.md',
  'docs/semantic-uaf-beta.md',
  'docs/creative-ecosystem.md',
  'docs/extension-authoring.md',
  'docs/README.md',
  'docs/development.md',
  'docs/release-gate.md',
  'examples/node/uaf-font.mjs',
  'packages/extension-line-banner/assets/line-font.uafont.json',
  'packages/extension-line-banner/README.md',
  'packages/core/tests/fixtures/semantic-uaf-beta/beta-font.uafont.json',
  'package.json',
  '.github/workflows/ci.yml'
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

function readUtf8(relativePathOrPath) {
  const absolute = path.isAbsolute(relativePathOrPath) ? relativePathOrPath : projectPath(relativePathOrPath);
  return fs.readFileSync(absolute, 'utf8');
}

function readJson(relativePathOrPath) {
  return JSON.parse(readUtf8(relativePathOrPath));
}

function assertCondition(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requireText(content, expected, label) {
  assertCondition(content.includes(expected), `${label} 缺少 UAF 作者路径文本: ${expected}`);
}

function assertNoPrivateFragments(relativePath, content) {
  for (const fragment of forbiddenFragments) {
    assertCondition(!content.includes(fragment), `${relativePath} 泄露内部片段: ${fragment}`);
  }
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false
  });
  if (result.status !== 0) {
    throw new Error([
      `Command failed: ${command} ${args.join(' ')}`,
      result.stderr,
      result.stdout
    ].filter(Boolean).join('\n'));
  }
  return result;
}

function checkFilesAndDocs() {
  for (const relativePath of requiredFiles) {
    assertCondition(fs.existsSync(projectPath(relativePath)), `缺少 UAF 作者路径相关文件: ${relativePath}`);
    if (relativePath.endsWith('.md') || relativePath.endsWith('.json') || relativePath.endsWith('.yml')) {
      assertNoPrivateFragments(relativePath, readUtf8(relativePath));
    }
  }

  const packageJson = readJson('package.json');
  const ciWorkflow = readUtf8('.github/workflows/ci.yml');
  const docsIndex = readUtf8('docs/README.md');
  const developmentDoc = readUtf8('docs/development.md');
  const releaseGate = readUtf8('docs/release-gate.md');
  const authoringDoc = readUtf8('docs/uaf-authoring.md');
  const semanticDoc = readUtf8('docs/semantic-uaf-beta.md');
  const creativeDoc = readUtf8('docs/creative-ecosystem.md');
  const extensionReadme = readUtf8('packages/extension-line-banner/README.md');

  assertCondition(
    packageJson.scripts?.['uaf-authoring:check'] === 'npm run build:core && node scripts/check-uaf-authoring.cjs',
    'package.json 必须声明 uaf-authoring:check。'
  );
  requireText(packageJson.scripts?.['release:gate'] || '', 'uaf-authoring:check', 'package.json release:gate');
  requireText(ciWorkflow, 'Check UAF Authoring', '.github/workflows/ci.yml');
  requireText(ciWorkflow, 'npm run uaf-authoring:check', '.github/workflows/ci.yml');
  requireText(docsIndex, 'uaf-authoring.md', 'docs/README.md');
  requireText(developmentDoc, 'npm run uaf-authoring:check', 'docs/development.md');
  requireText(releaseGate, 'uaf-authoring:check', 'docs/release-gate.md');
  requireText(semanticDoc, 'uaf-authoring.md', 'docs/semantic-uaf-beta.md');
  requireText(creativeDoc, 'uaf-authoring.md', 'docs/creative-ecosystem.md');
  requireText(extensionReadme, 'uaf-authoring.md', 'packages/extension-line-banner/README.md');
  requireText(extensionReadme, 'line-font.uafont.json', 'packages/extension-line-banner/README.md');

  for (const expected of [
    'UAF 字体作者指南',
    'unicode-art-font',
    'format',
    'version',
    'meta.id',
    'metrics.height',
    'metrics.defaultAdvance',
    'fallbackGlyph',
    'advance',
    '行尾空格',
    '常见错误',
    'npm run uaf-authoring:check',
    'packages/extension-line-banner/assets/line-font.uafont.json'
  ]) {
    requireText(authoringDoc, expected, 'docs/uaf-authoring.md');
  }
}

function checkFontShape(font, label) {
  assertCondition(font.format === 'unicode-art-font', `${label} format 必须为 unicode-art-font。`);
  assertCondition(font.version === 1, `${label} version 必须为 1。`);
  assertCondition(font.meta?.license?.expression === 'MIT', `${label} 应保持 MIT 示例许可。`);
  assertCondition(font.meta?.license?.origin === 'original', `${label} 应保持 original 来源。`);
  assertCondition(Number.isInteger(font.metrics?.height) && font.metrics.height > 0, `${label} metrics.height 无效。`);
  assertCondition(Number.isInteger(font.metrics?.defaultAdvance) && font.metrics.defaultAdvance > 0, `${label} metrics.defaultAdvance 无效。`);
  assertCondition(font.metrics?.fallbackGlyph === '?', `${label} 应覆盖 fallbackGlyph。`);
  assertCondition(font.glyphs?.['?'], `${label} 必须包含 fallback 字形。`);

  for (const [glyphKey, glyph] of Object.entries(font.glyphs || {})) {
    assertCondition(Array.from(glyphKey).length === 1, `${label} 字形键必须是单 Unicode 标量: ${glyphKey}`);
    assertCondition(Array.isArray(glyph.lines), `${label} ${glyphKey}.lines 必须为数组。`);
    assertCondition(glyph.lines.length === font.metrics.height, `${label} ${glyphKey}.lines 行数必须等于 metrics.height。`);
    for (const [index, line] of glyph.lines.entries()) {
      assertCondition(typeof line === 'string', `${label} ${glyphKey}.lines[${index}] 必须为字符串。`);
      assertCondition(line === line.trimEnd(), `${label} ${glyphKey}.lines[${index}] 不得包含行尾空格。`);
      assertCondition(!/[\r\n\t]/u.test(line), `${label} ${glyphKey}.lines[${index}] 不得包含换行或制表符。`);
    }
  }
}

function checkCoreAndCli() {
  assertCondition(fs.existsSync(coreEntryPath), '缺少 Core 构建产物，请先运行 npm run build:core。');
  const core = require(coreEntryPath);
  const officialFont = readJson(officialFontPath);
  const betaFont = readJson(betaFontPath);
  checkFontShape(officialFont, 'official line font');
  checkFontShape(betaFont, 'beta fixture font');

  const parsed = core.parseUnicodeArtFontJson(JSON.stringify(officialFont), { locale: 'zh-CN' });
  const rendered = core.renderUnicodeArtFontText(parsed, 'UAJ?', { locale: 'zh-CN' });
  assertCondition(rendered.rows === parsed.metrics.height, '官方示例字体渲染行数应等于 metrics.height。');
  assertCondition(rendered.missingGlyphs.length === 0, '官方示例字体渲染 UAJ? 不应缺字。');
  assertCondition(rendered.content.includes('/\\') || rendered.content.includes('||'), '官方示例字体渲染内容异常。');

  const validation = run(process.execPath, [cliEntryPath, 'font', 'validate', officialFontPath, '--lang', 'zh-CN']);
  assertCondition(validation.stdout.includes('校验通过') || validation.stdout.includes('validation passed'), 'CLI font validate 未报告成功。');

  const inspect = run(process.execPath, [cliEntryPath, 'font', 'inspect', officialFontPath, '--json']);
  const summary = JSON.parse(inspect.stdout);
  assertCondition(summary.id === officialFont.meta.id, 'CLI font inspect 返回的 id 不匹配。');
  assertCondition(summary.glyphs >= 4, 'CLI font inspect 字形数量异常。');
  assertCondition(summary.permissiveForOfficialBundle === true, 'CLI font inspect 未识别官方宽松许可。');

  const example = run(process.execPath, ['examples/node/uaf-font.mjs']);
  assertCondition(example.stdout.includes('[recipe:uaf]'), 'UAF Node 示例未输出 recipe marker。');
}

checkFilesAndDocs();
checkCoreAndCli();
process.stdout.write('UAF authoring checks passed.\n');
