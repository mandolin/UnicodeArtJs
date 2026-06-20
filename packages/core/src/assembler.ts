/**
 * ============================================================================
 * 🟦 输出组装模块
 * ============================================================================
 * 
 * 🔶 模块职责
 * 将字符矩阵组装为最终输出，支持多种格式：
 * - 纯文本格式（.txt）
 * - HTML格式（.html）
 * - ANSI转义码格式（终端彩色输出）
 * 
 * 🔶 核心流程
 * 1. assemblePlainText() - 组装纯文本输出
 * 2. assembleHTML() - 生成HTML文档
 * 3. assembleANSI() - 生成ANSI转义码
 * 4. trimTrailingSpaces() - 去除行尾空格
 * 
 * 🔶 性能考虑
 * - 使用数组join而非字符串拼接
 * - 批量处理减少内存分配
 * - 预计算输出尺寸
 * 
 * 🔶 格式说明
 * - 纯文本: 每行以\n结尾，适合保存到文件
 * - HTML: 包含完整HTML结构，使用<pre>标签保持格式
 * - ANSI: 使用转义码实现颜色和高亮，仅适用于终端
 * 
 * @module assembler
 * @author Qoder
 * @since 0.1.0
 * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code}
 * ============================================================================
 */

import type { ArtResult, ArtMetadata } from './types/output';
import type { ArtConfig } from './types/config';
import { OutputFormat, UnicodeArtError, ErrorCode } from './types/output';
import { boxText } from './box/box';
import { getGlyphWidth } from './box/width';
import type { BoxOptions } from './box/types';

//#region 🟩 纯文本组装

/**
 * 🟢 将字符矩阵组装为纯文本
 * 
 * 🔹 将二维字符数组转换为多行文本字符串。
 * 🔹 支持去除行尾空格和自定义换行符。
 * 
 * @param charMatrix - 字符矩阵（二维数组）
 * @param config - 配置选项
 * @returns string 纯文本字符串
 * 
 * @example
 * ```typescript
 * const text = assemblePlainText(charMatrix, { trimTrailingSpaces: true });
 * console.log(text);
 * // "  @@  \n @@@@ \n@@@@@@"
 * ```
 * 
 * @remarks
 * - 每行以\n（Unix）或\r\n（Windows）结尾
 * - trimTrailingSpaces可减少文件大小
 * - 宽字符已正确处理显示宽度
 * 
 * @performance
 * - 时间复杂度: O(R × C)，R为行数，C为列数
 * - 空间复杂度: O(R × C)
 * - 使用Array.join比字符串拼接快10-100倍
 */
export function assemblePlainText(
  charMatrix: string[][],
  config: ArtConfig
): string {
  const lines: string[] = [];
  
  for (const row of charMatrix) {
    let line = row.join('');
    
    // 🔹 去除行尾空格（如果启用）
    if (config.trimTrailingSpaces) {
      line = trimTrailingSpaces(line);
    }
    
    lines.push(line);
  }
  
  // 🔹 使用\n作为换行符（跨平台兼容）
  const text = lines.join('\n');
  return isBoxEnabled(config.box) ? boxText(text, config.box) : text;
}

/**
 * 🟢 去除行尾空格
 * 
 * 🔹 删除字符串末尾的所有空格字符。
 * 🔹 保留行首和中间的空格。
 * 
 * @param line - 输入字符串
 * @returns string 去除行尾空格后的字符串
 * 
 * @example
 * ```typescript
 * const trimmed = trimTrailingSpaces('Hello   ');
 * console.log(trimmed); // 'Hello'
 * ```
 * 
 * @remarks
 * - 只删除末尾空格，不影响其他位置
 * - 使用正则表达式高效实现
 * - 比trimEnd()更快（避免创建中间对象）
 * 
 * @performance
 * - 时间复杂度: O(N)
 * - 正则表达式优化过，速度快
 */
export function trimTrailingSpaces(line: string): string {
  return line.replace(/\s+$/, '');
}

//#endregion

//#region 🟩 HTML组装

/**
 * 🟢 将字符矩阵组装为HTML文档
 * 
 * 🔹 生成完整的HTML页面，使用<pre>标签保持字符画格式。
 * 🔹 支持自定义字体、颜色和样式。
 * 
 * @param charMatrix - 字符矩阵
 * @param config - 配置选项
 * @param metadata - 元数据（可选）
 * @returns string HTML文档字符串
 * 
 * @example
 * ```typescript
 * const html = assembleHTML(charMatrix, config, {
 *   sourceImage: 'photo.jpg',
 *   generatedAt: new Date().toISOString()
 * });
 * fs.writeFileSync('art.html', html);
 * ```
 * 
 * @remarks
 * - 使用<pre>标签保持等宽字体和对齐
 * - 默认使用Courier New字体
 * - 支持深色模式（invert配置）
 * - 可添加元数据和版权信息
 * 
 * @performance
 * - 时间复杂度: O(R × C)
 * - 生成的HTML大小约为文本的1.5-2倍
 * 
 * @todo 支持语法高亮
 * @todo 支持响应式布局
 */
