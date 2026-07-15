/**
 * ============================================================================
 * Built-in box styles
 * ============================================================================
 *
 * The style table follows the same data shape as cli-boxes, but is kept local
 * so core does not depend on terminal-oriented packages.
 *
 * @module box/styles
 * @since 1.0.0
 * ============================================================================
 */

import type { BoxChars, BoxStyleDefinition, BoxStyleMetadata, BoxStyleName } from './types';

//#region Built-in style table

export const BOX_STYLES: Record<BoxStyleName, BoxChars> = {
  single: {
    topLeft: '┌',
    top: '─',
    topRight: '┐',
    right: '│',
    bottomRight: '┘',
    bottom: '─',
    bottomLeft: '└',
    left: '│',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    topJoin: '┬',
    bottomJoin: '┴',
    leftJoin: '├',
    rightJoin: '┤'
  },
  double: {
    topLeft: '╔',
    top: '═',
    topRight: '╗',
    right: '║',
    bottomRight: '╝',
    bottom: '═',
    bottomLeft: '╚',
    left: '║',
    horizontal: '═',
    vertical: '║',
    cross: '╬',
    topJoin: '╦',
    bottomJoin: '╩',
    leftJoin: '╠',
    rightJoin: '╣'
  },
  round: {
    topLeft: '╭',
    top: '─',
    topRight: '╮',
    right: '│',
    bottomRight: '╯',
    bottom: '─',
    bottomLeft: '╰',
    left: '│',
    horizontal: '─',
    vertical: '│',
    cross: '┼',
    topJoin: '┬',
    bottomJoin: '┴',
    leftJoin: '├',
    rightJoin: '┤'
  },
  bold: {
    topLeft: '┏',
    top: '━',
    topRight: '┓',
    right: '┃',
    bottomRight: '┛',
    bottom: '━',
    bottomLeft: '┗',
    left: '┃',
    horizontal: '━',
    vertical: '┃',
    cross: '╋',
    topJoin: '┳',
    bottomJoin: '┻',
    leftJoin: '┣',
    rightJoin: '┫'
  },
  classic: {
    topLeft: '+',
    top: '-',
    topRight: '+',
    right: '|',
    bottomRight: '+',
    bottom: '-',
    bottomLeft: '+',
    left: '|',
    horizontal: '-',
    vertical: '|',
    cross: '+',
    topJoin: '+',
    bottomJoin: '+',
    leftJoin: '+',
    rightJoin: '+'
  },
  ascii: {
    topLeft: '+',
    top: '-',
    topRight: '+',
    right: '|',
    bottomRight: '+',
    bottom: '-',
    bottomLeft: '+',
    left: '|',
    horizontal: '-',
    vertical: '|',
    cross: '+',
    topJoin: '+',
    bottomJoin: '+',
    leftJoin: '+',
    rightJoin: '+'
  },
  singleDouble: {
    topLeft: '╓',
    top: '─',
    topRight: '╖',
    right: '║',
    bottomRight: '╜',
    bottom: '─',
    bottomLeft: '╙',
    left: '║',
    horizontal: '─',
    vertical: '║',
    cross: '╫',
    topJoin: '╥',
    bottomJoin: '╨',
    leftJoin: '╟',
    rightJoin: '╢'
  },
  doubleSingle: {
    topLeft: '╒',
    top: '═',
    topRight: '╕',
    right: '│',
    bottomRight: '╛',
    bottom: '═',
    bottomLeft: '╘',
    left: '│',
    horizontal: '═',
    vertical: '│',
    cross: '╪',
    topJoin: '╤',
    bottomJoin: '╧',
    leftJoin: '╞',
    rightJoin: '╡'
  },
  arrow: {
    topLeft: '↘',
    top: '→',
    topRight: '↙',
    right: '↓',
    bottomRight: '↖',
    bottom: '←',
    bottomLeft: '↗',
    left: '↑',
    horizontal: '→',
    vertical: '↓',
    cross: '✢',
    topJoin: '┬',
    bottomJoin: '┴',
    leftJoin: '├',
    rightJoin: '┤'
  },
  block: {
    topLeft: '█',
    top: '▀',
    topRight: '█',
    right: '█',
    bottomRight: '█',
    bottom: '▄',
    bottomLeft: '█',
    left: '█',
    horizontal: '▀',
    vertical: '█',
    cross: '█',
    topJoin: '█',
    bottomJoin: '█',
    leftJoin: '█',
    rightJoin: '█'
  },
  thick: {
    topLeft: '┏',
    top: '━',
    topRight: '┓',
    right: '┃',
    bottomRight: '┛',
    bottom: '━',
    bottomLeft: '┗',
    left: '┃',
    horizontal: '━',
    vertical: '┃',
    cross: '╋',
    topJoin: '┳',
    bottomJoin: '┻',
    leftJoin: '┣',
    rightJoin: '┫'
  },
  none: {
    topLeft: '',
    top: '',
    topRight: '',
    right: '',
    bottomRight: '',
    bottom: '',
    bottomLeft: '',
    left: '',
    horizontal: '',
    vertical: '',
    cross: '',
    topJoin: '',
    bottomJoin: '',
    leftJoin: '',
    rightJoin: ''
  }
};

