/**
 * ============================================================================
 * 🟦 Core 轻量多语言入口
 * ============================================================================
 *
 * 🔶 模块职责
 * 提供无第三方依赖的消息模板渲染函数，供 Core 错误、CLI、Web、VSCode
 * 和后续 Electron 复用。
 * ============================================================================
 */

import { CORE_MESSAGES } from './locales';
import type { MessageKey, MessageParams, SupportedLocale } from './types';

//#region 🟦 常量

/** 默认语言。当前项目主要维护中文文档和中文提示。 */
export const DEFAULT_LOCALE: SupportedLocale = 'zh-CN';

/** 支持语言列表。 */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = ['zh-CN', 'en-US'];

//#endregion

//#region 🟦 工具函数

/** 判断输入是否为 Core 内置支持的语言。 */
export function isSupportedLocale(locale: string | undefined | null): locale is SupportedLocale {
  return locale === 'zh-CN' || locale === 'en-US';
}

/** 标准化语言，未知语言回退到默认语言。 */
export function normalizeLocale(locale: string | undefined | null): SupportedLocale {
  return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
}

/** 渲染 Core 消息模板。 */
export function t(
  key: MessageKey,
  params: MessageParams = {},
  locale: string | undefined | null = DEFAULT_LOCALE
): string {
  const safeLocale = normalizeLocale(locale);
  const template = CORE_MESSAGES[safeLocale][key] ?? CORE_MESSAGES[DEFAULT_LOCALE][key] ?? key;
  return formatMessage(template, params);
}

/** 用 `${name}` 形式替换模板变量。 */
export function formatMessage(template: string, params: MessageParams = {}): string {
  return template.replace(/\$\{([^}]+)\}/g, (_match, name: string) => {
    const value = params[name.trim()];
    return value === undefined || value === null ? '' : String(value);
  });
}

//#endregion

export type {
  MessageKey,
  MessageParams,
  SupportedLocale
} from './types';
