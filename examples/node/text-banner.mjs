import {
  OutputFormat,
  PresetCharset,
  textToArt,
} from 'unicode-art-js';

/**
 * 文本 Banner 最小示例。
 *
 * 这里使用 ASCII 字符集和纯文本输出，方便终端、CI 与文档检查复现。
 */
const result = await textToArt('UnicodeArtJs', {
  height: 12,
  charset: { type: PresetCharset.ASCII },
  outputFormat: OutputFormat.PLAIN_TEXT,
  visualFont: {
    family: 'Noto Sans SC, Noto Sans, Arial, sans-serif',
    reduce: 0,
  },
  glyphFont: {
    family: 'Sarasa Mono SC, LXGW WenKai Mono, Source Code Pro, Liberation Mono, monospace',
    widthProfile: 'default',
  },
  box: {
    style: 'round',
    padding: 1,
    title: 'Text',
  },
  locale: 'en-US',
});

console.log(result.content);
console.log(`\n[recipe:text] ${result.rows} rows x ${result.cols} cols`);
