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
