# Phase 1: Core库开发技术规格

> **阶段**: Phase 1
> **工期**: 5天（Day 1-5）
> **负责人**: Qoder
> **目标**: 发布npm包正式版本（`unicode-art-js@1.0.0`）

---

## 📦 项目配置

### package.json

```json
{
  "name": "unicode-art-js",
  "version": "1.0.0",
  "description": "Convert text and images to Unicode art - Core library",
  "main": "dist/index.cjs.js",
  "module": "dist/index.esm.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "dev": "rollup -c -w",
    "build": "rollup -c",
    "test": "jest",
    "lint": "eslint src/**/*.ts",
    "prepublish": "npm run build && npm test"
  },
  "dependencies": {
    "sharp": "^0.33.2",
    "canvas": "^2.11.2",
    "ndarray": "^1.0.19",
    "ndarray-ops": "^1.2.2"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "rollup": "^4.0.0",
    "@rollup/plugin-typescript": "^11.0.0",
    "@rollup/plugin-node-resolve": "^15.0.0",
    "@rollup/plugin-commonjs": "^25.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0",
    "@types/ndarray": "^1.0.14",
    "eslint": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0"
  },
  "license": "MIT",
  "keywords": ["unicode", "ascii", "art", "text", "image"],
  "repository": {
    "type": "git",
    "url": "https://github.com/mandolin/UnicodeArtJs.git"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "declaration": true,
    "declarationDir": "./dist/types",
    "outDir": "./dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### rollup.config.js

```javascript
import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'UnicodeArt',
      sourcemap: true,
      globals: {
        sharp: 'sharp',
        canvas: 'canvas'
      }
    }
  ],
  external: ['sharp', 'canvas'],
  plugins: [
    resolve(),
    commonjs(),
    typescript({ tsconfig: './tsconfig.json' })
  ]
};
```

---

## 🏗️ 核心架构

### 目录结构

```
packages/core/src/
├── index.ts                 # 主入口，导出公共API
├── types/                   # TypeScript类型定义
│   ├── image.ts
│   ├── charset.ts
│   ├── config.ts
│   └── output.ts
├── preprocessor.ts          # 图像预处理
├── sampler.ts               # 采样数组生成
├── charRenderer.ts          # 字符矩阵渲染
├── matcher.ts               # SAD匹配算法
├── assembler.ts             # 输出组装
├── utils/                   # 工具函数
│   ├── wideChar.ts         # 宽字符检测
│   ├── cache.ts            # 缓存管理
│   └── validation.ts       # 参数验证
└── constants.ts             # 常量定义
```

---

## 📝 类型定义规范

### types/image.ts

```typescript
/**
 * 灰度图像数据
 */
export interface ImageData {
  /** 图像宽度（像素） */
  width: number;
  /** 图像高度（像素） */
  height: number;
  /** 灰度值数组，范围 [0, 255]，行优先存储 */
  data: Uint8Array;
}

/**
 * 采样块数据（归一化到 [0, 1]）
 */
export interface SamplingBlock {
  /** 块的归一化矩阵，shape: [matrixSize, matrixSize] */
  matrix: Float32Array;
  /** 块在源图像中的位置 */
  sourceX: number;
  sourceY: number;
}

/**
 * 二维采样数组
 */
export type SamplingArray = SamplingBlock[][];
```

### types/charset.ts

```typescript
/**
 * 字符类型
 */
export enum CharType {
  NORMAL = 'normal',     // 普通字符（单宽度）
  WIDE = 'wide'         // 宽字符（双宽度）
}

/**
 * 字符矩阵数据
 */
export interface CharMatrix {
  /** 字符本身 */
  char: string;
  /** 归一化灰度矩阵，范围 [0, 1] */
  matrix: Float32Array;
  /** 字符类型 */
  type: CharType;
  /** 矩阵宽度（普通字符=matrixSize，宽字符=2*matrixSize） */
  width: number;
  /** 矩阵高度（=matrixSize） */
  height: number;
}

/**
 * 预定义字符集
 */
export enum PresetCharset {
  ASCII = 'ASCII',                    // 基础ASCII
  EXTENDED = 'EXTENDED',              // 扩展ASCII + 常用符号
  CHINESE_SIMPLE = 'CHINESE_SIMPLE',  // 简体中文常用字
  CUSTOM = 'CUSTOM'                   // 自定义字符集
}

