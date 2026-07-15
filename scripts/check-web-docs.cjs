#!/usr/bin/env node

/**
 * 检查 Web 公开模块文档试点的最小可用输出。
 *
 * @lang zh-CN 该检查验证画廊索引模块的双语、安全边界和源码追溯，不把 Web DOM 控制器误判为稳定库 API。
 * @lang en This check verifies bilingual output, security boundaries, and source traceability for the gallery index module without mistaking Web DOM controllers for stable library APIs.
 */

const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(repositoryRoot, '.generated-docs', 'web');
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
  if (!fs.existsSync(path.join(outputDirectory, relativePath))) {
    throw new Error(`Missing generated Web documentation file: ${relativePath}`);
  }
}

const integration = JSON.parse(fs.readFileSync(path.join(outputDirectory, 'hia-integration.json'), 'utf8'));
const nodes = integration.ir?.nodes ?? [];
const parseNode = nodes.find((node) => node.name === 'parseUnicodeArtGalleryIndex');
const localizedTextNode = nodes.find((node) => node.name === 'getGalleryLocalizedText');
const resolveNode = nodes.find((node) => node.name === 'resolveUnicodeArtGalleryArtworkUrl');

if (!parseNode || !localizedTextNode || !resolveNode) {
  throw new Error('Web integration output is missing one or more gallery-index public doclets.');
}

for (const node of [parseNode, localizedTextNode, resolveNode]) {
  const description = node.i18n?.fields?.description?.localizedText;
  if (!description?.['zh-CN'] || !description?.en) {
    throw new Error(`Web function ${node.name} is missing a bilingual localized description.`);
  }

  if (!node.jsdoc?.params?.length || !node.jsdoc?.returns?.length) {
    throw new Error(`Web function ${node.name} is missing parameter or return documentation.`);
  }
}

const parseDescription = parseNode.i18n?.fields?.description?.localizedText;
if (parseDescription?.['zh-CN'] !== '解析并严格校验静态画廊索引；该入口只接受审核后的同源 JSON 元数据，不读取、下载或执行作品内容。') {
  throw new Error('Web integration output is missing the Chinese gallery parser description.');
}

if (parseDescription?.en !== 'Parses and strictly validates a static gallery index; this entry accepts only reviewed same-origin JSON metadata and never reads, downloads, or executes artwork content.') {
  throw new Error('Web integration output is missing the English gallery parser description.');
}

const chineseHtml = fs.readFileSync(path.join(outputDirectory, 'index.zh-CN.html'), 'utf8');
const englishHtml = fs.readFileSync(path.join(outputDirectory, 'index.en.html'), 'utf8');
const sourceUrl = 'https://github.com/mandolin/UnicodeArtJs/blob/main/packages/web/src/gallery-index.js';

for (const html of [chineseHtml, englishHtml]) {
  if (!html.includes(sourceUrl)) {
    throw new Error('Generated Web documentation is missing the gallery-index source link.');
  }
}

if (!chineseHtml.includes('同源 JSON 元数据')) {
  throw new Error('Chinese Web documentation is missing the gallery security boundary.');
}

if (!englishHtml.includes('same-origin JSON metadata')) {
  throw new Error('English Web documentation is missing the gallery security boundary.');
}

// 直接检查最终 HTML，而不仅是集成 JSON：曾有插件把字段元数据解析为英文、
// 主题却因陈旧的回退记录渲染为中文的回归。该断言保护真实读者看到的页面。
if (!englishHtml.includes('Validated text object containing `zh-CN` and `en-US`.')) {
  throw new Error('English Web documentation is rendering a localized field with an unexpected fallback locale.');
}

if (!englishHtml.includes('Current UI locale.')) {
  throw new Error('English Web documentation is missing the localized gallery parameter description.');
}

process.stdout.write('Web HIA JSDoc output passed the smoke checks.\n');
