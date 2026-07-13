/**
 * ============================================================================
 * 🟦 语义文档类型
 * ============================================================================
 *
 * 🔶 模块职责
 * 定义与 CLI、Web、VS Code、桌面应用无关的版本化语义文档 AST。
 * 这是实验性布局功能的 canonical 数据模型；轻量 DSL 与 Markdown 仅是导入层。
 * ============================================================================
 */

import type { ArtConfig } from './config';
import type { ArtResult } from './output';
import type { BoxAlign, BoxVerticalAlign } from '../box/types';

//#region 🟦 文档 AST

/** 当前公开的语义文档版本。 */
export type SemanticDocumentVersion = 1;

/** 表格行在文档中的语义角色。 */
export type SemanticRowRole = 'header' | 'body' | 'footer';

/** 单元格在行列标题体系中的语义角色。 */
export type SemanticCellRole = 'corner' | 'row-header' | 'column-header' | 'body' | 'footer';

/** 文本块的显示方式。 */
export type SemanticBlockDisplay = 'inline' | 'block';

/** 需要字素化转换的输入文本块。 */
export interface SemanticArtTextBlock {
  kind: 'art-text';
  text: string;
  /** 仅覆盖该 block 的艺术生成配置，不可改变文档布局规则。 */
  options?: Partial<ArtConfig>;
  /** 多个 inline block 在同一单元格内从左到右组装；缺省为 inline。 */
  display?: SemanticBlockDisplay;
}

/** 保持原字直接输出的文本块。 */
export interface SemanticRawTextBlock {
  kind: 'raw-text';
  text: string;
  /** 多个 inline block 在同一单元格内从左到右组装；缺省为 inline。 */
  display?: SemanticBlockDisplay;
}

/** 可由布局引擎识别的基础内容块。 */
export type SemanticBlock = SemanticArtTextBlock | SemanticRawTextBlock;

/** 一个可跨行、跨列的文档单元格。 */
export interface SemanticCell {
  /** 跨越的逻辑行数，缺省为 1。 */
  rowSpan?: number;
  /** 跨越的逻辑列数，缺省为 1。 */
  colSpan?: number;
  /** 单元格内容块，按出现顺序组装。 */
  blocks: SemanticBlock[];
  /** 单元格内的水平对齐方式。 */
  align?: BoxAlign;
  /** 单元格内的垂直对齐方式。 */
  verticalAlign?: BoxVerticalAlign;
  /** 行、列标题等语义提示，不直接决定视觉样式。 */
  role?: SemanticCellRole;
  /** 为未来扩展预留的显式命名空间。 */
  extensions?: Record<string, unknown>;
}

/** 一行语义单元格。 */
export interface SemanticRow {
  /** 表头、正文或页脚角色。 */
  role?: SemanticRowRole;
  cells: SemanticCell[];
  /** 为未来扩展预留的显式命名空间。 */
  extensions?: Record<string, unknown>;
}

/** 文档级可选设置。 */
export interface SemanticDocumentOptions {
  /** 与普通 ArtConfig 对齐的字素宽度 profile。 */
  glyphWidthProfile?: string;
  /** 完整宽字素字符类规则，优先于 profile。 */
  wideCharRegex?: string;
  /** 为未来扩展预留的显式命名空间。 */
  extensions?: Record<string, unknown>;
}

/**
 * 🟢 版本化语义文档
 *
 * 🔹 版本 1 仅定义结构与基础块，不把任何 DSL tag 写进 AST。
 * 🔹 新版本必须新增明确的 version，而不是改变 V1 字段含义。
 */
export interface SemanticDocumentV1 {
  version: SemanticDocumentVersion;
  rows: SemanticRow[];
  options?: SemanticDocumentOptions;
  /** 为未来扩展预留的显式命名空间。 */
  extensions?: Record<string, unknown>;
}

/** 当前 Core 可接受的语义文档类型。 */
export type SemanticDocument = SemanticDocumentV1;

//#endregion

//#region 🟦 解析与渲染辅助类型

/** DSL 的行边界来源。 */
export type SemanticRowSeparatorMode = 'lineBreak' | 'semantic' | 'both';

/** 轻量 DSL 解析配置。 */
export interface SemanticDslParseOptions {
  /** 行分隔策略，缺省为标准换行。 */
  rowSeparator?: SemanticRowSeparatorMode;
  /** 单元格分隔符，缺省为 `|`。 */
  columnSeparator?: string;
  /** 解析错误的 locale。 */
  locale?: string;
}

/** JSON AST 解析配置。 */
export interface SemanticJsonParseOptions {
  /** 解析错误的 locale。 */
  locale?: string;
}

/** 单元格布局引擎可使用的局部选项。 */
export interface SemanticRenderOptions {
  /** 单元格之间是否绘制边框。缺省由调用者的 box 配置决定。 */
  grid?: boolean;
}

/** 由 Node、浏览器或其他宿主提供的艺术文本渲染回调。 */
export type SemanticArtTextRenderer = (text: string, config: ArtConfig) => Promise<ArtResult>;

//#endregion
