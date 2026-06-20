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

export type BoxMode = 'outer' | 'lines' | 'cells' | 'grid';

export type BoxRenderStage = 'post' | 'layout';

export type BoxAlign = 'left' | 'center' | 'right';

export type BoxVerticalAlign = 'top' | 'middle' | 'bottom';

export type BoxOverflow = 'expand' | 'truncate' | 'wrap';

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

export interface BoxSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type SpacingValue = number | Partial<BoxSpacing>;

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

export interface BoxTitleOptions {
  text: string;
  align?: BoxAlign;
  position?: 'top' | 'bottom';
  padding?: number;
}

export interface BoxSeparatorOptions {
  rows?: boolean | number[];
  columns?: boolean | number[];
  style?: BoxStyleName | BoxStyleDefinition;
}

export interface BoxCellOptions {
  enabled?: boolean;
  padding?: SpacingValue;
  minWidth?: number;
  minHeight?: number;
}

export interface BoxShadowOptions {
  style?: 'light' | 'heavy' | 'block';
  offsetX?: number;
  offsetY?: number;
}

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

export interface BoxStyleMetadata {
  name: BoxStyleName;
  label: string;
  description: string;
  asciiOnly: boolean;
}

export interface NormalizedBoxTitleOptions {
  text: string;
  align: BoxAlign;
  position: 'top' | 'bottom';
  padding: number;
}

export interface NormalizedBoxShadowOptions {
  style: 'light' | 'heavy' | 'block';
  offsetX: number;
  offsetY: number;
  char: string;
}

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
