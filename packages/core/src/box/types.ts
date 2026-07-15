/**
 * ============================================================================
 * Box feature type definitions
 * ============================================================================
 *
 * Box options describe text decoration around generated unicode art glyphs.
 * The first implementation only renders an outer post-processing box, while
 * the type model reserves layout/grid concepts for later box phases.
 *
 * @module box/types
 * @since 1.0.0
 * ============================================================================
 */

//#region Public option types

/**
 * 🟢 裱框模式
 *
 * 🔹 `outer` 是当前稳定模式；`lines`、`cells`、`grid` 为后续语义表格和单元格阶段预留。
 */
export type BoxMode = 'outer' | 'lines' | 'cells' | 'grid';

/**
 * 🟢 裱框渲染阶段
 *
 * 🔹 `post` 表示字符画生成后再裱框；`layout` 预留给生成前参与布局的高级模式。
 */
export type BoxRenderStage = 'post' | 'layout';

/**
 * 🟢 水平对齐方式
 */
export type BoxAlign = 'left' | 'center' | 'right';

/**
 * 🟢 垂直对齐方式
 */
export type BoxVerticalAlign = 'top' | 'middle' | 'bottom';

/**
 * 🟢 内容溢出策略
 */
export type BoxOverflow = 'expand' | 'truncate' | 'wrap';

/**
 * 🟢 内置裱框样式名称
 *
 * 🔹 Names for built-in border styles. `none` keeps layout spacing while hiding border glyphs.
 */
export type BoxStyleName =
  | 'single'
  | 'double'
  | 'round'
  | 'bold'
  | 'classic'
  | 'ascii'
  | 'singleDouble'
  | 'doubleSingle'
  | 'arrow'
  | 'block'
  | 'thick'
  | 'none';

/**
 * 🟢 四边距数值
 */
export interface BoxSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * 🟢 间距输入值
 *
 * 🔹 可传单个数字表示四边相同，也可只覆盖某几条边。
 */
export type SpacingValue = number | Partial<BoxSpacing>;

/**
 * 🟢 自定义裱框字符定义
 *
 * 🔹 用于覆盖角、边、交叉点和连接点字符。
 */
export interface BoxStyleDefinition {
  topLeft?: string;
  top?: string;
  topRight?: string;
  right?: string;
  bottomRight?: string;
  bottom?: string;
  bottomLeft?: string;
  left?: string;
  horizontal?: string;
  vertical?: string;
  cross?: string;
  topJoin?: string;
  bottomJoin?: string;
  leftJoin?: string;
  rightJoin?: string;
}

/**
 * 🟢 裱框标题配置
 */
export interface BoxTitleOptions {
  text: string;
  align?: BoxAlign;
  position?: 'top' | 'bottom';
  padding?: number;
}

/**
 * 🟢 分隔线配置
 *
 * 🔹 当前稳定实现主要面向外框；行列分隔属于后续语义表格阶段。
 */
export interface BoxSeparatorOptions {
  rows?: boolean | number[];
  columns?: boolean | number[];
  style?: BoxStyleName | BoxStyleDefinition;
}

/**
 * 🟢 单元格配置
 *
 * 🔹 为后续 cell/grid 模式预留的单元格尺寸和内边距模型。
 */
export interface BoxCellOptions {
  enabled?: boolean;
  padding?: SpacingValue;
  minWidth?: number;
  minHeight?: number;
}

/**
 * 🟢 阴影配置
 */
export interface BoxShadowOptions {
  style?: 'light' | 'heavy' | 'block';
  offsetX?: number;
  offsetY?: number;
}

/**
 * 🟢 裱框总配置对象
 *
 * 🔹 Core API 与 CLI 的 `--box` JSON 都围绕此结构组织。
 * 🔹 The stable path supports an outer post-processing box; advanced layout modes remain reserved.
 */
export interface BoxOptions {
  enabled?: boolean;
  mode?: BoxMode;
  renderStage?: BoxRenderStage;
  style?: BoxStyleName | BoxStyleDefinition;
  padding?: SpacingValue;
  margin?: SpacingValue;
  align?: BoxAlign;
  verticalAlign?: BoxVerticalAlign;
  width?: number | 'auto';
  height?: number | 'auto';
  title?: string | BoxTitleOptions;
  separators?: BoxSeparatorOptions;
  cell?: BoxCellOptions;
  shadow?: false | true | BoxShadowOptions;
  overflow?: BoxOverflow;
  experimental?: Record<string, unknown>;
}

/**
 * 🟢 归一化后的裱框字符表
 *
 * 🔹 每个字段都是最终绘制时使用的单个边框或连接字素。
 */
export interface BoxChars {
  topLeft: string;
  top: string;
  topRight: string;
  right: string;
  bottomRight: string;
  bottom: string;
  bottomLeft: string;
  left: string;
  horizontal: string;
  vertical: string;
  cross: string;
  topJoin: string;
  bottomJoin: string;
  leftJoin: string;
  rightJoin: string;
}

/**
 * 🟢 内置样式元数据
 */
export interface BoxStyleMetadata {
  name: BoxStyleName;
  label: string;
  description: string;
  asciiOnly: boolean;
}

/**
 * 🟢 归一化后的标题配置
 */
export interface NormalizedBoxTitleOptions {
  text: string;
  align: BoxAlign;
  position: 'top' | 'bottom';
  padding: number;
}

/**
 * 🟢 归一化后的阴影配置
 */
export interface NormalizedBoxShadowOptions {
  style: 'light' | 'heavy' | 'block';
  offsetX: number;
  offsetY: number;
  char: string;
}

/**
 * 🟢 归一化后的完整裱框配置
 *
 * 🔹 内部渲染函数使用该结构，所有默认值和样式字符都已经展开。
 */
export interface NormalizedBoxOptions {
  enabled: boolean;
  mode: BoxMode;
  renderStage: BoxRenderStage;
  styleName?: BoxStyleName;
  chars: BoxChars;
  padding: BoxSpacing;
  margin: BoxSpacing;
  align: BoxAlign;
  verticalAlign: BoxVerticalAlign;
  width: number | 'auto';
  height: number | 'auto';
  overflow: BoxOverflow;
  title?: NormalizedBoxTitleOptions;
  shadow: false | NormalizedBoxShadowOptions;
}

//#endregion
