#!/usr/bin/env node

/**
 * 检查 CLI 文档试点的最小可用输出。
 *
 * @lang zh-CN 此检查只验证可重复生成的文档契约，不把生成产物提交到仓库，也不替代人工的术语和示例复核。
 * @lang en This check verifies the repeatable documentation contract only; it neither commits generated output nor replaces human review of terminology and examples.
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(repositoryRoot, '.generated-docs', 'cli');
const requiredFiles = [
  'index.html',
  'index.zh-CN.html',
  'index.en.html',
  'search-index.json',
  'i18n-index.json',
  'hia-metadata.json',
  'hia-integration.json'
];

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(outputDirectory, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing generated documentation file: ${relativePath}`);
  }
}

const integrationPath = path.join(outputDirectory, 'hia-integration.json');
const integration = JSON.parse(fs.readFileSync(integrationPath, 'utf8'));
const nodes = integration.ir?.nodes ?? [];
const loadLanguageNode = nodes.find((node) => node.name === 'loadLanguage');
const normalizeConfigNode = nodes.find((node) => node.name === 'normalizeConfig');
const moduleNode = nodes.find((node) => node.longname === 'module:@unicode-art/cli');

if (!loadLanguageNode) {
  throw new Error('HIA integration output does not contain the loadLanguage doclet.');
}

if (!normalizeConfigNode) {
  throw new Error('HIA integration output does not contain the normalizeConfig doclet.');
}

const localizedDescription = loadLanguageNode.i18n?.fields?.description?.localizedText;
if (localizedDescription?.['zh-CN'] !== '读取受支持语言的本地翻译字典；语言代码无效或文件缺失时由调用方的错误处理流程接管。') {
  throw new Error('HIA integration output is missing the Chinese loadLanguage description.');
}

if (localizedDescription?.en !== 'Loads a locale dictionary for a supported language; invalid language codes and missing files are handled by the caller\'s error flow.') {
  throw new Error('HIA integration output is missing the English loadLanguage description.');
}

const moduleExample = moduleNode?.jsdoc?.examples?.[0] ?? '';
if (moduleExample.includes('====')) {
  throw new Error('Module example unexpectedly contains the decorative JSDoc separator.');
}

const chineseHtml = fs.readFileSync(path.join(outputDirectory, 'index.zh-CN.html'), 'utf8');
const englishHtml = fs.readFileSync(path.join(outputDirectory, 'index.en.html'), 'utf8');
const sourceUrl = 'https://github.com/mandolin/UnicodeArtJs/blob/main/packages/cli/src/console.js';

if (!chineseHtml.includes(sourceUrl)) {
  throw new Error('Chinese documentation output is missing the CLI source link.');
}

if (!englishHtml.includes(sourceUrl)) {
  throw new Error('English documentation output is missing the CLI source link.');
}

if (!chineseHtml.includes('加载语言文件')) {
  throw new Error('Chinese documentation output is missing the localized CLI description.');
}

if (!englishHtml.includes('Loads a locale dictionary')) {
  throw new Error('English documentation output is missing the localized CLI description.');
}

process.stdout.write('CLI HIA JSDoc output passed the smoke checks.\n');
