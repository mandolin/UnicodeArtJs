import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  measureUnicodeArtFontText,
  parseUnicodeArtFontJson,
  renderUnicodeArtFontText,
} from 'unicode-art-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const fontPath = path.join(repoRoot, 'packages', 'extension-line-banner', 'assets', 'line-font.uafont.json');

/**
 * UAF 艺术字字体最小示例。
 *
 * 示例字体是项目原创 MIT 资产；Core 只解析和渲染数据，不下载或安装系统字体。
 */
const font = parseUnicodeArtFontJson(fs.readFileSync(fontPath, 'utf8'), {
  locale: 'zh-CN',
});
const measured = measureUnicodeArtFontText(font, 'UA');
const rendered = renderUnicodeArtFontText(font, 'UA', {
  glyphWidthProfile: 'default',
  locale: 'zh-CN',
});

console.log(rendered.content);
console.log(`\n[recipe:uaf] ${measured.rows} rows x ${measured.cols} cols`);
