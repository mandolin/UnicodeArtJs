import * as vscode from 'vscode';
import type { ExtensionArtConfig } from './types';

const RECENT_CONFIG_KEY = 'unicodeArtJs.recentConfig';
const DEFAULT_TEMPLATE_KEY = 'unicodeArtJs.defaultTemplate';
const TEMPLATE_SLOT_KEY_PREFIX = 'unicodeArtJs.templateSlot.';
export const TEMPLATE_SLOT_COUNT = 3;

/**
 * 🟢 模板槽摘要
 *
 * 🔹 用于 Converter WebView 初始化和模板下拉展示，不包含完整配置内容。
 */
export interface TemplateSlotSummary {
  /** 模板槽编号。 */
  slot: number;
  /** 展示标签。 */
  label: string;
  /** 是否已经保存过配置。 */
  configured: boolean;
  /** 保存配置中的 preset 标识。 */
  preset?: string;
}

/**
 * 🟢 读取最近一次 Converter 配置
 */
export function loadRecentConfig(context: vscode.ExtensionContext): ExtensionArtConfig | undefined {
  return context.globalState.get<ExtensionArtConfig>(RECENT_CONFIG_KEY);
}

/**
 * 🟢 读取默认模板配置
 */
export function loadDefaultTemplate(context: vscode.ExtensionContext): ExtensionArtConfig | undefined {
  return context.globalState.get<ExtensionArtConfig>(DEFAULT_TEMPLATE_KEY);
}

/**
 * 🟢 读取指定模板槽配置
 *
 * @param context - VS Code 扩展上下文。
 * @param slot - 模板槽编号，当前为 1 到 3。
 */
export function loadTemplateSlot(
  context: vscode.ExtensionContext,
  slot: number
): ExtensionArtConfig | undefined {
  return context.globalState.get<ExtensionArtConfig>(getTemplateSlotKey(slot));
}

/**
 * 🟢 获取模板槽摘要列表
 */
export function getTemplateSlotSummaries(context: vscode.ExtensionContext): TemplateSlotSummary[] {
  return Array.from({ length: TEMPLATE_SLOT_COUNT }, (_, index) => {
    const slot = index + 1;
    const config = loadTemplateSlot(context, slot);
    return {
      slot,
      label: `Template ${slot}`,
      configured: Boolean(config),
      preset: config?.preset,
    };
  });
}

/**
 * 🟢 保存最近一次 Converter 配置
 */
export async function saveRecentConfig(
  context: vscode.ExtensionContext,
  config: ExtensionArtConfig
): Promise<void> {
  await context.globalState.update(RECENT_CONFIG_KEY, sanitizeConfig(config));
}

/**
 * 🟢 保存默认模板
 */
export async function saveDefaultTemplate(
  context: vscode.ExtensionContext,
  config: ExtensionArtConfig
): Promise<void> {
  await context.globalState.update(DEFAULT_TEMPLATE_KEY, sanitizeConfig({ ...config, preset: 'default' }));
}

/**
 * 🟢 保存指定模板槽
 *
 * @param context - VS Code 扩展上下文。
 * @param slot - 模板槽编号，当前为 1 到 3。
 * @param config - 待保存配置。
 */
export async function saveTemplateSlot(
  context: vscode.ExtensionContext,
  slot: number,
  config: ExtensionArtConfig
): Promise<void> {
  validateTemplateSlot(slot);
  await context.globalState.update(
    getTemplateSlotKey(slot),
    sanitizeConfig({ ...config, preset: config.preset || `template-${slot}` })
  );
}

function getTemplateSlotKey(slot: number): string {
  validateTemplateSlot(slot);
  return `${TEMPLATE_SLOT_KEY_PREFIX}${slot}`;
}

function validateTemplateSlot(slot: number): void {
  if (!Number.isInteger(slot) || slot < 1 || slot > TEMPLATE_SLOT_COUNT) {
    throw new Error(`Unsupported UnicodeArtJs template slot: ${slot}`);
  }
}

function sanitizeConfig(config: ExtensionArtConfig): ExtensionArtConfig {
  const visualFont = config.visualFont || config.font || 'Noto Sans SC';
  return {
    ...config,
    width: typeof config.width === 'number' ? config.width : undefined,
    customChars: config.customChars ?? '',
    visualFont,
    font: visualFont,
    glyphFont: config.glyphFont || "'Sarasa Mono SC', 'LXGW WenKai Mono', 'Source Code Pro', 'Liberation Mono', monospace",
    glyphWidthProfile: config.glyphWidthProfile || 'default',
    wideCharRegex: config.wideCharRegex || '',
    outputTarget: 'vscode',
    preset: config.preset || 'default',
  };
}
