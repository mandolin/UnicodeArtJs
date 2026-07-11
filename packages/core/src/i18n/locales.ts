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
    'input.text.required': '文本不能为空',
    'input.imagePath.required': '图像路径不能为空',
    'input.imageData.object': 'imageData必须是对象',
    'input.imageData.widthPositive': 'imageData.width必须是正整数',
    'input.imageData.heightPositive': 'imageData.height必须是正整数',
    'input.imageData.uint8Array': 'imageData.data必须是Uint8Array',
    'input.imageData.lengthMismatch': 'imageData.data长度不匹配: 期望${expected}，实际${actual}',
    'input.charDataMap.nonEmpty': 'options.charDataMap必须是非空Map',
    'config.height.positive': 'height必须大于0',
    'config.width.positive': 'width必须大于0',
    'config.dimension.required': '必须指定height或width至少一个',
    'config.matrixSize.range': 'matrixSize必须在2-20之间',
    'config.ratio.range': 'ratio必须在1.0-3.0之间',
    'config.wideCharRatio.range': 'wideCharRatio必须在0-10之间',
    'config.box.invalid': 'box配置无效: ${message}',
    'charset.unsupported': '不支持的字符集类型: ${type}',
    'browser.conversionAborted': '浏览器转换已取消',
    'browser.inputPixels.limit': '浏览器输入图像过大: ${inputPixels} 像素超过限制 ${maxInputPixels}',
    'browser.outputCells.limit': '浏览器输出过大: ${outputCells} 个字素单元超过限制 ${maxOutputCells}',
    'error.processingFailed': '处理失败: ${message}',
    'error.textToArtFailed': '文本转字符画失败: ${message}',
    'error.imageToArtFailed': '图片转字符画失败: ${message}',
    'error.coreImageDataFailed': 'Core imageData转换失败: ${message}'
  },
  'en-US': {
    'input.text.required': 'text must not be empty',
    'input.imagePath.required': 'image path must not be empty',
    'input.imageData.object': 'imageData must be an object',
    'input.imageData.widthPositive': 'imageData.width must be a positive integer',
    'input.imageData.heightPositive': 'imageData.height must be a positive integer',
    'input.imageData.uint8Array': 'imageData.data must be a Uint8Array',
    'input.imageData.lengthMismatch': 'imageData.data length mismatch: expected ${expected}, got ${actual}',
    'input.charDataMap.nonEmpty': 'options.charDataMap must be a non-empty Map',
    'config.height.positive': 'height must be greater than 0',
    'config.width.positive': 'width must be greater than 0',
    'config.dimension.required': 'height or width must be specified',
    'config.matrixSize.range': 'matrixSize must be between 2 and 20',
    'config.ratio.range': 'ratio must be between 1.0 and 3.0',
    'config.wideCharRatio.range': 'wideCharRatio must be greater than 0 and no more than 10',
    'config.box.invalid': 'box config is invalid: ${message}',
    'charset.unsupported': 'Unsupported charset type: ${type}',
    'browser.conversionAborted': 'Browser conversion aborted',
    'browser.inputPixels.limit': 'Browser input image is too large: ${inputPixels} pixels exceeds limit ${maxInputPixels}',
    'browser.outputCells.limit': 'Browser output is too large: ${outputCells} cells exceeds limit ${maxOutputCells}',
    'error.processingFailed': 'Processing failed: ${message}',
    'error.textToArtFailed': 'Text to art conversion failed: ${message}',
    'error.imageToArtFailed': 'Image to art conversion failed: ${message}',
    'error.coreImageDataFailed': 'Core imageData conversion failed: ${message}'
  }
};

//#endregion