/**
 * 字符集配置
 */
export interface CharsetConfig {
  /** 字符集类型 */
  type: PresetCharset;
  /** 自定义字符（当type=CUSTOM时有效） */
  customChars?: string;
}
```

### types/config.ts

```typescript
/**
 * 插值算法
 */
export enum Interpolation {
  NEAREST = 'nearest',
  BILINEAR = 'bilinear',
  BICUBIC = 'bicubic',
  LANCZOS = 'lanczos'
}

/**
 * 字体样式
 */
export enum FontStyle {
  REGULAR = 'regular',
  BOLD = 'bold',
  ITALIC = 'italic',
  BOLD_ITALIC = 'bold-italic'
}

/**
 * 文本对齐方式
 */
export enum TextAlign {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right'
}

/**
 * 高度模式
 */
export enum HeightMode {
  LINE = 'line',    // 每行高度
  TOTAL = 'total'   // 总高度
}

/**
 * 艺术生成配置
 */
export interface ArtConfig {
  // === 尺寸配置 ===
  /** 输出高度（行数），与width二选一 */
  height?: number;
  /** 输出宽度（列数），与height二选一 */
  width?: number;

  // === 采样配置 ===
  /** 采样矩阵大小，默认6 */
  matrixSize: number;
  /** 垂直水平比例（字体高度/宽度），默认2.0 */
  ratio: number;
  /** 插值算法，默认bicubic */
  interpolation: Interpolation;

  // === 字符集配置 ===
  /** 字符集配置 */
  charset: CharsetConfig;

  // === 字体配置（文本模式） ===
  /** 字体名称或路径 */
  font?: string;
  /** 字体样式 */
  fontStyle?: FontStyle;
  /** 视觉字体渲染内边距/字号收缩量（像素） */
  fontReduce?: number;
  /** 字符间距 */
  charSpace?: number;

  // === 文本布局配置 ===
  /** 文本对齐方式 */
  textAlign?: TextAlign;
  /** 行间距（像素） */
  lineSpacing?: number;
  /** 高度模式 */
  heightMode?: HeightMode;

  // === 输出配置 ===
  /** 是否反转颜色（黑底白字） */
  invert: boolean;
  /** 是否去除行尾空格 */
  trimTrailingSpaces?: boolean;

  // === 性能配置 ===
  /** 是否启用早期终止优化 */
  enableEarlyTermination?: boolean;
  /** 最大并行任务数（0=自动） */
  maxParallelTasks?: number;
}

/**
 * 默认配置
 */
export const DEFAULT_CONFIG: Partial<ArtConfig> = {
  matrixSize: 6,
  ratio: 2.0,
  interpolation: Interpolation.BICUBIC,
  charset: {
    type: PresetCharset.ASCII
  },
  invert: false,
  fontReduce: 0,
  charSpace: 1,
  textAlign: TextAlign.LEFT,
  lineSpacing: 0,
  heightMode: HeightMode.LINE,
  trimTrailingSpaces: false,
  enableEarlyTermination: true,
  maxParallelTasks: 0
};
```

### types/output.ts

```typescript
/**
 * 输出格式
 */
export enum OutputFormat {
  PLAIN_TEXT = 'plain',    // 纯文本
  HTML = 'html',           // HTML（带样式）
  ANSI = 'ansi'            // ANSI转义码（彩色终端）
}

/**
 * 生成结果
 */
export interface ArtResult {
  /** 字符画字符串 */
  content: string;
  /** 输出格式 */
  format: OutputFormat;
  /** 实际输出行数 */
  rows: number;
  /** 实际输出列数 */
  cols: number;
  /** 生成耗时（毫秒） */
  duration: number;
  /** 元数据 */
  metadata: {
    sourceWidth: number;
    sourceHeight: number;
    charset: string;
    matrixSize: number;
  };
}

/**
 * 错误类型
 */
export class UnicodeArtError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'UnicodeArtError';
  }
}

export enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  FONT_NOT_FOUND = 'FONT_NOT_FOUND',
  IMAGE_LOAD_FAILED = 'IMAGE_LOAD_FAILED',
  INVALID_CONFIG = 'INVALID_CONFIG',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT'
}
```

---

## 🔧 核心模块实现要点

### 1. preprocessor.ts - 图像预处理

**关键函数**：

```typescript
/**
 * 加载图像文件并转换为灰度数据
 * @param imagePath 图像文件路径
 * @returns Promise<ImageData>
 */