export const BOX_STYLE_METADATA: Record<BoxStyleName, BoxStyleMetadata> = {
  single: {
    name: 'single',
    label: 'Single',
    description: 'Single-line Unicode border.',
    asciiOnly: false
  },
  double: {
    name: 'double',
    label: 'Double',
    description: 'Double-line Unicode border.',
    asciiOnly: false
  },
  round: {
    name: 'round',
    label: 'Round',
    description: 'Rounded Unicode border.',
    asciiOnly: false
  },
  bold: {
    name: 'bold',
    label: 'Bold',
    description: 'Heavy Unicode border.',
    asciiOnly: false
  },
  classic: {
    name: 'classic',
    label: 'Classic',
    description: 'Classic ASCII border.',
    asciiOnly: true
  },
  ascii: {
    name: 'ascii',
    label: 'ASCII',
    description: 'Plain ASCII border.',
    asciiOnly: true
  },
  singleDouble: {
    name: 'singleDouble',
    label: 'Single Double',
    description: 'Single horizontal and double vertical border.',
    asciiOnly: false
  },
  doubleSingle: {
    name: 'doubleSingle',
    label: 'Double Single',
    description: 'Double horizontal and single vertical border.',
    asciiOnly: false
  },
  arrow: {
    name: 'arrow',
    label: 'Arrow',
    description: 'Directional arrow-style border.',
    asciiOnly: false
  },
  block: {
    name: 'block',
    label: 'Block',
    description: 'Solid block border.',
    asciiOnly: false
  },
  thick: {
    name: 'thick',
    label: 'Thick',
    description: 'Thick Unicode border.',
    asciiOnly: false
  },
  none: {
    name: 'none',
    label: 'None',
    description: 'No visible border characters.',
    asciiOnly: true
  }
};

//#endregion

//#region Style helpers

/**
 * 🟢 判断输入值是否为内置裱框样式名
 *
 * @param value - 待检测的任意值。
 * @returns `true` 表示该值是 `BoxStyleName`。
 */
export function isBoxStyleName(value: unknown): value is BoxStyleName {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(BOX_STYLES, value);
}

/**
 * 🟢 获取所有内置裱框样式名
 *
 * @returns 内置样式名数组，顺序与样式表定义保持一致。
 */
export function getBoxStyleNames(): BoxStyleName[] {
  return Object.keys(BOX_STYLES) as BoxStyleName[];
}

/**
 * 🟢 获取裱框样式元数据
 *
 * @param style - 可选样式名；未传入时返回全部样式元数据。
 * @returns 单个样式元数据或全部样式元数据数组。
 */
export function getBoxStyleMetadata(style?: BoxStyleName): BoxStyleMetadata | BoxStyleMetadata[] {
  if (style !== undefined) {
    return BOX_STYLE_METADATA[style];
  }

  return getBoxStyleNames().map((name) => BOX_STYLE_METADATA[name]);
}

/**
 * 🟢 解析裱框字符表
 *
 * 🔹 支持内置样式名、自定义字符表和空值默认样式。
 *
 * @param style - 内置样式名、自定义样式定义或空值。
 * @returns 归一化字符表；若使用内置样式则附带样式名。
 */
export function resolveBoxChars(style: BoxStyleName | BoxStyleDefinition | undefined): {
  chars: BoxChars;
  styleName?: BoxStyleName;
} {
  if (style === undefined) {
    return { chars: BOX_STYLES.single, styleName: 'single' };
  }

  if (isBoxStyleName(style)) {
    return { chars: BOX_STYLES[style], styleName: style };
  }

  const base = BOX_STYLES.single;
  return {
    chars: {
      ...base,
      ...style,
      horizontal: style.horizontal ?? style.top ?? base.horizontal,
      vertical: style.vertical ?? style.left ?? base.vertical
    }
  };
}

//#endregion
