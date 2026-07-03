const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// 创建一张包含"中"字的测试图片
const canvasWidth = 60;  // 10个字符宽度 × 6像素
const canvasHeight = 30; // 5行高度 × 6像素

const canvas = createCanvas(canvasWidth, canvasHeight);
const ctx = canvas.getContext('2d');

// 白色背景
ctx.fillStyle = '#FFFFFF';
ctx.fillRect(0, 0, canvasWidth, canvasHeight);

// 黑色文字
ctx.fillStyle = '#000000';
ctx.font = '30px SimSun'; // 字体大小30px（5行×6像素）
ctx.textBaseline = 'top';

// 绘制"中"字
ctx.fillText('中', 0, 0);

// 保存为PNG（使用绝对路径）
const outputPath = path.join(__dirname, 'test-image-zhong.png');
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(outputPath, buffer);

console.error(`Test image created: ${canvasWidth}x${canvasHeight}`);
console.error(`Saved to ${outputPath}`);

process.exit(0);