export async function loadImage(imagePath: string): Promise<ImageData> {
  // 使用sharp加载图像
  const sharpInstance = sharp(imagePath);
  const metadata = await sharpInstance.metadata();

  // 转换为灰度
  const buffer = await sharpInstance
    .grayscale()
    .raw()
    .toBuffer();

  return {
    width: metadata.width!,
    height: metadata.height!,
    data: new Uint8Array(buffer)
  };
}

/**
 * 从文本生成图像
 * @param text 文本内容
 * @param config 配置选项
 * @returns Promise<ImageData>
 */
export async function renderTextToImage(
  text: string,
  config: ArtConfig
): Promise<ImageData> {
  // 使用canvas渲染文本
  const { createCanvas } = require('canvas');

  // 计算画布尺寸
  const fontSize = config.height || 100;
  const canvasWidth = estimateTextWidth(text, fontSize);
  const canvasHeight = fontSize;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // 设置字体
  ctx.font = `${fontSize}px ${config.font || 'Arial'}`;
  ctx.fillStyle = '#000000';
  ctx.textBaseline = 'top';

  // 绘制文本
  ctx.fillText(text, 0, 0);

  // 提取像素数据
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const grayData = rgbaToGrayscale(imageData.data);

  return {
    width: canvasWidth,
    height: canvasHeight,
    data: grayData
  };
}

/**
 * RGBA转灰度
 */
function rgbaToGrayscale(rgba: Uint8ClampedArray): Uint8Array {
  const length = rgba.length / 4;
  const gray = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    // ITU-R BT.601标准
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return gray;
}
```

---

### 2. sampler.ts - 采样数组生成

**关键函数**：

```typescript
/**
 * 计算采样块尺寸
 */
export function calculateBlockSize(
  sourceSize: number,
  outputSize: number,
  ratio: number
): number {
  const blockSize = Math.ceil(sourceSize / outputSize);
  return Math.max(1, blockSize); // 边界保护
}

/**
 * 生成采样数组
 * @param image 源图像
 * @param config 配置选项
 * @returns SamplingArray
 */
export function generateSamplingArray(
  image: ImageData,
  config: ArtConfig
): SamplingArray {
  const { height: outputHeight, width: outputWidth } = calculateOutputSize(image, config);
  const matrixSize = config.matrixSize;

  // 计算块尺寸
  const blockH = Math.ceil(image.height / outputHeight);
  const blockW = Math.ceil(image.width / (outputWidth * config.ratio));

  const samplingArray: SamplingArray = [];

  for (let row = 0; row < outputHeight; row++) {
    const rowData: SamplingBlock[] = [];

    for (let col = 0; col < outputWidth; col++) {
      // 提取块
      const sourceY = row * blockH;
      const sourceX = Math.floor(col * blockW * config.ratio);

      const block = extractBlock(image, sourceX, sourceY, blockW, blockH);

      // 缩放到matrixSize×matrixSize并归一化
      const normalized = resizeAndNormalize(block, matrixSize, config.interpolation);

      rowData.push({
        matrix: normalized,
        sourceX,
        sourceY
      });
    }

    samplingArray.push(rowData);
  }

  return samplingArray;
}

/**
 * 提取图像块（含边界填充）
 */
function extractBlock(
  image: ImageData,
  x: number,
  y: number,
  width: number,
  height: number
): Uint8Array {
  // TODO: 实现边界填充逻辑
  // 不足部分用白色（255）填充
}

/**
 * 缩放并归一化到 [0, 1]
 */
function resizeAndNormalize(
  block: Uint8Array,
  targetSize: number,
  interpolation: Interpolation
): Float32Array {
  // TODO: 使用sharp或自定义算法进行缩放
  // 归一化: value / 255.0
}
```

---

### 3. charRenderer.ts - 字符矩阵渲染

**关键函数**：

```typescript
/**
 * 渲染单个字符为灰度矩阵
 * @param char 字符
 * @param font 字体
 * @param size 矩阵尺寸
 * @param isWideChar 是否为宽字符
 * @returns Float32Array 归一化矩阵
 */
