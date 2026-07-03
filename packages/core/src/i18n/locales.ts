/**
 * ============================================================================
 * 🟦 Core 内置语言包
 * ============================================================================
 *
 * 🔶 模块职责
 * 维护 Core 层错误和提示消息模板。这里使用 TS 对象而不是 JSON，便于
 * Rollup / browser entry 直接 tree-shake 和生成类型声明。
 * ============================================================================
 */

import type { MessageKey, SupportedLocale } from './types';

//#region 🟦 语言包定义

/** Core 内置消息模板。 */
export const CORE_MESSAGES: Record<SupportedLocale, Record<MessageKey, string>> = {
  'zh-CN': {
    'config.height.positive': 'height必须大于0',
    'config.width.positive': 'width必须大于0',
    'config.dimension.required': '必须指定height或width至少一个',
    'config.matrixSize.range': 'matrixSize必须在2-20之间',
    'config.ratio.range': 'ratio必须在1.0-3.0之间',
    'config.wideCharRatio.range': 'wideCharRatio必须在0-10之间',
    'config.box.invalid': 'box配置无效: ${message}',
    'charset.unsupported': '不支持的字符集类型: ${type}',
    'error.processingFailed': '处理失败: ${message}',
    'error.textToArtFailed': '文本转字符画失败: ${message}',
    'error.imageToArtFailed': '图片转字符画失败: ${message}'
  },
  'en-US': {
    'config.height.positive': 'height must be greater than 0',
    'config.width.positive': 'width must be greater than 0',
    'config.dimension.required': 'height or width must be specified',
    'config.matrixSize.range': 'matrixSize must be between 2 and 20',
    'config.ratio.range': 'ratio must be between 1.0 and 3.0',
    'config.wideCharRatio.range': 'wideCharRatio must be greater than 0 and no more than 10',
    'config.box.invalid': 'box config is invalid: ${message}',
    'charset.unsupported': 'Unsupported charset type: ${type}',
    'error.processingFailed': 'Processing failed: ${message}',
    'error.textToArtFailed': 'Text to art conversion failed: ${message}',
    'error.imageToArtFailed': 'Image to art conversion failed: ${message}'
  }
};

//#endregion
