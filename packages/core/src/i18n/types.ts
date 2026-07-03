/**
 * ============================================================================
 * 🟦 Core 多语言类型定义
 * ============================================================================
 *
 * 🔶 模块职责
 * 为 Core 错误消息和后续 UI 提示提供统一的 locale、message key 和参数类型。
 * 当前先支持 zh-CN / en-US，后续可在不破坏 API 的前提下继续扩展。
 * ============================================================================
 */

//#region 🟦 类型定义

/** Core 当前内置支持的语言。 */
export type SupportedLocale = 'zh-CN' | 'en-US';

/** 消息模板变量。 */
export type MessageParams = Record<string, string | number | boolean | null | undefined>;

/**
 * Core 消息 key。
 *
 * 说明:
 * - `config.*` 先覆盖高频公开配置错误。
 * - `charset.*` 覆盖字符集相关公开错误。
 * - `error.*` 作为通用包装消息，供 CLI / Web / VSCode 复用。
 */
export type MessageKey =
  | 'config.height.positive'
  | 'config.width.positive'
  | 'config.dimension.required'
  | 'config.matrixSize.range'
  | 'config.ratio.range'
  | 'config.wideCharRatio.range'
  | 'config.box.invalid'
  | 'charset.unsupported'
  | 'error.processingFailed'
  | 'error.textToArtFailed'
  | 'error.imageToArtFailed';

//#endregion