export function renderCharToMatrix(
  char: string,
  font: string,
  size: number,
  isWideChar: boolean = false
): Float32Array {
  const { createCanvas } = require('canvas');

  // 宽字符宽度翻倍
  const canvasWidth = isWideChar ? size * 2 : size;
  const canvasHeight = size;

  const canvas = createCanvas(canvasWidth, canvasHeight);
  const ctx = canvas.getContext('2d');

  // 白色背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // 黑色文字
  ctx.fillStyle = '#000000';
  ctx.font = `${size}px ${font}`;
  ctx.textBaseline = 'top';
  ctx.fillText(char, 0, 0);

  // 提取灰度数据
  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const grayData = rgbaToGrayscale(imageData.data);

  // 归一化到 [0, 1]
  const normalized = new Float32Array(grayData.length);
  for (let i = 0; i < grayData.length; i++) {
    normalized[i] = grayData[i] / 255.0;
  }

  return normalized;
}

/**
 * 预计算字符集的所有字符矩阵
 */
export function precomputeCharData(
  charset: string,
  font: string,
  matrixSize: number,
  ratio: number
): { normalChars: CharMatrix[], wideChars: CharMatrix[] } {
  const normalChars: CharMatrix[] = [];
  const wideChars: CharMatrix[] = [];

  for (const char of charset) {
    const isWide = isWideChar(char);
    const matrix = renderCharToMatrix(char, font, matrixSize, isWide);

    const charMatrix: CharMatrix = {
      char,
      matrix,
      type: isWide ? CharType.WIDE : CharType.NORMAL,
      width: isWide ? matrixSize * 2 : matrixSize,
      height: matrixSize
    };

    if (isWide) {
      wideChars.push(charMatrix);
    } else {
      normalChars.push(charMatrix);
    }
  }

  return { normalChars, wideChars };
}
```

---

### 4. matcher.ts - SAD匹配算法

**关键函数**：

```typescript
/**
 * 计算绝对差值之和（SAD）
 * @param block 采样块矩阵
 * @param charMatrix 字符矩阵
 * @param enableEarlyTermination 是否启用早期终止
 * @param currentBest 当前最优得分（用于早期终止）
 * @returns SAD得分
 */
export function calculateSAD(
  block: Float32Array,
  charMatrix: Float32Array,
  enableEarlyTermination: boolean = true,
  currentBest: number = Infinity
): number {
  let sum = 0;

  for (let i = 0; i < block.length; i++) {
    const diff = Math.abs(block[i] - charMatrix[i]);
    sum += diff;

    // 早期终止优化
    if (enableEarlyTermination && sum > currentBest) {
      return Infinity;
    }
  }

  return sum;
}

/**
 * 为采样块找到最匹配的字符
 * @param block 采样块
 * @param charData 字符数据列表
 * @param config 配置选项
 * @returns 最佳匹配字符
 */
export function findBestMatch(
  block: SamplingBlock,
  charData: CharMatrix[],
  config: ArtConfig
): CharMatrix {
  let bestChar: CharMatrix | null = null;
  let bestScore = Infinity;

  for (const charMatrix of charData) {
    const score = calculateSAD(
      block.matrix,
      charMatrix.matrix,
      config.enableEarlyTermination,
      bestScore
    );

    if (score < bestScore) {
      bestScore = score;
      bestChar = charMatrix;
    }
  }

  return bestChar!;
}

/**
 * 批量匹配（支持并行）
 */
export async function batchMatch(
  samplingArray: SamplingArray,
  charData: CharMatrix[],
  wideCharData: CharMatrix[],
  config: ArtConfig
): Promise<string[][]> {
  const allChars = [...charData, ...wideCharData];
  const result: string[][] = [];

  // TODO: 实现并行处理（Web Workers或worker_threads）
  for (const row of samplingArray) {
    const matchedRow: string[] = [];

    for (const block of row) {
      const bestChar = findBestMatch(block, allChars, config);
      matchedRow.push(bestChar.char);
    }

    result.push(matchedRow);
  }

  return result;
}
```

---

### 5. assembler.ts - 输出组装

**关键函数**：

```typescript
/**
 * 组装最终输出
 * @param matchedChars 匹配后的字符二维数组
 * @param config 配置选项
 * @returns ArtResult
 */