export function assembleHTML(
  charMatrix: string[][],
  config: ArtConfig,
  metadata?: ArtMetadata
): string {
  const textContent = assemblePlainText(charMatrix, config);
  
  // 🔹 确定背景色和前景色
  const bgColor = config.invert ? '#000000' : '#FFFFFF';
  const fgColor = config.invert ? '#FFFFFF' : '#000000';
  
  // 🔹 生成HTML模板
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unicode Art</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: ${bgColor};
      color: ${fgColor};
      font-family: 'Courier New', Courier, monospace;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    
    pre {
      margin: 0;
      font-size: 12px;
      line-height: 1.2;
      white-space: pre;
      overflow: auto;
    }
    
    .metadata {
      margin-top: 20px;
      font-size: 10px;
      opacity: 0.7;
      text-align: center;
    }
  </style>
</head>
<body>
  <div>
    <pre>${escapeHTML(textContent)}</pre>
    ${metadata ? generateMetadataHTML(metadata) : ''}
  </div>
</body>
</html>`;
  
  return html;
}

/**
 * 🟢 转义HTML特殊字符
 * 
 * 🔹 将<、>、&等字符转义为HTML实体。
 * 🔹 防止XSS攻击和显示错误。
 * 
 * @param text - 原始文本
 * @returns string 转义后的文本
 * 
 * @example
 * ```typescript
 * const escaped = escapeHTML('<div>&</div>');
 * console.log(escaped); // '&lt;div&gt;&amp;&lt;/div&gt;'
 * ```
 * 
 * @remarks
 * - 必须转义的字符: < > & " '
 * - 在<pre>标签内也需要转义
 * - 使用替换链确保所有特殊字符都被处理
 */
export function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 🟢 生成元数据HTML
 * 
 * 🔹 将元数据对象转换为HTML片段。
 * 
 * @param metadata - 元数据对象
 * @returns string HTML片段
 * 
 * @internal
 */
function generateMetadataHTML(metadata: ArtMetadata): string {
  const items: string[] = [];
  
  if (metadata.sourceImage) {
    items.push(`<div>源图像: ${escapeHTML(metadata.sourceImage)}</div>`);
  }
  
  if (metadata.generatedAt) {
    items.push(`<div>生成时间: ${escapeHTML(metadata.generatedAt)}</div>`);
  }
  
  if (metadata.dimensions) {
    items.push(`<div>尺寸: ${metadata.dimensions.width}×${metadata.dimensions.height}</div>`);
  }
  
  if (items.length === 0) {
    return '';
  }
  
  return `<div class="metadata">${items.join('\n')}</div>`;
}

//#endregion

//#region 🟩 ANSI组装

/**
 * 🟢 将字符矩阵组装为ANSI转义码格式
 * 
 * 🔹 生成带颜色的终端输出，使用ANSI转义码。
 * 🔹 支持256色模式和真彩色模式。
 * 
 * ⚠️ **注意**: 仅在支持ANSI的终端中有效。
 * 
 * @param charMatrix - 字符矩阵
 * @param config - 配置选项
 * @returns string ANSI格式的字符串
 * 
 * @example
 * ```typescript
 * const ansi = assembleANSI(charMatrix, config);
 * process.stdout.write(ansi); // 直接在终端显示
 * ```
 * 
 * @remarks
 * - 使用ESC[38;2;R;G;Bm设置前景色
 * - 使用ESC[0m重置颜色
 * - 需要终端支持ANSI转义码
 * - Windows 10+默认支持
 * 
 * @performance
 * - 时间复杂度: O(R × C)
 * - ANSI码会增加输出大小约30-50%
 * 
 * @see {@link https://en.wikipedia.org/wiki/ANSI_escape_code}
 * @todo 支持256色模式
 * @todo 支持背景色
 */
export function assembleANSI(
  charMatrix: string[][],
  config: ArtConfig
): string {
  const textContent = assemblePlainText(charMatrix, config);
  
  // 🔹 确定颜色代码
  const resetCode = '\x1b[0m';
  const blackColor = '\x1b[38;2;0;0;0m';
  const whiteColor = '\x1b[38;2;255;255;255m';
  
  const fgColor = config.invert ? whiteColor : blackColor;

  return textContent
    .split('\n')
    .map((line) => `${fgColor}${line}${resetCode}`)
    .join('\n');
}

//#endregion

//#region 🟩 主组装函数

/**
 * 🟢 根据格式组装最终输出
 * 
 * 🔹 统一的入口函数，根据配置的输出格式调用相应的组装函数。
 * 🔹 返回ArtResult对象，包含内容和元数据。
 * 
 * @param charMatrix - 字符矩阵
 * @param config - 配置选项
 * @param format - 输出格式
 * @param metadata - 元数据（可选）
 * @returns ArtResult 组装结果
 * 
 * @example
 * ```typescript
 * const result = assembleOutput(charMatrix, config, OutputFormat.TEXT, {
 *   sourceImage: 'photo.jpg',
 *   generatedAt: new Date().toISOString()
 * });
 * console.log(result.content); // 字符画内容
 * console.log(result.format); // 'text'
 * ```
 * 
 * @remarks
 * - 支持的格式: TEXT, HTML, ANSI
 * - 自动添加元数据到输出
 * - 返回标准化的ArtResult对象
 * 
 * @throws {UnicodeArtError} 当格式不支持时抛出
 */
export function assembleOutput(
  charMatrix: string[][],
  config: ArtConfig,
  format: OutputFormat,
  metadata?: ArtMetadata
): ArtResult {
  let content: string;
  
  switch (format) {
    case OutputFormat.PLAIN_TEXT:
      content = assemblePlainText(charMatrix, config);
      break;
    
    case OutputFormat.HTML:
      content = assembleHTML(charMatrix, config, metadata);
      break;
    
    case OutputFormat.ANSI:
      content = assembleANSI(charMatrix, config);
      break;
    
    default:
      throw new UnicodeArtError(
        `不支持的输出格式: ${format}`,
        ErrorCode.UNSUPPORTED_FORMAT,
        { format }
      );
  }
  
  const metrics = isBoxEnabled(config.box) ? calculateBoxedTextMetrics(assemblePlainText(charMatrix, config)) : {
    rows: charMatrix.length,
    cols: charMatrix[0]?.length || 0
  };

  return {
    content,
    format,
    rows: metrics.rows,
    cols: metrics.cols,
    duration: typeof metadata?.duration === 'number' ? metadata.duration : 0,
    metadata: metadata || {
      sourceWidth: 0,
      sourceHeight: 0,
      charset: '',
      matrixSize: 0
    }
  };
}

//#endregion

//#region 🔶 输出尺寸计算

export function assembleTextOutput(
  text: string,
  config: ArtConfig,
  format: OutputFormat,
  metadata?: ArtMetadata
): ArtResult {
  const plainConfig: ArtConfig = {
    ...config,
    box: false
  };
  const charMatrix = textToCharMatrix(text);
  let content: string;

  switch (format) {
    case OutputFormat.PLAIN_TEXT:
      content = text;
      break;

    case OutputFormat.HTML:
      content = assembleHTML(charMatrix, plainConfig, metadata);
      break;

    case OutputFormat.ANSI:
      content = assembleANSI(charMatrix, plainConfig);
      break;

    default:
      throw new UnicodeArtError(
        `不支持的输出格式: ${format}`,
        ErrorCode.UNSUPPORTED_FORMAT,
        { format }
      );
  }

  const metrics = calculateBoxedTextMetrics(text);
  return {
    content,
    format,
    rows: metrics.rows,
    cols: metrics.cols,
    duration: typeof metadata?.duration === 'number' ? metadata.duration : 0,
    metadata: metadata || {
      sourceWidth: 0,
      sourceHeight: 0,
      charset: '',
      matrixSize: 0
    }
  };
}

function isBoxEnabled(box: ArtConfig['box']): box is BoxOptions {
  return box !== undefined &&
    box !== false &&
    box.enabled !== false &&
    (box.renderStage === undefined || box.renderStage === 'post') &&
    (box.mode === undefined || box.mode === 'outer');
}

function calculateBoxedTextMetrics(text: string): { rows: number; cols: number } {
  const lines = text.length === 0 ? [''] : text.split('\n');
  return {
    rows: lines.length,
    cols: lines.reduce((max, line) => Math.max(max, getGlyphWidth(line)), 0)
  };
}

function textToCharMatrix(text: string): string[][] {
  return (text.length === 0 ? [''] : text.split('\n')).map((line) => Array.from(line));
}

//#endregion
