import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  imageToArt,
  OutputFormat,
  PresetCharset,
} from 'unicode-art-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const imagePath = path.join(repoRoot, 'packages', 'core', 'tests', 'test-image-zhong.png');

/**
 * 图片转字符画最小示例。
 *
 * 输入图片使用仓库内测试 fixture；应用侧可替换为自己的 PNG/JPEG/WebP/BMP 文件。
 */
const result = await imageToArt(imagePath, {
  height: 16,
  charset: { type: PresetCharset.EXTENDED },
  outputFormat: OutputFormat.PLAIN_TEXT,
  imageBackend: 'napi-rs',
  trimTrailingSpaces: true,
  locale: 'zh-CN',
});

console.log(result.content);
console.log(`\n[recipe:image] ${result.rows} rows x ${result.cols} cols`);