export function assembleOutput(
  matchedChars: string[][],
  config: ArtConfig
): ArtResult {
  const startTime = Date.now();

  const lines: string[] = [];

  for (const row of matchedChars) {
    let line = row.join('');

    // 可选：去除行尾空格
    if (config.trimTrailingSpaces) {
      line = line.trimEnd();
    }

    lines.push(line);
  }

  const content = lines.join('\n');
  const duration = Date.now() - startTime;

  return {
    content,
    format: OutputFormat.PLAIN_TEXT,
    rows: lines.length,
    cols: lines[0]?.length || 0,
    duration,
    metadata: {
      sourceWidth: 0, // TODO: 从输入获取
      sourceHeight: 0,
      charset: config.charset.type,
      matrixSize: config.matrixSize
    }
  };
}

/**
 * 转换为HTML格式
 */
export function toHTML(result: ArtResult, config: ArtConfig): string {
  // TODO: 实现HTML格式化（保留空格、换行）
  return `<pre style="font-family: monospace;">${escapeHTML(result.content)}</pre>`;
}

/**
 * 转换为ANSI彩色格式
 */
export function toANSI(result: ArtResult, config: ArtConfig): string {
  // TODO: 实现ANSI转义码（根据灰度值映射到终端颜色）
  return result.content;
}
```

---

## 🧪 测试策略

### 单元测试示例

```typescript
// tests/matcher.test.ts
import { calculateSAD } from '../src/matcher';

describe('calculateSAD', () => {
  it('should calculate correct SAD score', () => {
    const block = new Float32Array([0.1, 0.2, 0.3, 0.4]);
    const charMatrix = new Float32Array([0.1, 0.2, 0.3, 0.4]);

    const score = calculateSAD(block, charMatrix, false);
    expect(score).toBeCloseTo(0, 5);
  });

  it('should support early termination', () => {
    const block = new Float32Array([0.9, 0.9, 0.9, 0.9]);
    const charMatrix = new Float32Array([0.1, 0.1, 0.1, 0.1]);

    const score = calculateSAD(block, charMatrix, true, 1.0);
    expect(score).toBe(Infinity);
  });
});
```

### 对比测试（vs Python）

```typescript
// tests/comparison.test.ts
import { textToArt } from '../src/index';
import { readFileSync } from 'fs';

describe('Comparison with Python version', () => {
  it('should match Python output for simple text', () => {
    const pythonOutput = readFileSync('tests/fixtures/python_output.txt', 'utf-8');
    const jsOutput = textToArt('Hello', {
      font: 'Arial',
      height: 10,
      matrixSize: 6
    });

    // 允许1%的差异
    const similarity = calculateSimilarity(pythonOutput, jsOutput.content);
    expect(similarity).toBeGreaterThan(0.99);
  });
});
```

---

## 📊 性能基准

### 测试场景

| 场景 | 输入尺寸 | 目标耗时 | 备注 |
|------|---------|---------|------|
| 小文本 | 10字符, height=10 | < 100ms | 基础功能 |
| 中文本 | 50字符, height=20 | < 500ms | 常规使用 |
| 大图像 | 800×600, width=80 | < 2000ms | 性能考验 |
| 超大图像 | 1920×1080, width=120 | < 5000ms | 极限测试 |

### 优化检查清单

- [ ] 使用TypedArray替代普通数组
- [ ] 字符矩阵预计算并缓存
- [ ] SAD早期终止
- [ ] 避免不必要的对象创建
- [ ] 批量处理减少函数调用开销

---

## ✅ 验收标准

### 功能验收
- [ ] 所有公共API有完整的TypeScript类型定义
- [ ] 支持图片和文本两种输入模式
- [ ] 支持ASCII和自定义字符集
- [ ] 正确处理宽字符（中文、日文等）
- [ ] 支持颜色反转
- [ ] 输出格式支持纯文本、HTML、ANSI

### 质量验收
- [ ] 单元测试覆盖率 > 90%
- [ ] 与Python版本输出一致性 > 99%
- [ ] 无内存泄漏（通过heap snapshot验证）
- [ ] 所有函数有JSDoc注释

### 性能验收
- [ ] 达到性能基准目标的80%以上
- [ ] 大图像处理内存占用 < 100MB
- [ ] 无明显的GC停顿

### 文档验收
- [ ] README包含安装和使用示例
- [ ] API文档完整（typedoc生成）
- [ ] 至少3个实际使用示例

---

*下一步*: 完成Phase 1后，进入 [Phase 2: CLI程序开发](./phase2-cli.md)

*最后更新*: 2026-06-17 by Qoder
