/**
 * 默认 Node 文本渲染运行时冒烟测试。
 *
 * 中文说明：该脚本故意不使用 Jest 的 Canvas mock，确保发布前实际加载
 * @napi-rs/canvas 的平台原生模块并完成最小文字转字符画流程。
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const core = require('../dist/index.cjs.js');
const canvas = require('@napi-rs/canvas/node-canvas');

assert.equal(typeof canvas.createCanvas, 'function', 'Canvas compatibility entry must expose createCanvas');
assert.equal(typeof canvas.registerFont, 'function', 'Canvas compatibility entry must expose registerFont');

const surface = canvas.createCanvas(8, 8);
const context = surface.getContext('2d');
context.fillStyle = '#ffffff';
context.fillRect(0, 0, 8, 8);
context.fillStyle = '#000000';
context.font = '6px sans-serif';
context.fillText('A', 0, 6);

// 中文注释：验证默认 Skia 路径使用实际字形度量后，不会把中英文混排整体压到行高下沿。
const textSurface = canvas.createCanvas(800, 72);
const textContext = textSurface.getContext('2d');
textContext.fillStyle = '#ffffff';
textContext.fillRect(0, 0, 800, 72);
textContext.fillStyle = '#000000';
textContext.font = '72px "Noto Sans SC"';
textContext.textBaseline = 'alphabetic';
const textMetrics = textContext.measureText('Pipe 中文');
const textHeight = Math.ceil(textMetrics.actualBoundingBoxAscent || 0) +
  Math.ceil(textMetrics.actualBoundingBoxDescent || 0);
const textY = Math.max(0, Math.floor((72 - textHeight) / 2)) +
  Math.ceil(textMetrics.actualBoundingBoxAscent || 0);
textContext.fillText('Pipe 中文', 0, textY);
const textPixels = textContext.getImageData(0, 0, 800, 72).data;
let firstInkRow = 72;
let lastInkRow = -1;
for (let y = 0; y < 72; y++) {
  for (let x = 0; x < 800; x++) {
    if (textPixels[(y * 800 + x) * 4] < 250) {
      firstInkRow = Math.min(firstInkRow, y);
      lastInkRow = Math.max(lastInkRow, y);
    }
  }
}
assert.ok(firstInkRow <= 1, 'Skia baseline placement must not leave a large top band');
assert.ok(lastInkRow >= 70, 'Skia baseline placement must use the available lower line area');

const result = await core.textToArt('Skia', {
  height: 4,
  charset: {
    type: core.PresetCharset.ASCII
  },
  trimTrailingSpaces: true
});

assert.ok(result.content.trim().length > 0, 'Skia textToArt output must not be empty');
assert.ok(result.rows > 0, 'Skia textToArt must report positive rows');

console.log(JSON.stringify({
  ok: true,
  renderer: 'napi-rs-canvas',
  rows: result.rows,
  bytes: Buffer.byteLength(result.content)
}, null, 2));
