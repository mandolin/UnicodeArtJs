import type { BoxOptions } from 'unicode-art-js';
import type { InsertMode } from '../output/resultWriter';

/**
 * 🟢 VS Code 扩展支持的 Core locale
 *
 * 🔹 由 VS Code 当前界面语言推导，用于 Core 错误信息和 Converter 文案。
 */
export type ExtensionLocale = 'zh-CN' | 'en-US';

/**
 * 🟢 VS Code 扩展内部统一配置
 *
 * 🔹 该结构汇总用户设置、默认模板、最近一次 Converter 配置和命令参数。
 * 🔹 字段命名与 Core 统一配置保持对齐，同时保留 `font` 作为旧视觉字体别名。
 */
export interface ExtensionArtConfig {
  /** 输出高度，单位为字符画行。 */
  height: number;
  /** 可选输出宽度，单位为字符画列。 */
  width: number | undefined;
  /** 预设或自定义字符集名称。 */
  charset: string;
  /** 自定义字符集内容。 */
  customChars: string;
  /** 视觉字体，控制输入文字栅格化。 */
  visualFont: string;
  /** 旧版视觉字体别名，保留用于兼容既有设置。 */
  font: string;
  /** 字素字体，控制预览和 HTML 导出的字符画显示。 */
  glyphFont: string;
  /** 字素宽度规则名称。 */
  glyphWidthProfile: string;
  /** 可选宽字符正则覆盖。 */
  wideCharRegex: string;
  /** 采样矩阵边长。 */
  matrixSize: number;
  /** 字符画宽高比。 */
  ratio: number;
  /** 是否反色。 */
  invert: boolean;
  /** 视觉字体渲染收缩量。 */
  fontReduce: number;
  /** 是否裁剪行尾空格。 */
  trimTrailingSpaces: boolean;
  /** 裱框配置；`false` 表示禁用。 */
  box: false | BoxOptions;
  /** 生成结果写回编辑器或剪贴板的方式。 */
  insertMode: InsertMode;
  /** 当前预设名。 */
  preset: string;
  /** Core locale。 */
  locale: ExtensionLocale;
  /** 输出宿主固定为 VS Code。 */
  outputTarget: 'vscode';
}
