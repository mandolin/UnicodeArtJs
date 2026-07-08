import * as vscode from 'vscode';
import type { ExtensionArtConfig } from './types';

const RECENT_CONFIG_KEY = 'unicodeArtJs.recentConfig';
const DEFAULT_TEMPLATE_KEY = 'unicodeArtJs.defaultTemplate';
const TEMPLATE_SLOT_KEY_PREFIX = 'unicodeArtJs.templateSlot.';
export const TEMPLATE_SLOT_COUNT = 3;

export interface TemplateSlotSummary {
  slot: number;
  label: string;
  configured: boolean;
  preset?: string;
}

export function loadRecentConfig(context: vscode.ExtensionContext): ExtensionArtConfig | undefined {
  return context.globalState.get<ExtensionArtConfig>(RECENT_CONFIG_KEY);
}

export function loadDefaultTemplate(context: vscode.ExtensionContext): ExtensionArtConfig | undefined {
  return context.globalState.get<ExtensionArtConfig>(DEFAULT_TEMPLATE_KEY);
}

export function loadTemplateSlot(
  context: vscode.ExtensionContext,
  slot: number
): ExtensionArtConfig | undefined {
  return context.globalState.get<ExtensionArtConfig>(getTemplateSlotKey(slot));
}

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

export async function saveRecentConfig(
  context: vscode.ExtensionContext,
  config: ExtensionArtConfig
): Promise<void> {
  await context.globalState.update(RECENT_CONFIG_KEY, sanitizeConfig(config));
}

export async function saveDefaultTemplate(
  context: vscode.ExtensionContext,
  config: ExtensionArtConfig
): Promise<void> {
  await context.globalState.update(DEFAULT_TEMPLATE_KEY, sanitizeConfig({ ...config, preset: 'default' }));
}

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
