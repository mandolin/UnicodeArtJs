import {
  OutputFormat,
  PresetCharset,
  semanticDocumentToArt,
} from 'unicode-art-js';

/**
 * 语义文档最小示例。
 *
 * JSON 是语义布局的长期保存格式；raw-text 会原样输出，art-text 会经过字符画转换。
 */
const document = {
  version: 1,
  rows: [
    {
      role: 'header',
      cells: [
        { blocks: [{ kind: 'raw-text', text: 'Name' }] },
        { blocks: [{ kind: 'raw-text', text: 'Value' }] },
      ],
    },
    {
      cells: [
        { blocks: [{ kind: 'raw-text', text: 'Mode' }] },
        { blocks: [{ kind: 'art-text', text: 'Core' }] },
      ],
    },
    {
      role: 'footer',
      cells: [
        { blocks: [{ kind: 'raw-text', text: 'License' }] },
        { blocks: [{ kind: 'raw-text', text: 'MIT' }] },
      ],
    },
  ],
};

const result = await semanticDocumentToArt(document, {
  height: 8,
  charset: { type: PresetCharset.ASCII },
  outputFormat: OutputFormat.PLAIN_TEXT,
  box: {
    style: 'ascii',
    renderStage: 'layout',
    mode: 'grid',
  },
  locale: 'zh-CN',
});

console.log(result.content);
console.log(`\n[recipe:document] ${result.rows} rows x ${result.cols} cols`);
